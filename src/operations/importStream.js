const { kMaxLength } = require('buffer');
const fs = require('fs');

const omit = require('lodash.omit');

const { formats } = require('../formats');

const {
  error,
  warn,
} = require('../utils/log');

const {
  lengthInBytes,
  escapeUnprintable,

} = require('../utils/text');

const { isEmpty } = require('../utils/types');
const { mergeObjectsReducer } = require('../utils/objects');

const {
  DEFAULT_JOBS,
  DEFAULT_MEDIA_TYPE,
  MAX_POOL_PER_WORKER_SIZE_BYTES,
} = require('../constants');

const { statChunk } = require('../statCounter');

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

const importStream = (rs, config, onProgress) => (
  new Promise(
    // eslint-disable-next-line no-async-promise-executor
    async (resolve, reject) => {
      try {
        const maxPoolSize = MAX_POOL_PER_WORKER_SIZE_BYTES * (config.jobs || DEFAULT_JOBS);
        const bytesEstimated = config.bytesEstimated || (
          fs.existsSync(rs.path) ? fs.statSync(rs.path).size : null
        );

        const stats = [];
        let isProcessingCompleted = false;

        let pool = [];
        let bytesCompleted = 0;

        let poolLen = 0;
        let documentsCompleted = 0;

        // eslint-disable-next-line no-unused-vars
        let batchSizeBytes = 0;
        // eslint-disable-next-line no-unused-vars
        let batchSizeDocuments = 0;
        let header = null;
        const mediaType = config.mediaType || config.media_type || DEFAULT_MEDIA_TYPE;
        const format = formats[mediaType];

        if (!format) {
          warn(`Format not found for media-type: ${mediaType}`);
        }
        const encoding = (format && format.encoding) || config.encoding;
        const onCompleteChunk = async (chunk, isLast = false) => {
          let recordBuffers;
          let tailBuffer;
          if ((!isEmpty(format.endHeaderMarker)) && (!header)) {
            const [wrappedHeaderBuffer, headlessChunk] = chunkBuffer(
              chunk,
              format.startHeaderMarker,
              format.endHeaderMarker,
              encoding,
              1,
            );
            if (wrappedHeaderBuffer.length === 1) {
              header = (typeof format.processHeader === 'function')
                ? await format.processHeader(wrappedHeaderBuffer[0], config)
                : wrappedHeaderBuffer[0];
              warn(`[LRO:WORKER:${process.pid}:importStream] Detected TSV header (${lengthInBytes(wrappedHeaderBuffer[0])} bytes, EndOfHeader symbol: "${escapeUnprintable(format.endHeaderMarker)}", decoded string: [ ${header.join(' | ')} ]`);
            } else {
              warn(`[LRO:WORKER:${process.pid}:importStream] WARNING: Unexpected header buffers count: ${wrappedHeaderBuffer.length}. No header will be used.`);
            }
            chunk = headlessChunk;
          }

          // Chunk is outside possible header
          let chunkingResult;
          if ((!format.startMarker) && (!format.endMarker) && isLast) {
            chunkingResult = [[chunk], Buffer.from([])];
          } else {
            chunkingResult = chunkBuffer(
              chunk,
              format.startMarker,
              format.endMarker,
              encoding,
              config.limit,
            );
          }

          // eslint-disable-next-line prefer-const
          recordBuffers = chunkingResult[0];
          // eslint-disable-next-line prefer-const
          tailBuffer = chunkingResult[1];

          batchSizeDocuments = recordBuffers.length;
          documentsCompleted += recordBuffers.length;
          let result = [];
          // if (recordBuffers.length > 0) {
          try {
            result = await statChunk(recordBuffers);
          } catch (e) {
            error('ERROR:', e);
          }
          error('result', result);
          // }
          const batchExecutionReport = {
            bytes_completed: bytesCompleted,
            bytes_estimated: bytesEstimated,
            documents_completed: documentsCompleted,
            ...((result || []).reduce(
              (a, o) => mergeObjectsReducer(a, o),
              {},
            )),
          };
          if (typeof (onProgress) === 'function') {
            await onProgress(batchExecutionReport);
          }
          stats.push(batchExecutionReport);

          // Finalize
          batchSizeBytes = 0;
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
              resolve(omit(
                stats.reduce((a, o) => mergeObjectsReducer(a, o, false), {}),
                ['bytes_completed', 'bytes_estimated', 'documents_estimated', 'documents_completed'],
              ));
              // await refreshDbStats();
            }
          } catch (e) {
            if (typeof onProgress === 'function') {
              onProgress();
            }
            // await refreshDbStats();
            error('ERROR: Parallel execution fail:', e);
            reject(e);
          }
        };

        const onData = async (data) => {
          rs.pause();
          bytesCompleted += data.byteLength;
          batchSizeBytes += data.byteLength;
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
          if ((config.limit && (config.limit > 0)) && (documentsCompleted >= config.limit)) {
            onEnd().then(() => rs.end());
          } else {
            rs.resume();
          }
        };

        rs.on('error', (err) => {
          error(err);
          reject(err);
        });
        const fileSize = rs.path ? fs.statSync(rs.path).size : null;
        if (
          (!format) || (
            (
              !(
                format.endHeaderMarker
                || format.startHeaderMarker
                || format.startMarker
                || format.endMarker
              )
            ) && (
              typeof fileSize === 'number'
            ) && (
              fileSize < kMaxLength
            )
          )
        ) {
          config.sync = true;
          rs.on('data', (data) => pool.push(data));
        } else {
          rs.on('data', onData);
        }
        rs.on('end', onEnd);
      } catch (e) {
        if (rs) {
          try {
            rs.end();
          } catch (err) {
            warn('WARN: Can\'t close read stream properly', err);
          }
        }
        // await refreshDbStats();
        reject(e);
      }
    },
  )
);

module.exports = {
  importStream,
};
