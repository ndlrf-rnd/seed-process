const argparse = require('argparse');
const formats = require('./formats');
const {
  DEFAULT_JOBS,
  VERSION,
  DEFAULT_BATCH_SIZE,
} = require('./constants');

class NormalizeMediaTypeAndSave extends argparse.Action {
  call(parser, namespace, value /* option_string = undefined */) {
    namespace[this.dest] = value.replace(/^([^/]*\/)?/uig, 'application/');
  }
}

/**
 *
 * @param {String[]} args
 *
 * @returns {Object[{
 *   command: "stats"|"convert", // Operation to execute
 *   encoding: String [o], // Optional input encoding, will override default import format encoding,
 *
 *   from: String ['application/marc'], // Input serialization format media-type
 *   to: String ['application/marc'],   // Output serialization format media-type
 *   dialect: String [o]                // Optional out format dialect if format support one
 *
 *   jobs: Number [0],
 * }]}
 */
const parseArgs = (args) => {
  const formatChoices = Object.keys(formats).sort();
  const parser = new argparse.ArgumentParser({
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

  parser.add_argument(
    '-e',
    '--encoding',
    {
      help: 'Input encoding for formats that might be consumed as text stream',
      type: 'str',
    },
  );

  parser.add_argument(
    '-i',
    '--input',
    {
      help: 'Input path or URI, dont define this param or use - symbol for reading from stdin until stdin pipe is closed',
      type: 'str',
      default: '-',
    },
  );
  parser.add_argument(
    '-l',
    '--limit',
    {
      help: 'Limit maximum count of records to process',
      type: 'int',
    },
  );
  parser.add_argument(
    '-I',
    '--input-type',
    {
      help: 'Input format IANA (or domestic) Media type that may be followed by expected format dialect definition',
      type: 'str',
      choices: formatChoices,
      dest: 'inputMediaType',
      action: NormalizeMediaTypeAndSave,
    },
  );
  parser.add_argument(
    '-s',
    '-num-samples',
    {
      help: 'Num of field samples',
      type: 'int',
      dest: 'numSamples',
      default: 10,
    },
  );
  parser.add_argument(
    '-b',
    '-batch-size',
    {
      help: 'Worker input batch max size in bytes',
      type: 'int',
      dest: 'batchSize',
      default: DEFAULT_BATCH_SIZE,
    },
  );

  const subParsers = parser.add_subparsers({
    title: 'Command',
    description: 'Processing command',
    dest: 'command',
  });

  // Stats
  const describeSubParser = subParsers.add_parser(
    'describe',
    {
      help: 'Generate record fields stat report',
    },
  );

  describeSubParser.add_argument(
    '-o',
    '--output',
    {
      help: 'Output path, don\'t specify when using stdout as output or expecting automatic creation of output folder (e.g. in case of detailed stats or slicing)',
      type: 'str',
    },
  );

  // describeSubParser.add_argument(
  //   '-P',
  //   '--fingerprint',
  //   {
  //     help: 'Output fingerprint stats',
  //     action: 'store_true',
  //   },
  // );

  // Convert
  const convertSubParser = subParsers.add_parser(
    'convert',
    {
      help: 'Generate record fields stat report',
    },
  );

  convertSubParser.add_argument(
    '-o',
    '--output',
    {
      help: 'Output path, don\'t specify when using stdout as output or expecting automatic creation of output folder (e.g. in case of detailed stats or slicing)',
      type: 'str',
    },
  );

  convertSubParser.add_argument(
    '-O',
    '--output-type',
    {
      help: 'Output format IANA (or domestic) Media type that may be followed by format dialect definition',
      type: 'str',
      default: formatChoices,
      dest: 'outputMediaType',
      action: NormalizeMediaTypeAndSave,
    },
  );

  return parser.parse_args(args);
};

module.exports = {
  parseArgs,
};
