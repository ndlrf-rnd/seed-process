const FpStr = require('fpstr');

const { flatten } = require('@seed/format-marc/src/utils/arrays');
const {
  executeParallel,
  initWorker,
} = require('./workers');
const { cpMap } = require('../utils/promise');
const formats = require('../formats');
const { StatCounter } = require('../statCounter');

const statChunk = async (records, ctx) => {
  const mediaType = ctx.inputMediaType;
  const format = formats[mediaType];
  const recordObjs = flatten(await cpMap(records, async (r) => format.serial[mediaType].from(r)));

  // console.error('SC', 'recordObjs',recordObjs)
  const statCounter = new StatCounter();
  recordObjs.forEach((rec) => statCounter.add(rec));
  // console.error('SC', statCounter, 'SCJSON', statCounter.toJSON())
  return statCounter.toJSON();
};

const convertChunk = async (records, ctx) => {
  const mediaType = ctx.inputMediaType;
  const format = formats[mediaType];
  return flatten(cpMap(records, async (r) => format.serial[mediaType].from(r)));
};

const fingerprint = async (strrings, ctx) => strrings.map(
  (str) => FpStr(str, ctx),
);

initWorker({
  fingerprint,
  convertChunk,
  statChunk,
});

module.exports = {
  initWorker,
  convertChunk,
  statChunk,
  fingerprint,
  executeParallel,
};
