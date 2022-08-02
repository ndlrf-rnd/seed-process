const flattenDeep = require('lodash.flattendeep');
const sortBy = require('lodash.sortby');
const range = require('lodash.range');
const uniq = require('lodash.uniq');

const forceArray = (x) => (Array.isArray(x) ? x : [x].filter((v) => !!v));

const counts = (arr) => {
  const res = {};
  for (let i = 0; i < arr.length; i += 1) {
    const v = arr[i];
    if (!(v in res)) {
      res[v] = 1;
    } else {
      res[v] += 1;
    }
  }
  return res;
};

module.exports = {
  counts,
  forceArray,
  flattenDeep,
  sortBy,
  range,
  uniq,
};
