const path = require('path');
const readline = require('readline');
const events = require('events');
const fs = require('fs');
const {
  info,
  error,
} = require('../utils/log');
const { cpMap } = require('../utils/promise');
const { defaults } = require('../utils/objects');
const { DEFAULT_NUM_SAMPLES } = require('../constants');

const readLines = async (p, options) => {
  const result = [];
  try {
    const rl = readline.createInterface({
      input: fs.createReadStream(p, options),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      result.push(line);
    });

    await events.once(rl, 'close');
  } catch (err) {
    error(err);
    throw err;
  }
  return result;
};

/**
 *
 * @param paths
 * @param {Object} ctx
 * @param {number} ctx.numSamples
 * @returns {Promise<Array>}
 */
const describeFieldFile = async (paths, ctx) => cpMap(
  paths,
  async (inputPath) => {
    ctx = defaults(ctx, { numSamples: DEFAULT_NUM_SAMPLES });
    const outputPath = [
      ...inputPath.split('.').slice(0, -1),
      'tmp',
      ...inputPath.split('.').slice(-1),
    ].join('.');
    const outs = fs.createWriteStream(outputPath);
    outs.write(`${['value', 'occurrences', 'ids'].join('\t')}\n`);

    info(`Processing ${inputPath}`);
    const lines = await readLines(inputPath, { encoding: 'utf-8' });
    // const header = lines[0];
    const sortedStrings = lines.slice(1).sort();
    const field = path.basename(inputPath).split('.').slice(0, -1).join('.');
    const resultStat = {
      occurrences: 0,
      unique: 0,
      input: inputPath,
      output: outputPath,
      field,
      samples: [],
    };
    if (!field.trim()) {
      return resultStat;
    }
    const flush = (row) => {
      if (resultStat.samples.length <= ctx.numSamples) {
        // eslint-disable-next-line no-unused-vars
        const [value, occurrences] = row.slice(0, 2);
        resultStat.samples.push([value, occurrences]);
      }
    };
    const byValue = sortedStrings.reduce(
      (acc, row, idx) => {
        const chunks = row.split('\t');
        const id = chunks.slice(-1)[0];
        const value = chunks.slice(0, -1).join('\t');
        if ((acc.length === 0) || (acc[acc.length - 1][0] !== value)) {
          if (acc.length > 0) {
            flush(acc[acc.length - 1]);
          }
          acc.push([value, 0, '']);
          resultStat.unique += 1;
        }
        resultStat.occurrences += 1;
        acc[acc.length - 1][1] += 1;
        acc[acc.length - 1][2] += ` ${id}`;
        if (idx === sortedStrings.length - 1) {
          flush(acc[acc.length - 1]);
        }
        return acc;
      },
      [],
    );
    byValue.sort(
      (a, b) => b[1] - a[1],
    ).forEach(
      ([value, occurrences, ids]) => outs.write(`${
        [value, occurrences, ids.trim()].join('\t')
      }\n`),
    );
    return resultStat;
  },
);

module.exports = {
  describeFieldFile,
};
