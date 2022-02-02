const formats = require('./formats');

const {
  error,
  warn,
} = require('./utils/log');

const {
  lengthInBytes,
  escapeUnprintable,
} = require('./utils/text');

const { isEmpty } = require('./utils/types');
const { flattenDeep } = require('./utils/arrays');
const { executeParallel } = require('./utils/workers');

const chunkBuffer = (chunk, startMarker, endMarker, encoding, limit) => {
  let chunkOffset = 0;
  const dataRecords = [];
  if ((!startMarker) && (!endMarker)) {
    return [[], chunk];
  }
  while (chunkOffset !== -1) {
    if (limit && (dataRecords.length >= limit)) {
      break;
    }
    // Buffer indexOf may accept string pattern with appropriate encoding clue.
    // Official source: https://nodejs.org/api/buffer.html#buffer_buf_indexof_value_byteoffset_encoding
    const haveStartMarker = (Buffer.isBuffer(startMarker) || (typeof startMarker === 'string') || (typeof startMarker === 'number'));
    const haveEndMarker = (Buffer.isBuffer(endMarker) || (typeof endMarker === 'string') || (typeof endMarker === 'number'));
    let startId;
    let endId;

    if (haveStartMarker) {
      startId = chunk.indexOf(startMarker, chunkOffset, encoding);
    } else {
      startId = chunkOffset;
    }

    if (haveEndMarker) {
      endId = chunk.indexOf(endMarker, startId, encoding);
      if (endId > startId) {
        endId += endMarker.length;
      } else {
        endId = undefined;
      }
    } else if (haveStartMarker) {
      const nextStartId = chunk.indexOf(startMarker, startId, encoding);
      if (nextStartId !== -1) {
        endId = nextStartId - startMarker.length;
      } else {
        endId = chunk.length;
      }
    }
    if (endId && (endId > startId)) {
      dataRecords.push(chunk.slice(startId, endId));
      chunkOffset = endId;
    } else {
      // Unclosed record going to tail
      chunkOffset = startId;
      break;
    }
  }
  return [dataRecords, chunk.slice(chunkOffset)];
};

/**
 *
 * @param rs
 * @param {Object} config
 * @param {string} config.inputMediaType
 * @param {string} config.outputMediaType
 * @param {string} config.jobs - parallel
 * @param {string} config.batchSize - worker input batch size in bytes
 * @param {string} config.encoding - input encoding
 * @param {string} config.startHeaderMarker - start header marker
 * @param {string} config.endHeaderMarker - end header marker
 * @param {string} config.header - add header to output
 * @param {?function} config.processHeader - process header function
 * @param {function} onProgress
 * @param {function} onError
 * @returns {Promise<Object>}
 */
