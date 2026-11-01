import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {LT_MELEE_CONSTRUCTIONS,LT_MATERIALS,ltMeleeQualityProfile,ltMaterialChoices,ltMaterialEffect} from '../scripts/lt-melee-quality-data.js';
import {StandaloneWeaponService,StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {resolveMeleeProfile,meleeProfileContext,resolveMeleeQuality,MeleeProfileService,calculateMeleeCost,meleeMaterialOptions} from '../scripts/tools/melee-profile-service.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile,executeNativeMeleeDamage,resolveMeleeCombatCalculation} from '../scripts/tools/melee-service.js';
import {meleeProfileEditorHTML} from '../scripts/tools/melee-profile-editor.js';
import {validateMeleeAttackOverride} from '../scripts/tools/melee-attack-editor.js';
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();globalThis.OleGURPSQOL={catalogs};
function actor(){const flags={};return {id:'m1',isOwner:true,system:{ads:{},swing:'1d+2',thrust:'1d-1',attributes:{ST:{value:12,import:12},DX:{value:12}},
 skills:Object.fromEntries(['Broadsword','Knife','Spear','Axe/Mace','Two-Handed Sword','Staff','Shortsword'].map((name,i)=>[i,{name,level:16,points:4}]))},
 getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),setFlag:async(s,k,v)=>{flags[s+'.'+k]=structuredClone(v);}};}
async function weapon(a,eid,modeId){const d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(eid);const record=await new StandaloneWeaponService(a,catalogs).save(d);
 return {record,attack:readStandaloneAttack(a,record.id,modeId??record.modes[0].modeId)};}
function damageAction(attack){const m=/^(sw|thr)(.*?)\s+(\S+)$/.exec(attack.damage);assert.ok(m,attack.damage);return {...attack,damageAction:{type:'deriveddamage',derivedformula:m[1],formula:m[2],damagetype:m[3]}};}
async function preview(eid,selection,modeId){const a=actor(),{attack}=await weapon(a,eid,modeId),base=damageAction(attack),p=resolveMeleeProfile({actor:a,attack:base,selection});
 return {a,attack:base,p,prepared:p.readinessReason?null:await prepareEffectiveMeleeDamage({actor:a,attack:p})};}

test('M1 precise CF classes, additive balance and material base cost; no arbitrary cents rounding',async()=>{
 for(const [id,fine,veryFine]of [['e140WNiazx7pJ3WTT',2800,14000],['eVXaW9Nwr6YM5IlMJ',500,2500],['en-fdeTeZmFoFeRDl',150,750],['eyvtiiimEqgyXYWaU',120,2000]]){
  assert.equal((await preview(id,{quality:'Fine'})).p.meleeProfile.quality.price,fine);
  assert.equal((await preview(id,{quality:'Very Fine'})).p.meleeProfile.quality.price,veryFine);
 }
 const v=await preview('e140WNiazx7pJ3WTT',{quality:'Fine',balance:'Balanced',material:'wood'});
 assert.equal(v.p.meleeProfile.quality.price,560);assert.equal(v.p.meleeProfile.quality.cost.publishedBase,700);
 assert.equal(v.p.meleeProfile.quality.cost.materialBase,70);assert.equal(v.p.level,17);assert.equal(v.prepared.formula,'1d+3 cr');
 assert.equal(calculateMeleeCost(111,'LT',[{costFactor:-0.6},{costFactor:-0.6}]),22.2);
 assert.equal((await preview('e140WNiazx7pJ3WTT',{quality:'Cheap',balance:'Poorly Balanced',material:'wood'})).p.meleeProfile.quality.price,14);
 assert.equal(calculateMeleeCost(550,'HT',[{costMultiplier:4}]),2200);
});

