const cluster = require('cluster');
const fs = require('fs');
const { parseArgs } = require('./cli');
const {
  error,
  info,
  debug,
} = require('./utils/log');
const { padLeft } = require('./utils/text');

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
    let startTimeSec;
    let timeSec = (new Date()).getTime() / 1000.0;
    let prevRecCount = 0;
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
          `${padLeft(records, 8, ' ')} recs`,
          `${padLeft(bytes, 12, ' ')} bytes`,
          `${padLeft(elapsedSec.toFixed(1), 8, ' ')} secs ET`,
          `${padLeft(((records - prevRecCount) / (timeSec - startTimeSec)).toFixed(1), 8, ' ')} rec/sec`,
        ].join('\t')}\n`);
        prevRecCount = records;
      },
    );
    // const resultStr = JSON.stringify(statsResult, null, 2);
    // const resultStr = JSON.stringify(statsResult, null, 2);
    // JSON.stringify(statsResult, null, 2);
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
