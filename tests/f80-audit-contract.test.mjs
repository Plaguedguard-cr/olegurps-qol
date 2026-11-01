// Retain the prior audit coverage against the production helper after repair.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('../scripts/tools/melee-service.js',import.meta.url),'utf8');
import { performActionWithoutGgaConfirmation as bypass } from '../scripts/tools/gga-roll-confirmation.js';
assert.match(source,/performActionWithoutGgaConfirmation as performMeleeActionWithoutConfirmation/);
assert.match(source,/performMeleeActionWithoutConfirmation\(\(\) => globalThis\.GURPS\.performAction/);
function fixture(){const calls=[],original=async options=>{calls.push(options.window.title);return 'native';};globalThis.foundry={applications:{api:{DialogV2:{wait:original}}}};globalThis.game={i18n:{localize:()=> 'Native confirmation'}};return {calls,original,dialog:foundry.applications.api.DialogV2};}
test('F80 ordinary unrelated dialog delegates and thrown callback restores wait',async()=>{
 const f=fixture();await assert.rejects(bypass(async()=>{assert.equal(await f.dialog.wait({window:{title:'Other'}}),'native');throw Error('controlled failure');}),/controlled failure/);assert.equal(f.dialog.wait,f.original);assert.deepEqual(f.calls,['Other']);
});
test('F80 audit: same-title foreign confirmation cannot be distinguished by the present wrapper',async()=>{
 const f=fixture();const result=await bypass(()=>f.dialog.wait({window:{title:'Native confirmation'},buttons:[{action:'roll',callback:()=> 'foreign auto-confirmed'}]}));assert.equal(result,'foreign auto-confirmed');assert.equal(f.calls.length,0);assert.equal(f.dialog.wait,f.original);
});
test('F80 regression: out-of-order overlapping calls restore the original wait',async()=>{
 const f=fixture();let finishA,finishB;const gateA=new Promise(r=>finishA=r),gateB=new Promise(r=>finishB=r);
 const a=bypass(()=>gateA),wrapperA=f.dialog.wait,b=bypass(()=>gateB);finishA(true);await a;finishB(true);await b;
 assert.equal(f.dialog.wait,f.original);assert.notEqual(f.dialog.wait,wrapperA);
});
