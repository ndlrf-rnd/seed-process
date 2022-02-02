const FpStr = require('fpstr');
const { forceArray } = require('../utils/arrays');

const fingerprint = async (strings, ctx) => forceArray(strings).map(
  (str) => FpStr(str, ctx),
);

module.exports = {
  fingerprint,

};
