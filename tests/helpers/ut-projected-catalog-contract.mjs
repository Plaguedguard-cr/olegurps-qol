import assert from 'node:assert/strict';

// Independently reviewed identities, not counts read back from production tables.
// UT142 transcriptions; six UT130 chassis with UT131 Conversion/Reality rules;
// UT64/113-114,65/121,168-169 module identities from the approved Next Eleven audit.
const gauss=[['eUT2007GaussNeedler3mm','WUT2007GaussNeedler3mm','3mm_em'],['eUT2007GaussPDW4mm','WUT2007GaussPDW4mm','4mm_em']];
const chassis=[['eFQ4LGzBTp2axZVpi','W4yJwMr6Mpwa6xuwm'],['eacchVj0nccOPAfov','WQPTYeVI4ujIqE9IH'],
 ['e_jrWGRs-I78G5s2R','W0A-OIRPWhv3diaf3'],['ewA6ULxWfkFQXNs0-','W_d6J_8tB6aA5R8gO'],
 ['eHaGTj_Ly2eLtgCxk','WTgaB9t7gvQYidQYK'],['eAp3jZx90SjGRaaZX','WyNriokrNdF8bSm6R']];
const next=[['eUTMilitaryLadarSmall','WUTMilitaryLadarSmall'],['eUTMilitaryLadarMedium','WUTMilitaryLadarMedium'],
 ['eUTMilitaryLadarLarge','WUTMilitaryLadarLarge'],['eUTMilitaryLadarSmartskin','WUTMilitaryLadarSmartskin'],
 ['eUTTacticalAESA','WUTTacticalAESA'],['eUTHunterMissile','WUTHunterMissile'],['eUTStrikerMissile','WUTStrikerMissile'],
 ['eUTFloaterMissile','WUTFloaterMissile'],['eUTSmartShuriken','WUTSmartShuriken']];
// LT-P3 adds these source transcriptions alongside the independent UT projection.
const lt=[['Pilum','PilumThrown'],['Angon','AngonThrown'],['Footwear','FootwearThrown'],
 ['Caltrop','CaltropThrown'],['Piton','PitonThrown'],['BlowpipePowder','BlowpipePowder'],
 ['Metsubushi','MetsubushiPowder'],['GrapplingHook','GrapplingHook'],['PaddedGrapplingHook','PaddedGrapplingHook']]
 .map(([e,m])=>['eLTP3'+e,'WLTP3'+m]);
// UT127-128: each model has its own physical cartridge. UT133 Hot excludes the
// two Gatling models; these IDs assert boundaries, not a published shared caliber.
const plasma=[['eUwiutML2-xkfJWWh','W42mmtM2Oihtfy08e',true],['eBGZsm_PP8XiNEWoP','Wrb5_sR1KSduU7rrt',true],
 ['eqxaQbUiJiwWXBnjs','WHs5Yz2afrKml6XgG',true],['eWbtKKChDGkfk1Shm','Wdw5CaMp83KiQ4UTJ',true],
 ['e-7_T84gq2Yfvorui','W6qqfh7aOIrsrLtoE',true],['eGCjfmC2kfzkEs64a','WJeubh-KpBhPFl4Os',true],
 ['eZefpjy-dK_VFwABw','WMnfmbUMEqiNT0FVI',false],['eFndVnjm3zOMjj1KO','W9K1UUxW-nbT2uD_3',true],
 ['e7Mft8MiyBUm7ODkP','W6Egpk7c3gUzZxExi',true],['eI7-2g5Wl-qjliCEb','W7-OzPpG-_md0YJ6-',false],
 ['exWzKs75nBF02nSuI','WPffX2YxnxTGpJKdC',true]];