const convertStream = (rs, config, onProgress, onError) => (
  new Promise(
    // eslint-disable-next-line no-async-promise-executor
    async (resolve, reject) => {
      // const statCounter = new StatCounter();
      const startTsSec = (new Date()).getTime() / 1000.0;
      let batchStartTsSec = startTsSec;
      try {
        const mediaType = config.inputMediaType;
        const format = formats[mediaType];
        if (!format) {
          reject(new Error(`Format not found for media-type: ${mediaType}`));
        }
        const maxPoolSize = config.batchSize * config.jobs;

        let bytesCompleted = 0;
        let isProcessingCompleted = false;

        let pool = [];

        let poolLen = 0;
        let recordsCompleted = 0;

        // eslint-disable-next-line no-unused-vars
        // eslint-disable-next-line no-unused-vars

        let header = null;
        const encoding = (format && format.encoding) || config.encoding;

        const onCompleteChunk = async (chunk, isLast = false) => {
          let recordBuffers;
          let tailBuffer;
          if ((!isEmpty(format.serial[mediaType].endHeaderMarker)) && (!header)) {
            const [wrappedHeaderBuffer, headlessChunk] = chunkBuffer(
              chunk,
              format.serial[mediaType].startHeaderMarker,
              format.serial[mediaType].endHeaderMarker,
              encoding,
              1,
            );
            if (wrappedHeaderBuffer.length === 1) {
              header = (typeof format.serial[mediaType].processHeader === 'function')
                ? await format.serial[mediaType].processHeader(wrappedHeaderBuffer[0], config)
                : wrappedHeaderBuffer[0];
              warn(`Detected TSV header (${lengthInBytes(wrappedHeaderBuffer[0])} bytes, EndOfHeader symbol: "${escapeUnprintable(format.serial[mediaType].endHeaderMarker)}", decoded string: [ ${header.join(' | ')} ]`);
            } else {
              warn(`WARNING: Unexpected header buffers count: ${wrappedHeaderBuffer.length}. No header will be used.`);
            }
            chunk = headlessChunk;
          }

          // Chunk is outside possible header
          let chunkingResult;
          if ((
            !format.serial[mediaType].startMarker
          ) && (
            !format.serial[mediaType].endMarker
          ) && isLast) {
            chunkingResult = [[chunk], Buffer.from([])];
          } else {
            chunkingResult = chunkBuffer(
              chunk,
              format.serial[mediaType].startMarker,
              format.serial[mediaType].endMarker,
              encoding,
              config.limit,
            );
          }

          // eslint-disable-next-line prefer-const
          recordBuffers = chunkingResult[0];
          // eslint-disable-next-line prefer-const
          tailBuffer = chunkingResult[1];

          const result = flattenDeep(
            (await executeParallel('convertChunk', recordBuffers, {
              inputMediaType: config.inputMediaType,
              outputMediaType: config.outputMediaType,
              header: config.header,
            })).map(
              (txtOutput, idx) => ((recordsCompleted === 0) && (idx === 0)
                ? txtOutput
                : txtOutput.substr(txtOutput.indexOf('\n') + 1)),
            ),
          ).join('');

          recordsCompleted += recordBuffers.length;
          const bytes = recordBuffers.reduce((a, o) => a + o.length, 0);
          bytesCompleted += bytes;
          const batchEndTsSec = ((new Date()).getTime() / 1000.0);

          // startTsSec = endTsSec;
          if ((typeof (onProgress) === 'function') && (recordBuffers.length > 0)) {
            await onProgress({
              records: recordBuffers.length,
              recordsCompleted,
              bytes,
              bytesCompleted,
              elapsedSec: batchEndTsSec - startTsSec,
              sec: batchEndTsSec - batchStartTsSec,
              data: result,
            });
          }
          batchStartTsSec = batchEndTsSec;

          // Finalize
          return tailBuffer;
        };
        const onEnd = async () => {
          try {
            // Final chunk
            const mergedChunks = Buffer.concat(pool);
            if (mergedChunks.length > 0) {
              // No tail
              await onCompleteChunk(mergedChunks, true);
            }
            if (!isProcessingCompleted) {
              isProcessingCompleted = true;
              // resolve(statCounter);
            }
          } catch (e) {
            if (typeof onError === 'function') {
              onError(e);
              error(`${e.message}\n${e.stack}\n`);
            }
            error('ERROR: Parallel execution fail:', e);
          }
          resolve();
        };
        const onData = async (data) => {
          rs.pause();
          // bytesCompleted += data.byteLength;
          poolLen += data.byteLength;
          pool.push(data);
          if (poolLen >= maxPoolSize) {
            let tail = null;
            const mergedChunks = Buffer.concat(pool);
            if (mergedChunks.length > 0) {
              tail = await onCompleteChunk(mergedChunks);
            }
            if (tail) {
              pool = [tail];
              poolLen = tail.byteLength;
            } else {
              pool = [];
              poolLen = 0;
            }
          }
          if ((config.limit && (config.limit > 0)) && (recordsCompleted >= config.limit)) {
            await onEnd();
            // .then(() => rs.end());
          } else {
            rs.resume();
          }
        };

        rs.on('error', (err) => {
          error(err);
          reject(err);
        });
        rs.on('data', onData);
        rs.on('end', onEnd);
      } catch (err) {
        error('ERROR:', err);
        if (rs) {
          try {
            rs.end();
          } catch (finErr) {
            error('ERROR: Can\'t close read stream properly:', finErr);
          }
        }
        reject(err);
      }
    },
  )
);

module.exports = {
  convertStream,
};
