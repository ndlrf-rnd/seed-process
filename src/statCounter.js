const {
  MARC_JSON_SCHEMA,
  MARC_FORKS,
} = require('@seed/format-marc/src/constants');
const { describeField } = require('@seed/format-marc');
const { forceArray, flattenDeep } = require('./utils/arrays');
const { cpMap } = require('./utils/promise');
const { error } = require('./utils/log');

const toTsv = (rows) => rows.map((row) => row.join('\t')).join('\n');

const MARC_STAT_TSV_COLUMNS = [
  'record_type',
  'field',
  'occurrences',
  'first_value_met',
  'last_value_met',
  'symbols_in_field_total',
  'description',
  'subfield_description',
];

const MARC_STAT_JSON_COLUMNS = [
  'fieldsTotal',
  'conditions',
  'marc',
  'recordsTotal',
  'recordsTotalInvalid',

  'symbolsInFieldTotal',

  'firstMetSamples',
  'lastMetSamples',

  'fieldsTotal',
  'fieldsCount',
  'symbolsTotal',

  // 'accessLabels',
  // 'fieldsRelationTotal',
  // 'fieldsRelationCount',
];

class StatCounter {
  constructor(marc = MARC_FORKS.MARC21) {
    this.fieldsTotal = 0;
    this.marc = marc;
    this.recordsTotal = 0;
    this.recordsTotalInvalid = 0;

    this.symbolsInFieldTotal = {};

    this.firstMetSamples = {};
    this.lastMetSamples = {};

    this.fieldsTotal = 0;
    this.fieldsCount = {};
    this.symbolsTotal = 0;

    // this.accessLabels = {};
    // this.fieldsRelationTotal = {};
    // this.fieldsRelationCount = {};
  }

  add(entity) {
    if (entity.leader) {
      // const gc = entity.leader["6"];
      // const t = Object.keys(MARC21_RECORD_TYPE_GROUP_CODES).sort().filter(
      //     (tg) =>
      //       MARC21_RECORD_TYPE_GROUP_CODES[tg].indexOf(gc) !==
      //       -1
      //   )[0] || MARC_RECORD_FORMATS.UNKNOWN;
      //
      this.recordsTotal += 1;
      Object.keys(entity).sort().forEach((tag) => {
        const fieldItems = forceArray(entity[tag]);
        // const accessLabels = [];
        (fieldItems || []).forEach((fieldItem) => {
          // Add defaults
          this.firstMetSamples[tag] = this.firstMetSamples[tag] || {};
          this.lastMetSamples[tag] = this.lastMetSamples[tag] || {};
          this.symbolsInFieldTotal[tag] = this.symbolsInFieldTotal[tag] || {};
          // this.fieldsRelationCount[t] = this.fieldsRelationCount[t] || {};
          this.fieldsCount[tag] = this.fieldsCount[tag] || {};
          let subfieldsToUse = null;
          if (typeof fieldItem !== 'string' && !Array.isArray(fieldItem)) {
            if (typeof fieldItem.value === 'undefined') {
              subfieldsToUse = Object.keys(fieldItem).filter((k) =>
                k.match(/^([a-z0-9]|[0-9]{2}|[0-9]{2}-[0-9]{2})$/giu));
            } else {
              Object.keys(fieldItem).sort();
            }
          }
          if (subfieldsToUse) {
            subfieldsToUse.forEach((code) => {
              const f = `${tag}$${code}`;
              if (fieldItem[code]) {
                const subfieldItems = forceArray(fieldItem[code]);
                subfieldItems.forEach((subfield) => {
                  // if (f === '979$a') {
                  //   accessLabels.push(subfield);
                  // }
                  // const consider = (this.conditions.length === 0)
                  //   ? true
                  //   : this.conditions.reduce(
                  //     (a, condition) => (a || (!!subfield.match(condition))),
                  //     false,
                  //   );
                  // if (consider) {
                  this.fieldsTotal += 1;
                  this.fieldsCount[tag][f] = (this.fieldsCount[tag][f] || 0) + 1;
                  this.firstMetSamples[tag][f] = this.firstMetSamples[tag][f] || subfield;
                  this.lastMetSamples[tag][f] = subfield;
                  this.symbolsTotal += subfield.length || 0;
                  this.symbolsInFieldTotal[tag][f] = (
                    this.symbolsInFieldTotal[tag][f] || 0
                  ) + subfield.length;
                  this.fieldsRelationTotal = 0;
                  // this.fieldsRelationCount[t][f] = 0;
                  // }
                });
              }
            });
          } else {
            const f = `${tag}`;
            const fieldValue = typeof fieldItem === 'object' && fieldItem.value
              ? fieldItem.value
              : fieldItem;
            const consider = this.conditions.length === 0
              ? true
              : this.conditions.reduce(
                (a, condition) => a || !!fieldValue.match(condition),
                false,
              );
            if (consider) {
              this.fieldsTotal += 1;
              this.fieldsCount[tag][f] = (this.fieldsCount[tag][f] || 0) + 1;
              this.firstMetSamples[tag][f] = this.firstMetSamples[tag][f] || fieldValue;
              this.symbolsTotal += fieldValue.length || 0;
              this.symbolsInFieldTotal[tag][f] = (
                this.symbolsInFieldTotal[tag][f] || 0
              ) + fieldValue.length;
              this.lastMetSamples[tag][f] = fieldValue;
            }
          }
        });

        // if (accessLabels.filter((al) => !!(al || '').trim()).length > 0) {
        //   const accessLabelsStr = uniq(accessLabels).sort().join('|');
        //   this.accessLabels[accessLabelsStr] = this.accessLabels[accessLabelsStr] || 0;
        //   this.accessLabels[accessLabelsStr] += 1;
        // }
      });
    } else {
      this.recordsTotalInvalid += 1;
    }
  }

