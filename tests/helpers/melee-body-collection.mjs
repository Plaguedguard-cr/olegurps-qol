import assert from 'node:assert/strict';
import {collectMeleeAttacks} from '../../scripts/tools/melee-assistant-state.js';

// These host-identity fixtures have an ordinary humanoid body and physical gear.
// Physical-only fixtures must not acquire personal body attacks automatically.
export function collectMeleeAttacksWithBodyContract(actor){
 const before=JSON.stringify(actor.system),rows=collectMeleeAttacks(actor),body=rows.filter(a=>a.unarmedRef);
 assert.deepEqual(body,[]); // Physical fixtures have no manually selected body attacks.
 assert.equal(JSON.stringify(actor.system),before);
 return rows.filter(a=>!a.unarmedRef);
}
