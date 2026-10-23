// UT2007 pp.19,112,130-131. Derived identities belong to the module, not GCS.
const rows=[
 ['W4yJwMr6Mpwa6xuwm','eFQ4LGzBTp2axZVpi','Holdout Disintegrator','7dx5', 'C',1,17,3,500,1500,'3','-1',1,1500,2,3,'Pistol'],
 ['WQPTYeVI4ujIqE9IH','eacchVj0nccOPAfov','Disintegrator Pistol','6dx6','C',2,22,6,1000,3000,'4','-2',2.5,5000,2,3,'Pistol'],
 ['W0A-OIRPWhv3diaf3','e_jrWGRs-I78G5s2R','Disintegrator Rifle','6dx7','C',2,10,12,5000,15000,'5†','-3',5.6,4600,1,3,'Rifle'],
 ['W_d6J_8tB6aA5R8gO','ewA6ULxWfkFQXNs0-','Light Disintegrator Cannon','6dx100','F',1,66,18,180000,540000,'70M','-10',1000,5000000,0,5,'Beams'],
 ['WTgaB9t7gvQYidQYK','eHaGTj_Ly2eLtgCxk','Heavy Disintegrator Cannon','6dx200','F',10,83,18,720000,2200000,'200M','-10',8000,40000000,0,5,'Beams'],
 ['WyNriokrNdF8bSm6R','eAp3jZx90SjGRaaZX','Semi-Portable Disintegrator','6dx40','E',1,100,18,30000,90000,'18M','-8',70,320000,1,5,'Beams']
];
export const DISINTEGRATOR_PROFILES=Object.freeze(Object.fromEntries(rows.flatMap(([modeId,equipmentId,name,dice,cellSize,cells,shots,acc,halfRange,maximum,st,bulk,weightLb,cost,lc,reload,specialty])=>
 ['disintegrator','conversion','reality'].map(family=>{
  const derived=family!=='disintegrator',id=derived?'olegurps:'+family+':'+modeId:modeId;
  return [id,Object.freeze({modeId:id,equipmentId:derived?'olegurps:'+family+':'+equipmentId:equipmentId,chassisEquipmentId:equipmentId,chassisModeId:modeId,
   name:derived?(family==='conversion'?'Conversion Beam':'Reality Disintegrator')+' — '+name:name,family,tl:'12^',cellSize,cells,shots,acc,halfRange,maximum,rof:10,st,bulk,weightLb,cost,lc,reload,specialty,
   cellCost:({C:10,E:2000,F:20000}[cellSize])*100,cellSetCost:({C:10,E:2000,F:20000}[cellSize])*100*cells,
   damage:dice+(family==='conversion'?'(10) cor':'(∞) cor'),followUp:dice+' burn ex',cosmic:true,source:derived?'UT130–131':'UT130'})];
 }))));
export function projectDisintegratorConstructions(data){
 const equipment=[...data.equipment];
 for(const p of Object.values(DISINTEGRATOR_PROFILES).filter(p=>p.family!=='disintegrator')){
  if(equipment.some(e=>e.equipment_id===p.equipmentId))continue;
  const chassis=equipment.find(e=>e.equipment_id===p.chassisEquipmentId);if(!chassis)throw Error('Missing UT130 chassis '+p.chassisEquipmentId);
  const e=structuredClone(chassis);e.equipment_id=p.equipmentId;e.name=p.name;e.reference=p.source;
  e.derived_from={equipmentId:p.chassisEquipmentId,modeId:p.chassisModeId,source:'UT131',moduleIdentity:true};
  e.modes=e.modes.filter(m=>m.weapon_mode_id===p.chassisModeId).map(m=>({...m,weapon_mode_id:p.modeId,
   raw_calc:{...m.raw_calc,damage:p.damage},stats:{...m.stats,damage:{base:p.damage.split('(')[0],type:p.family==='conversion'?'(10) cor':'(∞) cor'}}}));equipment.push(e);
 }
 return {...data,equipment};
}
