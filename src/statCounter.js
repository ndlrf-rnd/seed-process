const {
  forceArray,
  range,
} = require('./utils/arrays');

const { mergeObjectsReducer } = require('./utils/objects');

const arr2tsv = (rows) => rows.map((row) => row.join('\t')).join('\n');

const expandMarcObj = (rec, arrayIndex = false) => {
  const kvObj = {};
  Object.keys(rec).forEach((k) => {
    forceArray(rec[k]).forEach((fieldValue, fieldValueIdx) => {
      if (typeof fieldValue === 'string') {
        kvObj[k] = kvObj[k] || [];
        kvObj[k].push(fieldValue);
      } else {
        Object.keys(fieldValue).filter(
          (subfieldCode) => subfieldCode.length === 1,
        ).sort().forEach(
          (subfieldCode) => {
            forceArray(fieldValue[subfieldCode]).forEach(
              (subfieldValue, subfieldValueIdx) => {
                if (arrayIndex) {
                  const expandedKey = `${k}.${fieldValue.ind1}.${fieldValue.ind2}.${fieldValueIdx}.${subfieldCode}.${subfieldValueIdx}`;
                  kvObj[expandedKey] = subfieldValue;
                } else {
                  const expandedKey = `${k}.${fieldValue.ind1}.${fieldValue.ind2}.${subfieldCode}`;
                  // console.error('kvobj', 'kvobj', kvObj)
                  if (!Array.isArray(kvObj[expandedKey])) {
                    kvObj[expandedKey] = [];
                  }
                  kvObj[expandedKey].push(subfieldValue);
                }
              },
            );
          },
        );
      }
    });
  });
  return kvObj;
};

const jsonToTsv = (jsonObj) => {
  const header = [
    'code',
    'ind1',
    'ind2',
    'subfield',

    'containingRecords',
    'occurrences',
    'meanSize',

    ...(range(1, 2 + 1, 1)).map((rank) => `sample_${rank}`),
  ];
  const usedFields = Object.keys(jsonObj.valueSize).sort();
  const rows = usedFields.map(
    (marcField) => {
      const firstLastSample = [
        jsonObj.samples[marcField][0],
        jsonObj.samples[marcField][1] || '',
      ];

      return ([
        ...(marcField + ('.'.repeat(3))).split('.').slice(0, 4),

        jsonObj.containingRecords[marcField],
        jsonObj.occurrences[marcField],

        // Mean
        (
          Object.keys(jsonObj.valueSize[marcField]).reduce(
            (a, k) => (
              a + parseInt(k, 10) * jsonObj.valueSize[marcField][k]
            ),
            0,
          ) / jsonObj.occurrences[marcField]
        ).toFixed(2),

        ...firstLastSample,
      ]);
    },
  );

  return arr2tsv([header, ...rows]);
};

class StatCounter {
  constructor() {
    this.recordsTotal = 0;
    this.occurrencesTotal = 0;
    this.valueSize = {};
    this.samples = {};
    this.containingRecords = {};
    this.occurrences = {};
  }

  mergeJSON(dataObj) {
    mergeObjectsReducer(this, dataObj);
  }

  add(entity) {
    this.recordsTotal += 1;
    const expandedEntity = expandMarcObj(entity, false);
    const keys = Object.keys(expandedEntity).sort();

    keys.forEach((k) => {
      if (!this.containingRecords[k]) {
        this.containingRecords[k] = 0;
      }
      this.containingRecords[k] += 1;

      const values = forceArray(expandedEntity[k]);
      if (!this.occurrences[k]) {
        this.occurrences[k] = 0;
      }
      this.occurrences[k] += values.length;
      this.occurrencesTotal += values.length;

      values.forEach((value) => {
        // samples
        if (typeof this.samples[k] === 'undefined') {
          this.samples[k] = [value, null];
        } else {
          this.samples[k][1] = value;
        }

        // valueSize
        if (!this.valueSize[k]) {
          this.valueSize[k] = {};
        }
        const la = `${value.length}`;
        if (!this.valueSize[k][la]) {
          this.valueSize[k][la] = 0;
        }
        this.valueSize[k][la] += 1;
      });
    });
  }

  toJSON() {
    return Object.keys(this).reduce(
      (a, k) => ({
        ...a,
        [k]: this[k],
      }),
      {},
    );
  }

  toTSV() {
    return jsonToTsv(this.toJSON());
  }
}

module.exports = {
  StatCounter,
};
