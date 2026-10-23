import {readFile} from 'node:fs/promises';
import {gaussFixture,catalogs} from './gauss-context.mjs';
export {catalogs};
export const inventory=JSON.parse(await readFile(new URL('../../docs/audit/ut-weapons-inventory.json',import.meta.url),'utf8'));
export async function fixture(id){
 const f=await gaussFixture(id);
 f.hardware=async settings=>{const state=f.state();state.weapons[0].exoticBeamHardwareRequest={psionicSettings:settings};await f.service.saveState(state);};
 f.configure=changes=>f.service.setExoticBeamConfiguration(f.weapon().id,changes);
 return f;
}
