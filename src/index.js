const cluster = require('cluster');
const fs = require('fs');
const { parseArgs } = require('./cli');
const {
  padLeft,
  prettyBytes,
} = require('./utils/text');
const {
  error,
  info,
  debug,
} = require('./utils/log');
const { importStream } = require('./operations/importStream');

const run = async (config) => {
  /**
   * Main entrypoint
   */
  // && (require.main === module)

  info(`Running SEED Processing in ${config.command} mode`);
  debug(`Using following configuration:\n${JSON.stringify(config, null, 2)}`);
  if (config.command === 'stats') {
    let inputStream = process.stdin;
    if (config.input && (config.input !== '-')) {
      inputStream = fs.createReadStream(config.input);
    }
    let bytesTotal = null;
    if (inputStream.path) {
      bytesTotal = fs.statSync(inputStream.path).size;
    }
    let startTimeSec;
    let timeSec = (new Date()).getTime() / 1000.0;
    let prevRecCount = 0;
    let prevBytesCount = 0;
    const resultingStatsCounter = await importStream(
      inputStream,
      config,
      ({
        records,
        bytes,
        elapsedSec,
      }) => {
        startTimeSec = timeSec;
        timeSec = (new Date()).getTime() / 1000.0;

        process.stderr.write(`${[
          ...(bytesTotal ? [
            padLeft(`${((bytes / bytesTotal) * 100).toFixed(2)}%`, 7),
            padLeft(`${prettyBytes((bytes - prevBytesCount) / (timeSec - startTimeSec))}/sec`, 16),
            `${padLeft(bytes, Math.log10(bytesTotal))} / ${bytesTotal} bytes`,
          ] : [
            padLeft(`${bytes} bytes`, 16, ' '),
          ]),
          `${padLeft(records, 8, ' ')} recs`,
          `${elapsedSec.toFixed()} : ${(elapsedSec / (bytes / bytesTotal)).toFixed()}  sec`,
          `${padLeft(((records - prevRecCount) / (timeSec - startTimeSec)).toFixed(1), 8, ' ')} rec/sec`,
        ].join('\t')}\n`);
        prevRecCount = records;
        prevBytesCount = bytes;
      },
    );
    const resultStr = resultingStatsCounter.toTSV();

    if (config.output && (config.output !== '-')) {
      fs.writeFileSync(config.output, resultStr, 'utf-8');
    } else {
      process.stdout.write(resultStr);
    }
  }
  return Promise.resolve();
};

if (cluster.isMaster && (require.main === module)) {
  const config = parseArgs(process.argv.slice(2));
  // info(JSON.stringify(config, null, 2))
  run(config).catch(
    (e) => {
      error(e);
      process.exit(1);
    },
  ).then(
    () => {
      process.exit(0);
    },
  );
}

module.exports = {
  run,
};
