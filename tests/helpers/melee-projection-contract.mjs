import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const fixture=name=>JSON.parse(readFileSync(new URL('../fixtures/'+name+'.json',import.meta.url),'utf8'));
// Independent published vectors from each completed package, never the runtime projector.
export const meleeProjectionVectors=new Map();
for(const name of ['lt-polearms-m23','lt-flexible-exotic-m24','lt-shields-tools-m25','lt-improvised-m26','ht-ordinary-m27','ht-special-m28'])
 for(const r of fixture(name).modes)meleeProjectionVectors.set(r.modeId,{...r.expected,equipmentId:r.equipmentId});
for(const [id,damage,,reach,parry,st,,skill] of fixture('ut-ordinary-m29').modes)
 meleeProjectionVectors.set(id,{damage,reach,parry,st,skills:[skill]});
for(const row of fixture('ut-exotic-m210').rows)for(const m of row.modes)
 meleeProjectionVectors.set(m.modeId,{...m,equipmentId:row.equipmentIds[0]});
// UT164 rigid C is R=0. The published overall reach becomes explicit same-item modes.
for(const [base,max]of [['wAtyEWpMeFPCyRNj8',5],['w17DvILEf9UF-N1G2',30]])for(let r=0;r<=max;r++)
 meleeProjectionVectors.set(base+(r?'R'+r:''),{damage:'sw+1d'+(r?'+'+r:'')+'(10) cut',reach:String(r||'C'),parry:'0',st:'5'});
for(const id of ['woh9pKqeZecuJZ_6a','w9NE7eo1a5TicfmpW','wXIUigU9a9ScSXIFY']){
 const base=meleeProjectionVectors.get(id);
 meleeProjectionVectors.set(id+'Taut',{damage:'thr+1d(10) cut',reach:base.reach,parry:base.parry,st:base.st});
}
// UT164-165: mechanical punch and electrical contact are distinct actions.
for(const id of ['wLvyrIKx1rFymywbZ','w8xpTbHH1oVDkHOYb','wYzmoafHusruaKOBV']){
 const base=meleeProjectionVectors.get(id);
 meleeProjectionVectors.set(id+'Punch',{damage:'thr-1 cr',reach:'C',parry:base.parry,st:null});
 meleeProjectionVectors.set(id+'Contact',{...base});
}
// UT163/165/199/201: affliction and mine delivery are instructions, never fake
// numeric Damage. B271 supplies the unarmed punch, with no published device ST.
for(const id of ['wYAiwn5_8ozYs2iaT','wLvyrIKx1rFymywbZ','wLvyrIKx1rFymywbZContact','w8xpTbHH1oVDkHOYb','w8xpTbHH1oVDkHOYbContact'])
 Object.assign(meleeProjectionVectors.get(id),{damage:'spec.'});
for(const id of ['wYAiwn5_8ozYs2iaT','wUBUyZIpRJ52lW_v4'])Object.assign(meleeProjectionVectors.get(id),{parry:'No'});
export const extraMeleeProjectionIds=new Set(['wLTM22RoundMaceTwoHanded','WHTM28CondorTonfaFired',
 ...['disposablehypo','stinger','fireextinguishertube','smallfireextinguisher','largefireextinguisher'].map(id=>'wUTM210'+id)]);
