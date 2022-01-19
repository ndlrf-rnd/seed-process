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

module.exports = {
  escapeUnprintable,
  lengthInBytes,
  padLeft,
  padRight,
};
