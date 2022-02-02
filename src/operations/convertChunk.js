const { flatten } = require('@seed/format-marc/src/utils/arrays');
const { cpMap } = require('../utils/promise');
const formats = require('../formats');
/**
 *
 * @param records
 * @param {Object} ctx
 * @param {String} ctx.inputMediaType
 * @param {String} ctx.outputMediaType
 * @param {Boolean} ctx.header
 * @returns {Promise<*>}
 */
const convertChunk = async (records, ctx) => {
  const format = formats[ctx.inputMediaType];
  const recordObjects = flatten(await cpMap(
    records,
    async (r) => format.serial[ctx.inputMediaType].from(r),
  ));
  return flatten(await cpMap(
    recordObjects,
    (r) => format.export[ctx.outputMediaType](r, ctx),
  )).join('');
};

module.exports = {
  convertChunk,
};
