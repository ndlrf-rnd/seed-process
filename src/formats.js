const { NPM_PACKAGE_MANIFEST } = require('./constants');

const FORMAT_PACKAGE_PREFIX = '@seed/format-';

const REGISTERED_FORMATS = Object.keys(NPM_PACKAGE_MANIFEST.dependencies).sort().filter(
  (n) => n.startsWith(FORMAT_PACKAGE_PREFIX),
).reduce(
  (a, o) => ({
    ...a,
    // eslint-disable-next-line
    [o.replace(FORMAT_PACKAGE_PREFIX, '')]: require(`@seed/format-${
      NPM_PACKAGE_MANIFEST.dependencies[o].split('-').slice(-1)[0].split('#')[0]
    }`),
  }),
  {},
);

const formats = Object.values(REGISTERED_FORMATS).reduce(
  (a, format) => ({
    ...a,
    ...(
      Object.keys(format.serial || {}).reduce(
        (aa, k) => ({
          ...aa,
          [k]: format,
          [k.split('/').slice(-1)[0]]: format,
        }),
        {},
      )
    ),
  }),
  {},
);

module.exports = formats;
