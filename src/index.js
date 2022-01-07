const cluster = require('cluster');
const fs = require('fs');
const { parseArgs } = require('./cli');
const { error, info } = require('./utils/log');
const { importStream } = require('./operations/importStream');

const run = (config) => {
  /**
   * Main entrypoint
   */
  // && (require.main === module)

  info('Running processing luster');
  if (config.command === 'stats') {
    info('Running stats');
    let inputStream = process.stdin;
    if (config.path && (config.path !== '-')) {
      inputStream = fs.createReadStream(config.path);
    }
    importStream(inputStream, config).catch(
      (e) => {
        error(e);
        process.exit(1);
      },
    ).then(
      () => {
        process.exit(0);
      },
    );
  } else {
    throw Error(`Invalid command: ${config.command}`);
  }
};

if (cluster.isMaster && (require.main === module)) {
  const config = parseArgs(process.argv.slice(2));
  run(config);
}

module.exports = {
  run,
};
