const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const cluster = require('cluster');
const stream = require('stream');
const { parseArgs } = require('./cli');
const {
  padLeft,
  prettyBytes,
  humanizeSeconds,
} = require('./utils/text');
const {
  error,
  info,
  debug,
  warn,
} = require('./utils/log');

const { convertStream } = require('./convertStream');
const {
  executeParallel,
  initWorker,
} = require('./utils/workers');
const { cpMap } = require('./utils/promise');
const { flattenDeep } = require('./utils/arrays');
const { fingerprint } = require('./operations/fingerprint');
const { convertChunk } = require('./operations/convertChunk');
const { describeFieldFile } = require('./operations/describeFieldFile');
const {
  TSV_MEDIA_TYPE,
  TSV_HEADER,
  FLUSH_THRESHOLD,
  FIELD_STAT_HEADER,
} = require('./constants');

const run = async (config) => new Promise((resolve, reject) => {
  /**
   * Main entrypoint
   */
  info(`Running SEED Processing in ${config.command} mode`);
  debug(`Using following configuration:\n${JSON.stringify(config, null, 2)}`);

  let inputStream = process.stdin;
  if (config.input instanceof stream.Readable) {
    inputStream = config.input;
  } else if (config.input && (config.input !== '-')) {
    inputStream = fs.createReadStream(config.input);
  }

  const inputSizeBytes = (config.input && (config.input !== '-')) ? fs.statSync(config.input).size : null;
  const dbPath = (typeof config.output === 'string') && (config.output !== '-')
    ? path.join(path.dirname(config.output), path.basename(config.output).split('.').slice(0, -1).join('.'))
    : path.join('.', `${Math.floor((new Date()).getTime())}`);

  if (fs.existsSync(dbPath)) {
    fs.rmdirSync(dbPath, {
      recursive: true,
      force: true,
    });
  }
  fs.mkdirSync(dbPath, { recursive: true });
  let recordsFlushed = 0;
  let recordsProcessed = 0;
  const fieldsBuffers = {};

  const flush = async (keyToFlush, flushThreshold = 0) => {
    const filePath = path.join(dbPath, `${keyToFlush}.tsv`);
    if (fieldsBuffers[keyToFlush].length > flushThreshold) {
      const isNewFile = !fs.existsSync(filePath);
      const dataStr = [
        ...(isNewFile ? [TSV_HEADER] : []),
        ...fieldsBuffers[keyToFlush],
      ].map(
        (f) => `${f}\n`,
      ).join('');
      await fsp.appendFile(
        filePath,
        dataStr,
      );
      recordsFlushed += fieldsBuffers[keyToFlush].length;
      fieldsBuffers[keyToFlush] = [];
    }
    return filePath;
  };
  const onProgressFn = ({
    records,
    recordsCompleted,
    bytes,
    bytesCompleted,
    elapsedSec,
    sec,
    data, // eslint-disable-next-line no-async-promise-executor
  }) => new Promise(
    // eslint-disable-next-line no-async-promise-executor
    async (onProgressResolve) => {
      if (config.command === 'describe') {
        const dataRows = data.split('\n').filter(
          (rowStr) => rowStr.trim().length > 0,
        ).sort();
        let key = null;
        const pq = [];
        for (let i = 0; i < dataRows.length; i += 1) {
          const row = dataRows[i];
          const rowValues = row.split('\t');
          const newKey = rowValues.slice(0, -2).map((v) => v || '_').join('_');
          if ((newKey !== key) && (key !== null)) {
            pq.push(flush(key, FLUSH_THRESHOLD));
          }
          key = newKey;
          if (typeof fieldsBuffers[key] === 'undefined') {
            fieldsBuffers[key] = [];
          }
          fieldsBuffers[key].push(rowValues.slice(-2).join('\t'));
          recordsProcessed += 1;
          if (i === dataRows.length - 1) {
            pq.push(flush(key, FLUSH_THRESHOLD));
          }
        }
        await Promise.all(pq);
      } else if (config.command === 'convert') {
        config.output.write(data);
      }

      // eslint-disable-next-line no-nested-ternary
      const completion = config.limit
        ? (recordsCompleted / config.limit)
        : (inputSizeBytes ? bytesCompleted / inputSizeBytes : null);
      process.stderr.write(`${[
        completion ? padLeft(`${(completion * 100).toFixed(2)}%`, 7) : '...',
        (inputSizeBytes
          ? `${padLeft(prettyBytes(bytesCompleted), 16)} / ${prettyBytes(inputSizeBytes)}`
          : padLeft(`${bytesCompleted} bytes`, 16, ' ')),
        `${padLeft(`+${records}`, 8, ' ')} recs`,
        `${padLeft((records / sec).toFixed(0), ' ', '5')} recs/sec`,
        `${padLeft(humanizeSeconds(elapsedSec), 5)} sec`,
        `${padLeft(Object.keys(fieldsBuffers).length, 6)} fields discovered`,
        `${padLeft(recordsProcessed - recordsFlushed, 6, ' ')} recs still in buffer`,
        padLeft(`${prettyBytes(bytes / sec)}/sec`, 16),
        `${prettyBytes(process.memoryUsage().heapUsed)} mem use`,
      ].join('\t')}\n`);
      onProgressResolve();
    },
  );

  const onErrorFn = (err) => {
    error(`Processing failed with ERROR: ${err}, exiting now`);
    reject();
  };
  if (config.output instanceof stream.Writable) {
    config.output = process.stdout;
  } else if (config.output && (config.output !== '-')) {
    config.output = fs.createWriteStream(config.output);
  }
  config.output = config.output || process.stdout;
  if (config.command === 'describe') {
    config.outputMediaType = TSV_MEDIA_TYPE;
    config.header = false;
  }
  convertStream(
    inputStream,
    config,
    onProgressFn,
    onErrorFn,
  ).catch(
    onErrorFn,
  ).then(
    async () => {
      const fieldDataFilePaths = await cpMap(
        Object.keys(fieldsBuffers),
        (key, idx) => {
          info(`Aggregating [${idx}/${Object.keys(fieldsBuffers).length}] ${key}`);
          return flush(key, 0);
        },
      );

      const fieldStats = await executeParallel('describeFieldFile', fieldDataFilePaths, config);
      await fieldStats.forEach(
        ({
          input,
          output,
        }) => {
          try {
            fs.renameSync(output, input);
          } catch (e) {
            warn(e);
          }
        },
      );
      const outputTsvData = [
        flattenDeep([
          ...FIELD_STAT_HEADER,
          ...(' '.repeat(config.numSamples || 50).split(' ')).map(
            (_, idx) => [
              `sample_${padLeft(idx, 2, '0')}_value`,
              `sample_${padLeft(idx, 2, '0')}_count`,
            ],
          ),
        ]),
        ...fieldStats.map(
          (row) => flattenDeep([
            ...FIELD_STAT_HEADER.map(
              (k) => row[k] || '',
            ),
            ...row.samples,
          ]),
        ),
      ].map(
        (row) => `${row.join('\t')}\n`,
      ).join('');
      config.output.write(
        outputTsvData,
        (err) => {
          if (err) {
            onErrorFn(err);
            process.exit(-1);
          } else {
            process.exit(0);
          }
        },
      );
    },
  );
});

const config = parseArgs(process.argv.slice(2));
initWorker({
  fingerprint,
  convertChunk,
  describeFieldFile,
}, config.jobs);

if (cluster.isMaster && (require.main === module)) {
  // info(JSON.stringify(config, null, 2))
  run(config).catch((e) => {
    error(e);
    process.exit(-1);
  }).then(() => {
    process.exit(0);
  });
}

module.exports = {
  run,
};
