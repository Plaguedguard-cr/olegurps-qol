// Browser/Node compatible QA utility. No game writes; full private values belong in owned local QA storage.
const clone = value => structuredClone(value);
const entries = collection => Array.isArray(collection) ? collection : collection?.contents ?? [...(collection ?? [])];
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value); for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
function indexed(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row.id || map.has(row.id)) throw Error('Missing or duplicate QA object ID');
    map.set(row.id, row);
  }
  return map;
}
export function captureQaStructure({ actors = [], users = [], operation = 'baseline', at = new Date().toISOString() } = {}) {
  const snapshot = { operation, at,
    actors: entries(actors).map(actor => ({ id: actor.id, system: clone(actor.system),
      sourceSystem: clone(actor.toObject(true).system), flags: clone(actor.flags) })),
    users: entries(users).map(user => ({ id: user.id, flags: clone(user.flags) })) };
  indexed(snapshot.actors); indexed(snapshot.users);
  return freeze(snapshot);
}
const pathKey = (path, key, array) => array ? path + '[' + key + ']' :
  /^[A-Za-z_$][\w$]*$/.test(key) ? path + '.' + key : path + '[' + JSON.stringify(key) + ']';
export function structuralValueDiff(before, after, path = '', context = {}) {
  const result = [];
  function visit(a, b, current, beforeExists = true, afterExists = true) {
    if (beforeExists === afterExists && Object.is(a, b)) return;
    if (beforeExists && afterExists && a && b && typeof a === 'object' && typeof b === 'object' &&
        Array.isArray(a) === Array.isArray(b)) {
      if (a instanceof Date || b instanceof Date) {
        if (!(a instanceof Date && b instanceof Date && Object.is(a.getTime(), b.getTime()))) record();
        return;
      }
      if (Array.isArray(a) && a.length !== b.length) visit(a.length, b.length, current + '.length');
      for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
        visit(a[key], b[key], pathKey(current, key, Array.isArray(a)), Object.hasOwn(a, key), Object.hasOwn(b, key));
      }
    } else record();
    function record() {
      result.push({ ...context, path: current, beforeExists, afterExists,
        before: a === undefined ? { qaType: 'undefined' } : clone(a),
        after: b === undefined ? { qaType: 'undefined' } : clone(b) });
    }
  }
  visit(before, after, path); return result;
}
export function compareQaStructures(baseline, current, { operation = current.operation, at = current.at } = {}) {
  const result = { operation, at, actorSystemDiff: [], actorSourceSystemDiff: [], actorFlagsDiff: [], permanentUserFlagsDiff: [] };
  for (const [kind, fields] of [['actors', [['system', 'actorSystemDiff'], ['sourceSystem', 'actorSourceSystemDiff'], ['flags', 'actorFlagsDiff']]],
    ['users', [['flags', 'permanentUserFlagsDiff']]]]) {
    const before = indexed(baseline[kind]), after = indexed(current[kind]);
    for (const id of [...new Set([...before.keys(), ...after.keys()])].sort()) {
      for (const [field, output] of fields) result[output].push(...structuralValueDiff(before.get(id)?.[field], after.get(id)?.[field], field,
        { objectType: kind === 'actors' ? 'Actor' : 'User', objectId: id, operation, at }));
    }
  }
  result.equal = ['actorSystemDiff', 'actorSourceSystemDiff', 'actorFlagsDiff', 'permanentUserFlagsDiff'].every(key => result[key].length === 0);
  return result;
}
