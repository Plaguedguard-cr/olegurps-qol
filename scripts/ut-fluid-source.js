// Printed UT134; original equipment/mode identities. Actor overrides and shots are not rewritten.
const rows=[
 ['eX-etcj5LJvUYagdH','W8SYi-R8B4aFolQUw','Pocket Aerosol',1,1,1,'Jet','1','-1','1',0,10],
 ['eoxz7D2WloB6O857w','WpAt6DyOnZkKbNfJr','Spray Can',10,3,2,'Jet','2','-2','10(5)',1,25],
 ['e49dEmc9T8KpD3kvU','WXki2UKT5ScYY4QsY','Spray Tank',10,1,3,'Jet','4','-4','10(5)',1,400],
 ['eZgtfzie082XytpwP','WbujzAgEOegkakUSr','Vortex Pistol',5,1,15,'2','7','-2','5(3)',1,100],
 ['ePqji5jQUAFUVUYz9','WVP2b1TCXvqHt6azn','Underbarrel Vortex Projector',10,1,'20/40','2',null,null,'10(3)',1,150],
 ['eovLuCPS-d4LIExeV','WUGCA3bH9obniRWDA','Backpack Vortex Projector',10,1,30,'3','10†','-4','10(5)',2,1200]
];
export const UT_FLUID_PROFILES=Object.freeze(Object.fromEntries(rows.map(([equipmentId,modeId,name,capacity,maxDoses,range,acc,st,bulk,shots,radius,cost],i)=>[modeId,Object.freeze({equipmentId,modeId,name,capacity,maxDoses,range:String(range),acc,st,bulk,shots,radius,cost,vortex:i>=3,disposable:i===0,underbarrel:i===4,source:'UT134'})])));
export const fluidProfile=id=>UT_FLUID_PROFILES[id]??null;
export function projectFluidCatalog(book,data){
 if(book!=='weapons'||!data.sources?.some(s=>s.code==='UT'&&s.sha256==='21f9ddb6ddc2936d74e5ad781af43a6d3787352172e0e1f74a80d85db7cbf5f1'))return data;
 return {...data,equipment:data.equipment.map(e=>!Object.values(UT_FLUID_PROFILES).some(p=>p.equipmentId===e.equipment_id)?e:{...e,modes:e.modes.map(m=>{
  const p=fluidProfile(m.weapon_mode_id);if(!p)return m;
  return {...m,ut_fluid_source:p,stats:{...m.stats,strength:p.st,bulk:p.bulk,range:p.range,accuracy:p.acc,rate_of_fire:'1',shots:p.shots}};
 })})};
}
