import { moduleText } from "../localization.js";
import { parseKineticDamage } from "./ammunition-effects.js";
import { alternateLoadNeedsBallistics } from "../ht-published-loads.js";

export const ballisticsKey = (weaponId, modeId, ammoKey) => JSON.stringify([weaponId, modeId, ammoKey]);
export function validateLoadBallistics(input, parser = globalThis.GURPS?.parselink) {
  const damage = String(input?.damage ?? "").trim(), range = String(input?.range ?? "").trim();
  const parsed = parseKineticDamage(damage);
  const distances = range.replaceAll(",", "").match(/^(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/);
  if (!parsed || parsed.dice <= 0 || parsed.multiplier <= 0 || parsed.divisor <= 0 || parsed.suffix || !distances || !Number.isFinite(Number(distances[1])) || !Number.isFinite(Number(distances[2]??distances[1])) || Number(distances[1]) <= 0 ||
      distances[2] && Number(distances[2]) < Number(distances[1]))
    throw Error(moduleText("OleGURPS.AmmoUX.Ballistics1"));
  if (parser && !["damage", "deriveddamage"].includes(parser(damage)?.action?.type))
    throw Error(moduleText("OleGURPS.AmmoUX.Ballistics2"));
  return { damage, range };
}
export function selectedLoadBallistics({ state, weaponId, modeId, type, catalogs, compatibility }) {
  if (!alternateLoadNeedsBallistics(catalogs, modeId, type?.ammoId, compatibility)) return null;
  const key = ballisticsKey(weaponId, modeId, type?.key);
  const saved = state?.ammunitionBallistics?.[key];
  if (!saved || saved.weaponId !== weaponId || saved.modeId !== modeId || saved.ammoKey !== type?.key ||
      saved.ammoId !== type?.ammoId) return null;
  try { return { ...validateLoadBallistics(saved), source: "owner-entered", approvedByBook: false }; }
  catch { return null; }
}
