const jsonata = require('jsonata');
const { fromISO2709 } = require('@seed/format-marc/src/serial/iso2709');
const { padRight, prettyBytes } = require('../utils/text');

const REPORT_INTERVAL_MS = 300;
// eslint-disable-next-line no-unused-vars
let reportIntervalId;

const marcFilter = (rs, ws, jsonataExpr) => new Promise((resolve, reject) => {
  const compiledJsonata = jsonata(jsonataExpr);
  rs.on('error', reject);
  let ended = false;
  let reminder = null;
  let len = 0;
  let recordsTotal = 0;
  const recordsMatched = 0;
  let prevRecordsTotal = 0;
  reportIntervalId = setInterval(() => {
    process.stderr.write(
      [
        `progress input: ${padRight(`(${prettyBytes(len)})`, 13)}`,
        `records total: ${recordsTotal}`,
        `matched total: ${recordsMatched}`,
        `Performance: ${((recordsTotal - prevRecordsTotal) / (REPORT_INTERVAL_MS / 1000)).toFixed(0)} rps\n`,
      ].join('\t'),
    );
    prevRecordsTotal = recordsTotal;
  }, REPORT_INTERVAL_MS);

  const processChunk = (chunk) => {
    let offset = 0;
    while (offset !== -1) {
      const id = chunk.indexOf('\x1D', offset);
      // process.stdout.write('zzz', id)
      if (id !== -1) {
        recordsTotal += 1;
        const rec = compiledJsonata.evaluate(
          fromISO2709(
            chunk.slice(offset, id + 1),
          )[0],
        );
        ws.write(`${(typeof rec === 'object') ? JSON.stringify(rec) : rec}\n`);
        offset = id + 1;
      } else {
        break;
      }
    }
    reminder = chunk.slice(offset);
  };
  const onEnd = () => {
    if (!ended) {
      if (reminder) {
        processChunk(reminder);
      }
      ended = true;
      resolve();
    }
  };

  rs.on('end', onEnd);
  rs.on('data', (data) => {
    rs.pause();
    len += data.byteLength;
    processChunk(reminder ? Buffer.concat([reminder, data]) : data);
    rs.resume();
  });
});

module.exports = {
  marcFilter,
};

marcFilter(
  process.stdin,
  process.stdout,
  process.argv[2] || '$',
).then(
  () => {
    process.stderr.write('Done');
    process.exit(0);
  },
).catch(
  (err) => {
    process.stderr.write(`ERROR:\n${err.message}\n${err.stack}`);
    process.exit(-1);
  },
);
