import { developerText } from "./developer-localization.js";
// Session-local state. No settings, document writes, hooks or Roll prototype patches.
let pending = null;
const listeners = new Set();

export function requireDeveloperGM() {
  const user = globalThis.game?.user;
  if (!user?.isGM || !user.id) throw new Error("OleGURPS developer mode requires a GM.");
  return user;
}

function publish() {
  for (const listener of listeners) {
    try { listener(); } catch (error) { console.error("OleGURPS developer window refresh failed.", error); }
  }
}

export function getPendingTestRoll() {
  const user = requireDeveloperGM();
  return pending?.userId === user.id ? pending.total : null;
}

export function armTestRoll(total) {
  const user = requireDeveloperGM();
  if (!Number.isInteger(total) || total < 3 || total > 18) throw new RangeError("Expected a 3d6 total from 3 to 18.");
  pending = Object.freeze({ total, userId: user.id });
  publish();
  return total;
}

export function cancelTestRoll() {
  const user = requireDeveloperGM();
  if (pending?.userId === user.id) pending = null;
  publish();
}

export function subscribeTestRoll(listener) {
  requireDeveloperGM();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Called exclusively by the two OleGURPS prepared-check executors.
// Restore a genuine evaluated Roll with its original GGA Roll/Die classes.
// Foundry's public serialization API keeps dice, total and chat serialization consistent.
export async function evaluatePreparedCheck(formula, runtime, kind) {
  const original = runtime.Roll.create(formula);
  const user = globalThis.game?.user;
  const eligible = user?.isGM && runtime.game?.user?.isGM &&
    runtime.game.user.id === user.id && pending?.userId === user.id &&
    ["prepared-attack", "prepared-skill"].includes(kind) &&
    /^3d6(?:\[[^\[\]]*\])?$/.test(formula);
  if (!eligible) {
    await original.evaluate();
    return { roll: original, testRoll: null };
  }

  const request = pending;
  const data = original.toJSON();
  if (data.terms?.length !== 1 || data.terms[0].number !== 3 ||
      data.terms[0].faces !== 6 || data.terms[0].modifiers?.length) {
    throw new Error("Unsupported prepared 3d6 terms; test result remains pending.");
  }
  let remaining = request.total;
  const results = Array.from({ length: 3 }, (_, index) => {
    const result = Math.min(6, remaining - (2 - index));
    remaining -= result;
    return { result, active: true };
  });
  data.terms[0].results = results;
  data.terms[0].evaluated = true;
  data.evaluated = true;
  data.total = request.total;
  const roll = runtime.Roll.fromData(data);
  const actual = roll.dice?.[0]?.results?.filter(entry => entry.active !== false);
  if (roll.total !== request.total || actual?.length !== 3 ||
      actual.some(entry => !Number.isInteger(entry.result) || entry.result < 1 || entry.result > 6) ||
      actual.reduce((sum, entry) => sum + entry.result, 0) !== request.total) {
    throw new Error("Foundry could not reconstruct the test roll; result remains pending.");
  }
  pending = null;
  publish();
  return { roll, testRoll: request };
}

export function testRollNotice(testRoll, runtime) {
  if (!testRoll) return "";
  const label = developerText("TestRoll", runtime);
  const escaped = label.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  return `<p class="olegurps-test-roll" style="border:2px solid #b64d00;padding:4px"><strong><i class="fas fa-flask" aria-hidden="true"></i> ${escaped}: ${testRoll.total}</strong></p>`;
}
