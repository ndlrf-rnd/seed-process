const argparse = require('argparse');
const { DEFAULT_JOBS, VERSION } = require('./constants');

const parseArgs = (args) => {
  const parser = new argparse.ArgumentParser({
    // version: VERSION,
    description: 'Process bibliographic records',
  });

  parser.add_argument('-v', '--version', {
    action: 'version',
    version: VERSION,
  });

  parser.add_argument(
    '-j',
    '--jobs',
    {
      help: 'Parallel jobs',
      type: 'int',
      default: DEFAULT_JOBS,
    },
  );

  const subParsers = parser.add_subparsers({
    title: 'Command',
    dest: 'command',
  });

  const statsParser = subParsers.add_parser(
    'stats',
    {
      help: 'Generate record fields stat report',
    },
  );
  statsParser.add_argument('path', {
    help: 'Input file path',
  });

  statsParser.add_argument(
    '-e',
    '--encoding',
    {
      help: 'Input encoding',
      type: 'str',
      default: 'utf-8',
    },
  );

  statsParser.add_argument(
    '-t',
    '--media-type',
    {
      help: 'Media type',
      type: 'str',
      default: 'application/marc',
    },
  );

  return parser.parse_args(args);
};

module.exports = {
  parseArgs,
};