for(const [material,formula,price]of [['steel','1d+3 cut',700],['wood','1d+3 cr',70],['greenWood','1d+3 cr',70],['horn','1d+3 cr',140],['bone','1d+2 cr',35],['bronze','1d+3 cut',700],['iron','1d+3 cut',700],['silver','1d+3 cut',14000]]){
 test('M1 Longsword '+material,async()=>{const r=await preview('e140WNiazx7pJ3WTT',{material});assert.equal(r.p.readinessReason,null);assert.equal(r.prepared.formula,formula);assert.equal(r.p.meleeProfile.quality.price,price);assert.equal(r.p.meleeProfile.quality.mass,4);});
}
for(const [material,formula]of [['steel','1d+1 imp'],['wood','1d(0.5) imp'],['greenWood','1d-1(0.5) imp'],['horn','1d+1(0.5) imp'],['bone','1d(0.5) imp']]){
 test('M1 thrust material '+material,async()=>{const r=await preview('e140WNiazx7pJ3WTT',{material},'wkePG9X2bhubKRddv');assert.equal(r.prepared.formula,formula);});
}
test('M1 stone and obsidian knives: AD, suppression of quality damage and fixed obsidian quality',async()=>{
 const stone=await preview('e4Cqh4R-bWl7CS7dQ',{material:'stone',quality:'Very Fine'});
 assert.equal(stone.prepared.formula,'1d(0.5) cut');
 const obsidian=await preview('e4Cqh4R-bWl7CS7dQ',{material:'obsidian',quality:'Good'});
 assert.equal(obsidian.prepared.formula,'1d+1(0.5) cut');
 assert.match((await preview('e4Cqh4R-bWl7CS7dQ',{material:'obsidian',quality:'Fine'})).p.readinessReason,/не допускается|только/);
 assert.equal((await preview('e140WNiazx7pJ3WTT',{material:'iron',quality:'Fine'})).prepared.formula,'1d+3 cut');
});
test('M1 native obsidian edges and wooden stakes do not receive their material effects twice',async()=>{
 const obsidian=await preview('eeieywVt5JyxmHN-A',{material:'obsidian'});assert.equal(obsidian.prepared.formula,'1d+4(0.5) cut');
 const stake=await preview('e3m2R0EN6occeIRSW',{material:'wood'});assert.equal(stake.prepared.formula,'1d-1(0.5) imp');
 const green=await preview('e3m2R0EN6occeIRSW',{material:'greenWood'});assert.equal(green.prepared.formula,'1d-2(0.5) imp');
});
test('M1 existing Whip lengths use published cost/mass per yard, no invented shared nominal',async()=>{
 const a=actor();a.system.skills.whip={name:'Whip',level:16,points:4};
 const {attack}=await weapon(a,'exN8oC2r2it8FyM9p'),p=resolveMeleeProfile({actor:a,attack:damageAction(attack),selection:{quality:'Fine'}});
 assert.equal(p.meleeProfile.quality.price,420);assert.equal(p.meleeProfile.quality.mass,14);
 assert.ok(!ltMaterialChoices(meleeProfileContext(a,attack).source).includes('steel'));
});
test('M1 B275 plastic blade and club: real mass/cost, maximum blade quality and campaign TL',async()=>{
 const blade=await preview('e140WNiazx7pJ3WTT',{material:'plastic',quality:'Good'});
 assert.equal(blade.prepared.formula,'1d+3 cut');assert.equal(blade.p.meleeProfile.quality.price,1400);assert.equal(blade.p.meleeProfile.quality.mass,2);
 assert.ok((await preview('e140WNiazx7pJ3WTT',{material:'plastic',quality:'Fine'})).p.readinessReason);
 const club=await preview('en-fdeTeZmFoFeRDl',{material:'plastic',quality:'Very Fine'});
 assert.equal(club.prepared.formula,'1d+5 cr');assert.equal(club.p.meleeProfile.quality.price,1500);assert.equal(club.p.meleeProfile.quality.mass,2.5);
 const trident=await preview('ezzOYj-J1IwXY-ERY',{material:'plastic',quality:'Good'});assert.ok(trident.prepared.formula.includes('(0.5) imp'));
 await blade.a.setFlag('olegurps-qol','campaignTL',6);assert.ok(!meleeMaterialOptions(blade.a,meleeProfileContext(blade.a,blade.attack).source).includes('plastic'));
});
test('M1 silver incompatibilities and additive silver coating, no automatic Vulnerability or breakage',async()=>{
 const good=await preview('e140WNiazx7pJ3WTT',{material:'steel',coating:'silver',quality:'Fine',balance:'Balanced'});
 assert.equal(good.p.meleeProfile.quality.price,7000);assert.equal(good.prepared.formula,'1d+4 cut');
 for(const selection of [{material:'silver',quality:'Fine'},{material:'wood',coating:'silver'},{material:'nonsense'}]){
  const r=await preview('e140WNiazx7pJ3WTT',selection);assert.ok(r.p.readinessReason);
  const before=JSON.stringify(r.a.getFlag('olegurps-qol','meleeProfiles'));
  await assert.rejects(new MeleeProfileService(r.a).save(r.attack,selection));assert.equal(JSON.stringify(r.a.getFlag('olegurps-qol','meleeProfiles')),before);
 }
});
test('M1 imported Fine+Balanced and wood effects are explicit baselines, never doubled',async()=>{
 const a=actor(),{attack}=await weapon(a,'e140WNiazx7pJ3WTT');
 const imported=damageAction({...attack,key:'imported',standaloneRef:undefined,catalogBinding:{modeId:'w0djXNfWD-9ebEkWu'},level:17,damage:'sw+2 cut',sourceDamage:'sw+2 cut'});
 const selection={quality:'Fine',baselineQuality:'Fine',balance:'Balanced',baselineBalance:'Balanced',baselineMaterial:'steel',material:'steel'};
 const unknown=resolveMeleeProfile({actor:a,attack:imported,selection:{quality:'Fine',baselineQuality:'Fine'}});
 assert.equal(unknown.meleeProfile.quality.price,null);assert.equal(unknown.meleeProfile.quality.mass,null);
 const resolved=resolveMeleeProfile({actor:a,attack:imported,selection});assert.equal(resolved.level,17);
 assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:resolved})).formula,'1d+4 cut');
 const wood=resolveMeleeProfile({actor:a,attack:imported,selection:{...selection,material:'wood'}});
 assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:wood})).formula,'1d+3 cr');
 const back=resolveMeleeProfile({actor:a,attack:imported,selection:{...selection,balance:'Normal',quality:'Good'}});
 assert.equal(back.level,16);assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:back})).formula,'1d+3 cut');
 assert.ok(resolveMeleeProfile({actor:a,attack:imported,selection:{balance:'Balanced'}}).readinessReason);
 assert.ok(resolveMeleeProfile({actor:a,attack:imported,selection:{material:'wood'}}).readinessReason);
 assert.ok(resolveMeleeProfile({actor:a,attack:imported,selection:{material:'wood',baselineMaterial:'steel'}}).readinessReason);
 const plasticSelection={...selection,material:'plastic',quality:'Good'};
 const plastic=resolveMeleeProfile({actor:a,attack:imported,selection:plasticSelection});assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:plastic})).formula,'1d+3 cut');
 const html=meleeProfileEditorHTML(meleeProfileContext(a,imported),plasticSelection,String,a,imported);
 assert.ok(html.match(/data-melee-profile="baselineQuality">([\s\S]*?)<\/select>/)[1].includes('value="Fine" selected'));
 const alternate=resolveMeleeProfile({actor:a,attack:imported,selection:{...selection,modeId:'wSyyMVFZwpR_0-Gfi'}});
 assert.equal(alternate.level,17);assert.equal(alternate.meleeProfile.quality.damageBonus,1);
 assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:damageAction({...alternate,sourceDamage:alternate.damage})})).formula,'1d+3 imp');
 const wrongType={...imported,damage:'1d burn',sourceDamage:'1d burn'};
 assert.match(resolveMeleeProfile({actor:a,attack:wrongType,selection}).readinessReason,/тип Damage/);
});
test('M1 state survives reconstruction; same physical weapon only, reset clears all new fields',async()=>{
 const a=actor(),{attack}=await weapon(a,'e140WNiazx7pJ3WTT'),other=await weapon(a,'e140WNiazx7pJ3WTT');
 const system=JSON.stringify(a.system),service=new MeleeProfileService(a);
 await service.save(attack,{quality:'Fine',balance:'Balanced',material:'bone',grip:'reversed',skill:'Broadsword'});
 const saved=resolveMeleeProfile({actor:a,attack:readStandaloneAttack(a,attack.standaloneRef.weaponId,attack.standaloneRef.modeId)});
 assert.equal(saved.meleeProfile.quality.material,'bone');assert.equal(saved.meleeProfile.grip,'reversed');
 await service.save(attack,{quality:'Very Fine'});
 const changed=resolveMeleeProfile({actor:a,attack});assert.equal(changed.meleeProfile.grip,'reversed');assert.equal(changed.meleeProfile.quality.material,'bone');
 assert.equal(changed.meleeProfile.skill.name,'Broadsword');
 assert.equal(resolveMeleeProfile({actor:a,attack:other.attack}).meleeProfile.quality.material,'steel');
 await service.reset(attack);const reset=resolveMeleeProfile({actor:a,attack});assert.equal(reset.meleeProfile.quality.material,'steel');assert.equal(reset.meleeProfile.quality.price,700);
 assert.equal(JSON.stringify(a.system),system);
});
test('M1 legacy/manual damage and independent components are preserved; material changes cannot guess a baseline',async()=>{
 const a=actor(),{attack}=await weapon(a,'e140WNiazx7pJ3WTT');
 const manual={...attack,damage:'1d burn',hasMeleeDamageOverride:true,damageAction:{type:'damage',formula:'1d',damagetype:'burn'}};
 assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:resolveMeleeProfile({actor:a,attack:manual})})).formula,'1d burn');
 assert.match(resolveMeleeProfile({actor:a,attack:manual,selection:{material:'wood'}}).readinessReason,/Ручной/);
 const chain=damageAction(attack);chain.damageAction.next={type:'damage',formula:'1d',damagetype:'burn'};
 const projected=resolveMeleeProfile({actor:a,attack:chain,selection:{material:'bone',quality:'Fine'}});
 assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:projected})).formula,'1d+2 cr, 1d burn');
});
test('M1 frozen Damage survives later material/quality changes and repeated native Damage',async()=>{
 const r=await preview('e140WNiazx7pJ3WTT',{material:'bone',quality:'Fine'}),snapshot=freezeMeleeAttackProfile({actor:r.a,attack:r.p,preparedDamage:r.prepared});
 const encoded=JSON.stringify(snapshot),before=JSON.stringify(r.a.getFlag('olegurps-qol','standaloneWeapons'));
 await new MeleeProfileService(r.a).save(r.attack,{material:'steel',quality:'Very Fine'});
 const old=globalThis.GURPS,calls=[];globalThis.GURPS={DamageChat:{create:async(...args)=>calls.push([args[1],args[2]])}};
 try{for(let i=0;i<2;i++)await executeNativeMeleeDamage({actor:r.a,preparedDamage:{action:snapshot.damage.rules.meleeSnapshot.action}});
 assert.deepEqual(calls,[['1d+2','cr'],['1d+2','cr']]);assert.equal(JSON.stringify(snapshot),encoded);assert.equal(JSON.stringify(r.a.getFlag('olegurps-qol','standaloneWeapons')),before);
 }finally{globalThis.GURPS=old;}
});
test('M1 Reach, Parry and manual situational hints do not block Attack or profile save',async()=>{
 const r=await preview('e140WNiazx7pJ3WTT',{}),attack={...r.attack,reach:'',parry:''};
 assert.equal(resolveMeleeProfile({actor:r.a,attack,selection:{material:'bone'}}).readinessReason,null);
 await new MeleeProfileService(r.a).save(attack,{material:'bone'});
 assert.equal(validateMeleeAttackOverride({skillLevel:16,damage:'1d cut',reach:'',parry:''},null,{requireReach:false}).valid,true);
 assert.equal(resolveMeleeCombatCalculation({actor:r.a,baseSkill:16,weaponBond:true}).effectiveSkill,17);
});
test('M1 material choices respect exact construction/TL; fixed-source modes and unsupported shapes stay safe',async()=>{
 const r=await preview('e140WNiazx7pJ3WTT',{}),p=meleeProfileContext(r.a,r.attack).source;
 assert.ok(!ltMaterialChoices(p).includes('stone'));
 await r.a.setFlag('olegurps-qol','campaignTL',0);assert.ok(!meleeMaterialOptions(r.a,p).includes('iron'));assert.ok(meleeMaterialOptions(r.a,p).includes('wood'));
 assert.ok(!ltMaterialChoices(ltMeleeQualityProfile(catalogs.getEquipment('eV_KnEisbEgxWmZ4Z').modes[0].weapon_mode_id,catalogs)).includes('wood'));
 const urumi=await preview('eV_KnEisbEgxWmZ4Z',{material:'published'},'wo_KNv17YIJJ_jfHC');assert.equal(urumi.prepared.formula,'1d+1(0.5) cut');
 const html=meleeProfileEditorHTML(meleeProfileContext(r.a,r.attack),{},String,r.a,r.attack);
 for(const label of ['Материал','Ограничения материала','Цена:','Масса:'])assert.ok(html.includes(label));
 assert.ok(html.includes('Обычная'));assert.doesNotMatch(html,/>Normal</);
 assert.ok(!html.includes('data-standalone-skill'));
});
test('M1 exact quality/material compatibility matrix covers every declared existing LT equipment',()=>{
 let valid=0,invalid=0;
 for(const [eid,c]of Object.entries(LT_MELEE_CONSTRUCTIONS)){
  const e=catalogs.getEquipment(eid);assert.equal(e.source,'LT');
  for(const mode of e.modes.filter(m=>m.combat_type==='melee'&&m.role==='attack')){
   const p=ltMeleeQualityProfile(mode.weapon_mode_id,catalogs);assert.ok(p&&p.equipmentId===eid);
   for(const material of ltMaterialChoices(p))for(const quality of p.qualityOptions)for(const balance of p.balanceOptions){
    const selection={material,quality:quality.level,balance:balance.level};
    const effect=ltMaterialEffect(p,material);
    if(LT_MATERIALS[material].fixedQuality&&quality.level!=='Good'||effect.allowedQualities&&!effect.allowedQualities.includes(quality.level)){
     assert.throws(()=>resolveMeleeQuality(p,selection));invalid++;continue;
    }
    const r=resolveMeleeQuality(p,selection);assert.ok(Number.isFinite(r.price)&&r.price>=c.cost*LT_MATERIALS[material].costScale*0.2-1e-9);valid++;
   }
  }
 }
 assert.ok(valid>1000);assert.ok(invalid>0);
});