export function assertProjectedUTCatalog(catalogs,sourceWeapons,sourceUT){
 const sourceIds=new Set(sourceWeapons.equipment.map(e=>e.equipment_id));
 const derived=chassis.flatMap(([e,m])=>['conversion','reality'].map(f=>['olegurps:'+f+':'+e,'olegurps:'+f+':'+m]));
 const expected=[...gauss.map(([e,m])=>[e,m]),...derived,...next,...lt];
 const equipment=catalogs.getCatalog('weapons').equipment,added=equipment.filter(e=>!sourceIds.has(e.equipment_id));
 assert.equal(sourceWeapons.equipment.length,1152);assert.equal(expected.length,32);
 assert.deepEqual(added.map(e=>[e.equipment_id,e.modes.map(m=>m.weapon_mode_id)]).sort(),expected.map(([e,m])=>[e,[m]]).sort());
 assert.equal(equipment.length,1184);assert.equal(new Set(equipment.map(e=>e.equipment_id)).size,equipment.length);
 for(const [e,m]of lt){assert.equal(catalogs.getEquipment(e).source,'LT');assert.equal(catalogs.getMode(m).role,'attack');}
 const modeIds=equipment.flatMap(e=>e.modes.map(m=>m.weapon_mode_id));assert.equal(new Set(modeIds).size,modeIds.length);
 for(const [e,m]of chassis)for(const f of ['conversion','reality']){
   const d=catalogs.getEquipment('olegurps:'+f+':'+e);
   assert.ok(sourceIds.has(e));assert.ok(sourceWeapons.equipment.find(r=>r.equipment_id===e).modes.some(r=>r.weapon_mode_id===m));
   assert.deepEqual(d.derived_from,{equipmentId:e,modeId:m,source:'UT131',moduleIdentity:true});assert.equal(d.reference,'UT130–131');
 }
 for(const [e,m]of next){assert.equal(catalogs.getEquipment(e).source,'UT');assert.equal(catalogs.getMode(m).role,'attack');}
 const edge=(family,link)=>[family.id,link.equipment_id,link.weapon_mode_id].join('/');
 const original=sourceUT.ammo_families.flatMap(f=>f.linked_weapon_modes.map(l=>edge(f,l)));
 const families=catalogs.getCatalog('ut').ammo_families,edges=families.flatMap(f=>f.linked_weapon_modes.map(l=>edge(f,l)));
 const extra=[...gauss.map(([e,m,f])=>[f,e,m]),...plasma.flatMap(([e,m,hot])=>['standard',...(hot?['hot']:[])].map(s=>['olegurps:plasma-cartridge:'+m+':'+s,e,m])),
   ['smart_shuriken_robot','eUTSmartShuriken','WUTSmartShuriken']].map(v=>v.join('/'));
 assert.equal(original.length,85);assert.equal(extra.length,23);assert.equal(new Set(edges).size,edges.length);
 assert.deepEqual([...edges].sort(),[...original,...extra].sort());assert.equal(edges.length,108);
 assert.equal(new Set(families.flatMap(f=>f.linked_weapon_modes.map(l=>l.weapon_mode_id))).size,93);
 for(const [e,m,hot]of plasma){
   const mode=catalogs.getMode(m);assert.equal(catalogs.getEquipmentForMode(m).equipment_id,e);
   assert.equal(mode.ammunition_profile.supports_exotic_warheads,false);
   for(const s of ['standard',...(hot?['hot']:[])]){
     const id='olegurps:plasma-cartridge:'+m+':'+s,f=catalogs.getAmmoFamily('ut',id);
     assert.equal(f.provenance.identity,'module-model-bound-cartridge');assert.equal(f.provenance.interchangeability,'not-established');
     assert.equal(f.source_ref,s==='hot'?'UT127,133':'UT127–128');
     assert.ok([mode.ammunition_profile.primary_ammo_family_id,...mode.ammunition_profile.alternate_ammo_family_ids].includes(id));
   }
   if(!hot)assert.equal(catalogs.getAmmoFamily('ut','olegurps:plasma-cartridge:'+m+':hot'),null);
 }
 assert.equal(families.length,sourceUT.ammo_families.length+21);
 return {equipment:1184,extraEquipment:expected.map(([id])=>id).sort(),families:57,edges:108,linkedModes:93};
}
