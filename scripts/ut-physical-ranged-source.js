// GURPS Ultra-Tech (2007), printed UT137-146. Exact existing identities only.
// Source corrections do not change saved Actor overrides or historical shots.
const rows = [
 ['eI3Q0zjULTNcT00ZN','WnaTVcm1lDzdUBdwA','gyroc','15mm_gyroc',10,3],
 ['ekBY23H_nDia71IRM','WBP_BamKPzdsBHOnI','gyroc','15mm_gyroc',6,3],
 ['emY0Nm8yc93sLfoZJ','WqtpFn_3ogNM9oiHv','gyroc','15mm_gyroc',30,10],
 ['eJ8xSpwlE6exVNNz4','W7iIk_4lnXIP5JOOu','gyroc','15mm_gyroc',4,3],
 ['evik07ShWozm6tugt','WC9xrdk8qWqC3tsHh','gyroc','15mm_gyroc',1,1],
 ['e3_Drm7n_RBGLIjJk','WX57fdTm6ELTN3VdA','gyroc','15mm_gyroc',6,3],
 ['eweMBFsNUgBRDkzC3','W3frf9fpZ88nsGZgZ','grav','grav_needler_round',100,4,'B',2],
 ['eiqhK4fMSSfhzcC0H','WjwsSLtRhcz7RDQ3v','grav','grav_needler_round',500,20,'C',1],
 ['ebHQUsAn03woUW7De','WeWDVUcj3u60GEyCq','grav','grav_needler_round',1000,20,'C',1],
 ['ereAvfk4SYfVSH5XX','W8jY2Gu52B-HxBKPY','grav','grav_needler_round',1000,3,'C',2],
 ['eYfjG1bepxV6LDXA8','WzBIC0pLImzKfM4Q2','grav','grav_needler_round',4000,100,'D',1],
 ['eUxasb3wBFxXQVc9O','WsRUP0bIp6--JRDZE','grav','grav_railgun_round',2000,20],
 ['e-q5loJqqU9wDZQzJ','WInB0nYjRLMJm5Ha-','missile','64mm_missile',1,1],
 ['eskcPn3LNmM0tJom4','WuZRkhqwMzX3gyVWL','missile','64mm_missile',1,1],
 ['ecskO6ZiDAiMBHNIM','WHv4EWlz3Tg6-cvQn','missile','64mm_missile',6,1],
 ['enpedPMhDr_Y1fIin','W7v0_whpuR9MtD4tH','missile','64mm_missile',6,1],
 ['ebvdDxUdPQseCIEq-','WpvG7-bGWCtwNOPFf','missile','100mm_missile',1,1],
 ['e4vFn8UBsS3F1ESb-','WNK4gk21iQ4le2Lxr','missile','100mm_missile',1,1],
 ['ef9L7tPyvQNaX6KEh','WIijXG9uGZ52T0eW2','plb','15mm_plb',30,30],
 ['eRiAk8n6saO5wMnrR','W5BEH4zTOtg2ds7is','plb','25mm_pc',3,1],
 ['eJtzLwj5mE8CZuFNj','WATP5TU7jVQnEpqB0','plb','40mm_plb',5,3],
 ['erwk9Fs82GTzfv1rx','W_eUqH082RrEoTPPP','plb','40mm_plb',16,16],
 ['e5bjENSnMI58luL2O','WYpXdcsWIyhNVC6x3','plb','64mm_plb',30,30]
];
export const UT_PHYSICAL_RANGED_PROFILES=Object.freeze(Object.fromEntries(rows.map(([equipmentId,modeId,group,familyId,shots,rof,cellSize=null,cells=0])=>[modeId,Object.freeze({equipmentId,modeId,group,familyId,shots,rof,cellSize,cells,source:group==='grav'?'UT143':group==='gyroc'?'UT144-145':group==='missile'?'UT145-146':'UT137-138'})])));
export const physicalRangedProfile=id=>Object.hasOwn(UT_PHYSICAL_RANGED_PROFILES,id??'')?UT_PHYSICAL_RANGED_PROFILES[id]:null;
export const physicalRangedFamilies=p=>p?.group==='gyroc'?['15mm_gyroc','15mm_micromissile']:p?[p.familyId]:[];
export const UT_GYROC_FAMILIES=Object.freeze(Object.fromEntries(Object.values(UT_PHYSICAL_RANGED_PROFILES).filter(p=>p.group==='gyroc').map(p=>[p.modeId,p.familyId])));
export const UT_MISSILE_FAMILIES=Object.freeze(Object.fromEntries(Object.values(UT_PHYSICAL_RANGED_PROFILES).filter(p=>p.group==='missile').map(p=>[p.modeId,p.familyId])));
export const UT_PLB_FAMILIES=Object.freeze(Object.fromEntries(Object.values(UT_PHYSICAL_RANGED_PROFILES).filter(p=>p.group==='plb').map(p=>[p.modeId,p.familyId])));
export const missileSourceTL=id=>Object.hasOwn(UT_MISSILE_FAMILIES,id??'')?(['WuZRkhqwMzX3gyVWL','W7v0_whpuR9MtD4tH','WNK4gk21iQ4le2Lxr'].includes(id)?10:9):null;
export const physicalFamilyMatches=(modeId,ammoId)=>physicalRangedFamilies(physicalRangedProfile(modeId)).includes(ammoId);
export function physicalRangedType(id,type){
 const p=physicalRangedProfile(id);
 return !!p&&type?.source==='catalog'&&type.book==='ut'&&type.kind==='ammo-family'&&!type.recipe&&physicalRangedFamilies(p).includes(type.ammoId);
}
export function gravDamage(raw,id,weapon,type){
 const p=physicalRangedProfile(id);if(p?.group!=='grav')return null;
 const valid=physicalRangedType(id,type)&&[undefined,'ordinary'].includes(weapon?.executionVariant)&&
  /^\d+d(?:x\d+)?\(10\) imp inc$/.test(String(raw.damage));
 const range=String(raw.range??'').replaceAll(',','').match(/^(\d+)\/(\d+)$/);
 return {status:valid?'resolved':'unresolved',nativeSafe:valid,rawFormula:raw.damage,formula:raw.damage,
  reason:valid?null:'Grav: нужен собственный физический снаряд и штатный imp inc (10), без ETC/LP.',
  components:[{role:'kinetic',status:valid?'resolved':'unresolved',formula:raw.damage}],transformations:[],effectiveChanges:{damage:raw.damage},
  rules:{physicalRanged:{modeId:id,group:'grav',familyId:p.familyId,externalPower:!p.cellSize,source:p.source},ammunitionSource:p.source,
   ballisticRange:{halfDamage:range?Number(range[1]):null,maximum:range?Number(range[2]):null,minimum:null,source:p.source}}};
}
export function projectPhysicalRanged(book,data){
 if(book==='ut'&&data.compatibility_pointer_source_sha256==='cc4d4286bce5eba3936081da60d77a62dee781630c0803cb73fa982fc7723933')return {...data,ammo_families:data.ammo_families.map(f=>['64mm_missile','100mm_missile'].includes(f.id)?{...f,wps_lb:f.id==='64mm_missile'?2:25,cps_usd:f.id==='64mm_missile'?110:440,missile_economics:f.id==='64mm_missile'?{body:100,warhead:10,source:'UT145-146'}:{body:400,warhead:40,source:'UT145-146'}}:f)};
 if(book!=='weapons'||!data.sources?.some(s=>s.code==='UT'&&s.sha256==='21f9ddb6ddc2936d74e5ad781af43a6d3787352172e0e1f74a80d85db7cbf5f1'))return data;
 return {...data,equipment:data.equipment.map(e=>e.source!=='UT'?e:{...e,modes:e.modes.map(m=>{
  const p=physicalRangedProfile(m.weapon_mode_id);if(!p||e.equipment_id!==p.equipmentId)return m;
  const mode=structuredClone(m);
  mode.ut_physical_ranged_source=p;
  const corrections={WBP_BamKPzdsBHOnI:{shots:'6(3)'},WC9xrdk8qWqC3tsHh:{accuracy:'0'},WeWDVUcj3u60GEyCq:{bulk:'-3'},'WHv4EWlz3Tg6-cvQn':{shots:'6(5)'},W7v0_whpuR9MtD4tH:{shots:'6(5)'},WYpXdcsWIyhNVC6x3:{range:'360/3,000'}};
  Object.assign(mode.stats,corrections[p.modeId]);
  if(p.group==='grav'){
   mode.raw_calc.damage=mode.raw_calc.damage.replace(/imp in$/,'imp inc');
   mode.stats.damage.type='imp inc';mode.attack_resolution.raw=mode.raw_calc.damage;
   mode.ammunition_profile.native_weapon_tl='11';
  }
  const skill=p.group==='missile'?{name:'Artillery',specialization:'Guided Missile',modifier:0}:mode.governing_skill.skill;
  mode.governing_skill={status:'resolved',skill,candidates:[skill],basis:p.source+':table-skill-header'};
  mode.governing_skill_selection={strategy:'fixed',candidates:[skill],fallback_attribute:null};
  const artillery=skill.name==='Artillery',gunner=skill.name==='Gunner';
  mode.defaults=[{type:'skill',...skill},{type:artillery?'iq':'dx',modifier:artillery?-5:-4},{type:'skill',name:skill.name,specialization:null,modifier:artillery||gunner||p.group==='gyroc'||['Grenade Launcher','LAW','Light Anti-armor Weapon'].includes(skill.specialization)?-4:-2}];
  return mode;
 })})};
}
