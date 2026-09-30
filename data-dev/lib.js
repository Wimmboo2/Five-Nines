// Helpers for writing tagged values in the dev data files.
//
// Every number (and every spec string the sim reads) in data-dev is one of:
//   published: a value stated by a manufacturer, standard, or documentation page
//   measured:  a value someone measured (benchmark, review, field data)
//   estimate:  a theoretical or derived value, with the reasoning written down
//
// published and measured values must name a source id from sources.js.
// estimates must carry reasoning. scripts/validate rules enforce this.

export function pub(value, unit, source, note) {
  return clean({ value, unit, tag: 'published', source, note });
}

export function meas(value, unit, source, note) {
  return clean({ value, unit, tag: 'measured', source, note });
}

export function est(value, unit, reasoning, source) {
  // source is optional here: an estimate can be derived from a sourced value
  return clean({ value, unit, tag: 'estimate', reasoning, source });
}

function clean(o) {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
}

export function isTagged(x) {
  return x !== null && typeof x === 'object' && 'value' in x && 'tag' in x;
}
