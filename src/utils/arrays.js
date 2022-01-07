const flattenDeep = require('lodash.flattendeep');

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
};
