const { forceArray } = require('./utils/arrays');
const { isEmpty } = require('./utils/types');
const { info } = require('./utils/log');

const {
  NPM_PACKAGE_MANIFEST,
  DEFAULT_MEDIA_TYPE,
} = require('./constants');

const FORMAT_PACKAGE_PREFIX = '@seed/format-';

const REGISTERED_FORMATS = Object.keys(NPM_PACKAGE_MANIFEST.dependencies).sort().filter(
  (n) => n.startsWith(FORMAT_PACKAGE_PREFIX),
).reduce(
  (a, o) => ({
    ...a,
    [o.replace(FORMAT_PACKAGE_PREFIX, '')]: o,
  }),
  {},
);

const formats = Object.keys(REGISTERED_FORMATS).map(
  // FIXME: Unsafe require
  // eslint-disable-next-line global-require,import/no-dynamic-require
  (formatName) => require(REGISTERED_FORMATS[formatName]),
).reduce(
  (a, format) => {
    const intf = {
      ...format,
      // toObjects: (input) => ((typeof format.toObjects === 'function'
      //  ) ? format.toObjects
      //  : forceArray)(input),
      mediaType: isEmpty(format.mediaType)
        ? DEFAULT_MEDIA_TYPE
        : format.mediaType,
      toEntities: async (inputStrOrBuffer, config) => {
        const entitiesOrRelations = (typeof format.toEntities === 'function')
          ? await format.toEntities(inputStrOrBuffer, config)
          : inputStrOrBuffer;
        return forceArray(entitiesOrRelations).map(
          (entityOrRelation) => (entityOrRelation.kind
            ? ({
              ...entityOrRelation,
              mediaType: (
                entityOrRelation.mediaType
                || entityOrRelation.media_type
                || format.mediaType
                || format.media_type
              ),
            })
            : entityOrRelation),
        );
      },
    };
    return {
      ...a,
      [format.mediaType]: intf,
    };
  },
  {},
);

const extensions = Object.keys(formats).sort().reduce((a, o) => ({
  ...a,
  [formats[o].extension]: [...(a[formats[o].extension] || []), formats[o].mediaType],
}), {});

info(`Registered formats:\n ${Object.keys(formats).sort().map((f) => `- ${f}`).join('\n')}`);

module.exports = {
  formats,
  extensions,
};