export function assertMeleeVector(mode,expected){
 for(const [field,key]of [['reach','reach'],['parry','parry'],['strength','st']])
  assert.equal(field==='parry'&&String(expected[key]).toLowerCase()==='no'?String(mode.stats[field]).toLowerCase():mode.stats[field],expected[key]?.toLowerCase?.()==='no'?'no':['–','—'].includes(expected[key])?null:expected[key],mode.weapon_mode_id+'/'+field);
 // HT180 prints "spec."; the imported affliction preserves the actual HT
 // check. It must not become a numeric Damage roll.
 const spray={'wphfSIVv80OHomve0':'HT-4 aff','w6R_sr11lEsrygm0K':'HT-2 aff'};
 assert.equal(mode.raw_calc.damage,spray[mode.weapon_mode_id]??(expected.damage==='varies'?'spec.':expected.damage),mode.weapon_mode_id+'/damage');
}
export function assertHTEquipmentProjection(source,projected){
 const vectors=[...meleeProjectionVectors].filter(([,v])=>v.equipmentId===source.equipment_id);
 const expectedIds=[...new Set([...source.modes.map(m=>m.weapon_mode_id),...vectors.map(([id])=>id)])];
 assert.deepEqual(projected.modes.map(m=>m.weapon_mode_id).sort(),expectedIds.sort(),source.equipment_id);
 const outer=structuredClone(projected);outer.modes=source.modes;
 if(source.equipment_id==='eW-zph_pMipl-ErCS'){assert.equal(outer.tech_level,'8');outer.tech_level=source.tech_level;}
 assert.deepEqual(outer,source);
 for(const mode of projected.modes){
  const original=source.modes.find(m=>m.weapon_mode_id===mode.weapon_mode_id),v=meleeProjectionVectors.get(mode.weapon_mode_id);
  if(v)assertMeleeVector(mode,v);
  if(!original)continue;
  const rest=structuredClone(mode),before=structuredClone(original);
  // Only these explicitly source-reviewed projection fields may change. Numeric
  // fields above are checked against the independent books, remaining bytes below.
  const work=new Set(['w97_uEiMUqcFVpfJ-','wOHIhliBGjYJKge6m','wkuw7NCOcOmCIFJlp','wYstTcATjL8Paidyz','wflnXSn-N842a_IQ6','wSLBM4cOvxbGUGddB','wdNSXATftsRhxldVJ','wxBDv-EZaY9iEhu-A','wM-IloFzOSMLUuolU','wj3S12NiNIJQ6W6x8','wVie_2KxErcQeMUaG']);
  const manual=new Set(['w2uQGgZgiAttL8mUW','wfOCX_cDFRtppD4ho','wYvizjnX_9onLGz0r','w5gv4Zv-oWZPw70GH','wXitVL4CJ4wd1voVt','we9yVuhNPGxUIX_Lu','w8mmrGW56Da1k957n','wXCf8TTnL3ChVwPZK','wRjKTnJ1unBHcEWh8']);
  const hidden=work.has(mode.weapon_mode_id)||['wUiL6pRkKH21K5hQ-','wVJHviRFdF9HsPock'].includes(mode.weapon_mode_id);
  const combined=['Wx10NaVSr1cp1bwKv','WkzlenFdgtlwesK-q','W1RtCz7rsBdesoNIt','Wr_7MnorYDlPSb2qW'].includes(mode.weapon_mode_id);
  const keys=v?['governing_skill','governing_skill_selection','defaults','melee_source_id','hand_use','usage','ht_ordinary_contract','ht_special_contract','ht_combined_equipment_id','ht_tool_manual']:[];
  if(v?.skills){assert.deepEqual(mode.governing_skill.candidates.map(s=>s.name),v.skills);assert.equal(mode.governing_skill.attack_modifier,v.penalty??(['wICNkuQO9i_FxUxf4','wk0vCihcCMUm3nBat'].includes(mode.weapon_mode_id)?-1:0),mode.weapon_mode_id+'/direct penalty');}
  if(hidden){assert.equal(mode.hidden,true);keys.push('hidden');}
  if(work.has(mode.weapon_mode_id)){assert.equal(mode.ht_work_only,true);assert.match(mode.ht_tool_manual,/HT(?:27|30)/);keys.push('ht_tool_manual','ht_work_only');}
  if(manual.has(mode.weapon_mode_id)){assert.match(mode.ht_tool_manual,/HT25/);keys.push('ht_tool_manual');}
  if(combined){assert.equal(mode.ht_combined_equipment_id,source.equipment_id);keys.push('ht_combined_equipment_id');}
  for(const key of keys){delete rest[key];delete before[key];}
  if(v){for(const k of ['damage','reach','parry','strength']){delete rest.stats[k];delete before.stats[k];}delete rest.raw_calc.damage;delete before.raw_calc.damage;}
  if(mode.weapon_mode_id==='Wr_7MnorYDlPSb2qW'){assert.equal(rest.stats.accuracy,'0');rest.stats.accuracy=before.stats.accuracy;}
  assert.deepEqual(rest,before,mode.weapon_mode_id+' unaffected fields');
 }
}
export function expectedHTAmmoProjection(source){
 const result=structuredClone(source),ids=['ht_12_gauge_2_75_18_5x70mmr','ht_12_gauge_2_75_18_5x70mmr_heavy_load'];
 for(const a of result.ammo_items)if(ids.includes(a.id))for(const key of ['weapon_mode_ids','compatible_weapon_mode_ids'])if(Array.isArray(a[key]))a[key].push('WHTM28CondorTonfaFired');
 for(const f of result.ammo_families)if(f.ammo_item_ids.some(id=>ids.includes(id)))f.compatible_weapon_mode_ids.push('WHTM28CondorTonfaFired');
 return result;
}
