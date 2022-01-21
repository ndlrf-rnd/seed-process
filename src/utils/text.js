const { isEmpty } = require('./types');

// Returns the length of the input string in UTF8 bytes
const lengthInBytes = (str) => {
  const match = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (match ? match.length : 0);
};

const escapeUnprintable = (str) => str
  .replace(/\n/ug, '\\n')
  .replace(/\r/ug, '\\r')
  .replace(/\t/ug, '\\t');

/**
 * Pad string on left side
 * @param str
 * @param len
 * @param sym
 * @returns {string}
 */
const padLeft = (str, len, sym = ' ') => [
  `${sym}`.repeat(Math.max(len - `${str}`.length, 0)),
  str,
].join('');

/**
 * Pad string on right side
 * @param str
 * @param len
 * @param sym
 * @returns {string}
 */
const padRight = (str, len, sym = ' ') => [
  str,
  `${sym}`.repeat(Math.max(len - `${str}`.length, 0)),
].join('');

const prettyBytes = (num, decimals = 2) => {
  num = parseInt(num, 10);
  if (isEmpty(num)) {
    throw new TypeError('Expected a number-like');
  }

  const neg = num < 0;
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  if (neg) {
    num = -num;
  }

  if (num < 1) {
    return `${(neg ? '-' : '') + num} B`;
  }

  const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1);
  num = (num / (1000 ** exponent)).toFixed(decimals);
  return `${(neg ? '-' : '') + num} ${units[exponent]}`;
};

module.exports = {
  escapeUnprintable,
  lengthInBytes,
  padLeft,
  padRight,
  prettyBytes,
};
