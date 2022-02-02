const { NPM_PACKAGE_MANIFEST } = require('./constants');

const FORMAT_PACKAGE_PREFIX = '@seed/format-';

const REGISTERED_FORMATS = Object.keys(NPM_PACKAGE_MANIFEST.dependencies).sort().filter(
  (n) => n.startsWith(FORMAT_PACKAGE_PREFIX),
).reduce(
  (a, o) => {
    // eslint-disable-next-line
    const m = require(`@seed/format-${NPM_PACKAGE_MANIFEST.dependencies[o].split('-').slice(-1)[0].split('#')[0]}`);
    m.detectDialect = (rec) => {
      const keys = Object.keys(m.dialects || {}).sort();
      for (let i = 0; i < keys.length; i += 1) {
        const dialectName = keys[i];
        if (m.dialects[dialectName] && m.dialects[dialectName].is) {
          if (m.dialects[dialectName].is(rec)) {
            return dialectName;
          }
        }
      }
      return null;
    };
    m.toDialect = (rec, targetDialect) => {
      const srcDialect = m.detectDialect(rec);
      const fn = (m.dialects && m.dialects[srcDialect] && m.dialects[srcDialect].to)
        ? m.dialects[srcDialect].to[targetDialect]
        : null;
      if ((!srcDialect) || (srcDialect === targetDialect) || (!fn)) {
        return rec;
      }
      return fn(rec);
    };
    return ({
      ...a,
      [o.replace(FORMAT_PACKAGE_PREFIX, '')]: m,
    });
  },
  {},
);

const formats = Object.values(REGISTERED_FORMATS).reduce(
  (a, format) => ({
    ...a,
    ...(
      Object.keys(format.serial || {}).sort().reduce(
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
