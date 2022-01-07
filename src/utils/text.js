// Returns the length of the input string in UTF8 bytes
const lengthInBytes = (str) => {
  const match = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (match ? match.length : 0);
};

const escapeUnprintable = (str) => str
  .replace(/\n/ug, '\\n')
  .replace(/\r/ug, '\\r')
  .replace(/\t/ug, '\\t');

module.exports = {
  escapeUnprintable,
  lengthInBytes,
};
