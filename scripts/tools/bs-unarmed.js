import {resolveStrengthDamage} from './strength-service.js';
import {withActorResourceWrite} from './actor-resource-writes.js';
import {getAttackOverrideKey} from './weapon-attack-overrides.js';
import {WeaponListVisibility} from './weapon-list-visibility.js';
import { naturalWeaponStrength } from './melee-weapon-strength.js';

// Basic Set 4e, printed pages. Body profiles are projections, never GGA Items.
export const BS_UNARMED = Object.freeze({
 punch:{name:'Punch',damage:'thr-1 cr',reach:'C',parry:'0',skills:['DX','Brawling','Boxing','Karate'],pages:['B182','B203','B271','B274'],part:'hand'},
 kick:{name:'Kick',damage:'thr cr',reach:'C, 1',parry:'No',skills:['DX','Brawling','Karate'],penalty:-2,pages:['B182','B203','B271','B274'],part:'foot'},
 boots:{name:'Kick with Boots',damage:'thr+1 cr',reach:'C, 1',parry:'No',skills:['DX','Brawling','Karate'],penalty:-2,pages:['B271','B274'],part:'accessory'},
 bite:{name:'Bite',damage:'thr-1 cr',reach:'C',parry:'No',skills:['DX','Brawling'],pages:['B91','B182','B271'],part:'teeth'}
});
// Exact GCS Ultra Tech equipment identities, individually verified TL9/10/11/12.
export const GRIPBOOTS_EQUIPMENT_IDS=Object.freeze(['eLSIMa6gfZB_ag_HF','eYYhXMKdB2poHHb1-','e4GAp7wAVkNfpGv16','eq_SDjBvaD5Vn824L']);
const clean=v=>String(v??'').normalize('NFKC').trim();
const key=v=>clean(v).toLowerCase();
function entries(tree){const out=[];for(const v of Object.values(tree??{})){if(!v||typeof v!=='object')continue;out.push(v);out.push(...entries(v.contains),...entries(v.collapsed));}return out;}
const aliases={brawling:['brawling','драка'],boxing:['boxing','бокс'],karate:['karate','каратэ']};
export function unarmedSkills(actor,profile){
 const dx=Number(actor?.system?.attributes?.DX?.value),learned=entries(actor?.system?.skills);
 return profile.skills.map(name=>{
  const e=name==='DX'?null:learned.filter(e=>(aliases[key(name)]??[key(name)]).includes(key(e.name))&&(Number(e.points)>0||e.learned===true)&&Number(e.level??e.import)>0).sort((a,b)=>Number(b.level??b.import)-Number(a.level??a.import))[0];
  const level=name==='DX'?dx:e?Number(e.level??e.import):null;
  // GGA's level is the prepared learned level, before maneuver/location penalties.
  return {name,resolved:Number.isFinite(level)&&level>0,level,baseLevel:level,dx,learned:!!e,source:name==='DX'?'attribute-roll':'learned',key:'bs-unarmed:'+name};
 });
}
export function unarmedBonus(skill){
 if(!skill?.learned||!Number.isFinite(skill.dx)||!Number.isFinite(skill.baseLevel))return 0;
 const r=skill.baseLevel-skill.dx;
 return skill.name==='Brawling'?(r>=2?1:0):skill.name==='Boxing'?(r>=2?2:r>=1?1:0):skill.name==='Karate'?(r>=1?2:r>=0?1:0):0;
}
function traits(actor){return entries(actor?.system?.ads).filter(e=>e.disabled!==true&&e.active!==false);}
const has=(actor,names)=>traits(actor).some(e=>names.includes(key(e.name)));
function naturalProfiles(actor){
 const out=[];
 const clawKinds=[['blunt-claws',['blunt claws','claws (blunt claws)','тупые когти'],['cr'],1],['hooves',['hooves','claws (hooves)','копыта'],['cr'],1],['sharp-claws',['sharp claws','claws (sharp claws)','острые когти'],['cut'],0],['talons',['talons','claws (talons)','когти-клинки'],['cut','imp'],0],['long-talons',['long talons','claws (long talons)','длинные когти-клинки'],['cut','imp'],1]];
 for(const [id,names,types,perDie]of clawKinds)if(has(actor,names))for(const limb of id==='hooves'?['kick']:['punch','kick'])for(const type of types){const base=BS_UNARMED[limb];out.push({id:id+'-'+limb+'-'+type,...base,name:(id==='hooves'?'Hooves':names[0].replace(/\b\w/g,c=>c.toUpperCase()))+' – '+base.name+' ('+type+')',nativeNames:names,nativeModes:limb==='kick'?['kick']:type==='imp'?['stab']:['punch','slash'],damage:limb==='punch'?'thr-1 '+type:'thr '+type,skills:['DX','Brawling'],part:'claws',naturalPerDie:perDie,pages:['B42','B43','B182','B203','B271','B274']});}
 for(const [id,names,type]of [['sharp-teeth',['sharp teeth','teeth (sharp teeth)','острые зубы'],'cut'],['fangs',['fangs','teeth (fangs)','клыки'],'imp'],['sharp-beak',['sharp beak','teeth (sharp beak)','острый клюв'],'pi+']])if(has(actor,names))out.push({id,...BS_UNARMED.bite,name:names[0].replace(/\b\w/g,c=>c.toUpperCase()),nativeNames:names,nativeModes:['bite','peck'],damage:'thr-1 '+type});
 // A Striker's type is mandatory. Modifiers with reach/arc/ST effects require an existing GGA row.
 for(const e of traits(actor)){
  const match=/^striker\s*\((crushing|piercing|large piercing|cutting|impaling)\)$/i.exec(clean(e.name))??/^(crushing|piercing|large piercing|cutting|impaling) striker\s*\([^()]+\)$/i.exec(clean(e.name));
  if(!match||clean(e.notes)||clean(e.modifier)||Object.values(e.modifiers??{}).some(m=>m.disabled!==true))continue;
  const type={crushing:'cr',piercing:'pi','large piercing':'pi+',cutting:'cut',impaling:'imp'}[key(match[1])];
  out.push({id:'striker-'+type,name:clean(e.name),nativeNames:[key(e.name)],nativeModes:['','strike'],damage:'thr '+type,reach:'C',parry:'0',skills:['DX','Brawling'],naturalPerDie:1,pages:['B88','B182','B271'],part:'striker'});
 }
 return out;
}
const nativeNames={punch:['punch','кулак','удар кулаком'],kick:['kick','удар ногой'],boots:['kick with boots','kick w. boots','kick (boot)','kick (boots)'],bite:['bite','blunt teeth','укус']};
function nativeProfile(attack,profiles){
 // Exact attack identity only; a physical accessory or implant must never become a body part.
 if(attack.standaloneRef||attack.equipmentRef)return null;
 const name=key(attack.name),mode=key(attack.mode);
 const nativeType=clean(attack.damage).split(',')[0].trim().match(/\s+(cr|cut|imp|pi\+)(?:\s|$)/)?.[1];
 for(const limb of ['punch','kick'])if(nativeNames[limb].includes(name)&&(!mode||nativeNames[limb].includes(mode))){
  const claw=profiles.find(p=>p.part==='claws'&&p.id.includes('-'+limb+'-')&&p.damage.endsWith(' '+nativeType));if(claw)return claw;
 }
 if(nativeNames.bite.includes(name)&&(!mode||nativeNames.bite.includes(mode))){
  const type=clean(attack.damage).split(',')[0].trim().split(/\s+/).at(-1);
  const teeth=profiles.find(p=>p.part==='teeth'&&p.damage.endsWith(' '+type));if(teeth)return teeth;
 }
 for(const [id,names]of Object.entries(nativeNames))if(names.includes(name)&&(!mode||names.includes(mode)))return profiles.find(p=>p.id===id);
 return profiles.find(p=>(key(p.name)===name&&(!mode||mode===name))||(p.nativeNames?.includes(name)&&p.nativeModes?.includes(mode)));
}
export function collectUnarmedAttacks(actor,attacks,{includeAvailable=false,user=globalThis.game?.user}={}){
 const natural=naturalProfiles(actor),profiles=[...Object.entries(BS_UNARMED).filter(([id])=>id!=='bite'||!natural.some(p=>p.part==='teeth')).map(([id,p])=>({id,...p})),...natural];
 const gear=entries(actor?.system?.equipment?.carried);
 const gripboots=gear.find(e=>GRIPBOOTS_EQUIPMENT_IDS.includes(clean(e.originaluuid)||clean(e.uuid))&&e.equipped===true&&Number(e.count??1)>0);
 if(gripboots)profiles.push({id:'gripboots',...BS_UNARMED.kick,name:'Kick – Gripboots',part:'accessory',equipmentId:clean(gripboots.originaluuid)||clean(gripboots.uuid),instanceId:clean(gripboots.uuid),naturalPerDie:1,pages:['UT75','UT173','B182','B203','B271'],nativeNames:['gripboots'],nativeModes:['kick']});
 const covered=new Set(),result=attacks.map(attack=>{const p=nativeProfile(attack,profiles);if(!p)return attack;covered.add(p.id);for(const limb of ['punch','kick'])if(p.part==='claws'&&nativeNames[limb].includes(key(attack.name)))covered.add(limb);return {...attack,unarmedRef:{id:p.id,profile:p,native:true},manualSourceHint:unarmedHint(p)};});
 // Existing GGA natural profiles suppress only their exact counterpart.
 const selected=new Set(new WeaponListVisibility(actor,user).manualProfiles());
 for(const p of profiles)if(!covered.has(p.id)&&(includeAvailable||selected.has(p.id))){
  const skill=unarmedSkills(actor,p).find(s=>s.name==='DX'),level=skill?.level??0;
  const id='bs-unarmed:'+p.id;
  const reference={path:id,uuid:id,name:p.name,label:p.name,mode:p.name,level,damage:p.damage,sourceDamage:p.damage,reach:p.reach,parry:p.parry,st:'',unarmedRef:{id:p.id,profile:p,native:false},manualSourceHint:unarmedHint(p),data:{name:p.name,mode:p.name,level,damage:p.damage,reach:p.reach,parry:p.parry,pageref:p.pages.join('; ')}};
  reference.key=getAttackOverrideKey(reference);result.push(reference);
 }
 return result;
}
export const unarmedSelection=(actor,attack)=>actor?.getFlag?.('olegurps-qol','meleeProfiles')?.profiles?.['attack:'+encodeURIComponent(attack.key).replaceAll('.','%2E')]??{};
function selectedDamage(attack,p){
 if(!attack.unarmedRef.native)return p.damage;
 const raw=attack.sourceDamage??attack.damage,parts=clean(Array.isArray(raw)?raw.join(', '):raw).split(',');
 const main=/^(.*?)\s+(cr|cut|imp|pi\+)(.*)$/.exec(parts[0]),base=/^(\S+)\s+(\S+)$/.exec(p.damage);
 const divisor=main?.[1].match(/\(-?(?:\d+(?:\.\d*)?|\.\d+)\)/)?.[0]??'',minimum=main?.[1].endsWith('!')?'!':'';
 return base[1]+divisor+minimum+' '+base[2]+(main?.[2]===base[2]?main[3]:'')+(parts.length>1?', '+parts.slice(1).map(clean).join(', '):'');
}
export function resolveUnarmedAttack(actor,attack,selection=unarmedSelection(actor,attack)){
 const ref=attack?.unarmedRef;if(!ref)return attack;
 const p=ref.profile,skills=unarmedSkills(actor,p),native=ref.native&&!selection.skill;
 const skill=native?{resolved:true,name:'GGA',level:attack.level,source:'gga-imported-total'}:skills.find(s=>s.name===(selection.skill||'DX'));
 const enc=skill?.name==='Karate'?Number(Object.values(actor?.system?.encumbrance??{}).find(e=>e.current)?.level??0):0;
 const level=attack.meleeManualOverride?.skillLevel??(native?attack.level:skill?.resolved?skill.level+(p.penalty??0)-enc:null);
 const preserveDamage=native||attack.hasMeleeDamageOverride===true;
 const damage=preserveDamage?attack.damage:selectedDamage(attack,p);
 const strength=resolveStrengthDamage(actor,'thrust',{applyArmST:attack.applyArmST===true});
 const dice=Number(/^(\d+)d/.exec(strength.baseFormula??'')?.[1]??0);
 const bonusPerDie=preserveDamage?0:unarmedBonus(skill),naturalPerDie=preserveDamage?0:p.naturalPerDie??0;
 const parryLevel=p.part==='striker'?Math.max(skill?.level??0,Number(actor?.system?.attributes?.DX?.value)||0):skill?.level??0;
 const parry=attack.meleeManualOverride?.parry??(p.parry==='No'?'No':native?attack.parry:String(Math.floor(parryLevel/2)+3-enc));
 const evidence={id:p.id,part:p.part,equipmentId:p.equipmentId??null,instanceId:p.instanceId??null,nativeSource:ref.native,selectedSkill:native?'GGA':skill?.name,baseSkill:skill?.baseLevel??null,dx:skill?.dx??null,attackPenalty:p.penalty??0,encumbrancePenalty:enc,baseThrust:strength.baseFormula,baseThrustDice:dice,bonusPerDie,naturalPerDie,totalBonus:dice*(bonusPerDie+naturalPerDie),alreadyIncluded:native,manualDamage:attack.hasMeleeDamageOverride===true,pages:p.pages};
 return {...attack,level,damage,parry,skillDescription:native?'Исходный итог GGA':(skill?.name??selection.skill)+': '+level,
  readinessReason:skill?.resolved?null:'Выбранный навык не изучен; выберите DX или изученный навык.',
  meleeProfile:{unarmed:evidence,skill,weaponStrength:naturalWeaponStrength(actor,attack),motion:/^thr/.test(damage)?'thrust':'fixed',attackType:p.penalty===-2?'kick':'unarmed',sourcePages:p.pages,strength:{maximumST:null},manualHints:[unarmedHint(p),unarmedParryHint(p,skill)].filter(Boolean),conditions:[],gripEffects:{}},
  data:{...attack.data,level,damage,parry}};
}
export function unarmedParryHint(p,skill){
 if(p.parry==='No')return '';
 if(p.part==='striker')return 'Striker парирует как оружие; используется лучшее из DX/2+3 и Brawling Parry (B88).';
 if(skill?.name==='Boxing')return 'Boxing Parry: −2 против ударов ногой; −3 против оружия, кроме прямых атак. По одному парированию каждой рукой (B182).';
 if(skill?.name==='Brawling')return 'Brawling Parry: −3 против оружия, кроме прямых атак. По одному парированию каждой рукой (B182).';
 if(skill?.name==='Karate')return 'Karate Parry: без обычного −3 против оружия; штраф encumbrance сохраняется. По одному парированию каждой рукой (B203).';
 return '';
}
export function unarmedHint(p){return p.pages.join('; ')+'. '+(p.id==='boots'?'Требуется тяжёлая обувь; когти не усиливают удар в обуви. ':p.part==='claws'?'Естественные когти: DX или Brawling; Karate и Boxing не применяются. ':'')+(p.penalty===-2?'При промахе ногой: DX против падения (B274). ':'')+(p.part==='teeth'?'Рот должен быть свободен; зубы не парируют. ':'')+'Готовность конечности и защита проверяются вручную (B369, B376). Захват: DX/Judo/Wrestling, без обычного Damage (B370). Wrestling DX+1/+2 даёт ST+1/+2 только для борьбы (B228); броски, удержание и удушение разрешаются вручную (B371, B403–404).';}
export async function saveUnarmedSkill(actor,attack,value){
 return withActorResourceWrite(actor,async()=>{
  if(!actor?.isOwner&&!globalThis.game?.user?.isGM)throw Error('Нет прав на атаку персонажа.');
  if(!(value===''&&attack.unarmedRef.native)&&!unarmedSkills(actor,attack.unarmedRef.profile).some(s=>s.name===value&&s.resolved))throw Error('Этот навык недоступен для выбранной безоружной атаки.');
  const state=structuredClone(actor.getFlag('olegurps-qol','meleeProfiles')??{version:1,revision:0,profiles:{}});state.profiles??={};state.profiles['attack:'+encodeURIComponent(attack.key).replaceAll('.','%2E')]={skill:value};state.revision=(state.revision??0)+1;await actor.setFlag('olegurps-qol','meleeProfiles',state);return resolveUnarmedAttack(actor,attack,{skill:value});
 });
}