  getTotal() {
    return {
      records: this.recordsTotal,
      // fieldsRelation: this.fieldsRelationTotal,
      // accessLabels: this.accessLabels,
      symbolsTotal: this.symbolsTotal,
      fields: this.fieldsTotal,
      recordsTotalInvalid: this.recordsTotalInvalid,
    };
  }

  fromJSON(json) {
    Object.assign(this, json);
    return this;
  }

  toJSON() {
    return MARC_STAT_JSON_COLUMNS.reduce(
      (a, k) => ({
        ...a,
        [k]: this[k],
      }),
      {},
    );
  }

  toString() {
    return toTsv([
      MARC_STAT_TSV_COLUMNS,
      ...flattenDeep(
        Object.keys(this.fieldsCount).sort()
          .map((rType) =>
            Object.keys(this.fieldsCount[rType]).sort()
              .map((fCode) => {
                const d = describeField(
                  {
                    tag: fCode.split('$')[0],
                    subfield: `$${fCode.split('$')[1]}`,
                  },
                  null,
                  rType,
                  MARC_JSON_SCHEMA[this.marc],
                );
                return [
                  rType,
                  fCode,
                  this.fieldsCount[rType][fCode] || '',
                  // this.fieldsRelationCount[rType][fCode] || '',
                  this.firstMetSamples[rType][fCode] || '',
                  this.lastMetSamples[rType][fCode] || '',
                  this.symbolsInFieldTotal[rType][fCode] || '',
                  d.description || '',
                  d.subfieldDescription || '',
                ];
              })),
      ),
    ]);
  }
}

const statChunk = async (records, config) => {
  config = { ...(config || {}) };
  const statCounter = new StatCounter(config.marc);

  await cpMap(
    records,
    async (record) => {
      // eslint-disable-next-line no-undef
      const jsonEntities = await fromIso2709(record);
      if (!Array.isArray(jsonEntities)) {
        error(`Marc record (supposed ISO2709) parsing has been failed. Input: ${jsonEntities}`);
        return [];
      }
      jsonEntities.forEach(statCounter);
      return [];
    },
  );
  return statCounter;
};

module.exports = {
  StatCounter,
  statChunk,
  toTsv,
};
