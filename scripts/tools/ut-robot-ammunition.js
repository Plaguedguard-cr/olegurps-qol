import {ROBOTS} from '../ut-next-eleven-source.js';
import {ammoTypeKey} from './ammo-inventory.js';
const forbidden=new Set(['ut_homing','ut_reactionless']);
const independentPrimary=new Set(['ut_shaped_charge','ut_hemp','ut_thermobaric','ut_plasma','ut_force','ut_mininuke','ut_micro_antimatter','ut_implosion','ut_flare','ut_emp']);
export function robotAmmunitionAllowed(modeId,type){
 const r=type?.robot,p=r&&ROBOTS[r.id];
 if(p?.id==='shuriken')return modeId===p.modeId&&type.source==='catalog'&&type.book==='ut'&&type.kind==='ammo-family'&&type.ammoId==='smart_shuriken_robot'&&r.tl===11&&!type.recipe&&type.key===ammoTypeKey(type);
 return !!p&&['hunter','striker'].includes(p.id)&&p.launcherModeIds.includes(modeId)&&p.versions.includes(r.tl)&&
  type.source==='catalog'&&type.book==='ut'&&type.kind==='ammo-family'&&type.ammoId===p.familyId&&
  !forbidden.has(type.recipe?.variantId)&&!type.recipe?.parameters?.reactionless&&
  type.key===ammoTypeKey(type);
}
export function robotAmmunitionCandidates(modeId,types){
 const result=[];
 for(const p of Object.values(ROBOTS).filter(p=>p.launcherModeIds.includes(modeId)))for(const tl of p.versions)
  for(const base of types.filter(t=>!t.robot&&!t.unavailable&&t.book==='ut'&&t.ammoId===p.familyId&&!forbidden.has(t.recipe?.variantId)&&!t.recipe?.parameters?.reactionless)){
   const type={...structuredClone(base),robot:{id:p.id,tl},name:p.name+' (TL'+tl+') / '+base.name};
   type.key=ammoTypeKey(type);type.label=type.name;
   type.physical={weightPerShotLb:p.weightLb,costPerShot:null,robotPublishedCost:p.costByTL[tl]};
   result.push(type);
  }
 return result;
}
export function attachRobotProfile(damage,type,modeId){
 if(!type?.robot)return damage;
 if(!robotAmmunitionAllowed(modeId,type))return {...damage,nativeSafe:false,status:'unresolved',reason:'Неподтверждённая пара robot / launcher / warhead.'};
 const p=ROBOTS[type.robot.id],robot={...structuredClone(p),selectedTL:type.robot.tl,cost:p.costByTL[type.robot.tl],launcherModeId:modeId,
  warhead:{ammoId:type.ammoId,recipe:structuredClone(type.recipe??null)},physicalState:'launched',hitResolution:'manual',commandSkill:'Artillery (Guided Missile)'};
 robot.kineticImpact={resolution:'manual',hp:p.attributes.HP,source:'B430',reason:'Нужны фактическая скорость столкновения и условия цели; таблица кинетического урона обычной ракеты не используется.'};
 // Launcher kinetic tables describe baseline rockets, not autonomous robot impacts.
 const keepPrimary=independentPrimary.has(type.recipe?.variantId)||type.recipe?.variantId==='ut_sefop'&&type.recipe.parameters?.sefopMode!=='aphex';
 const components=(damage.components??[]).filter(c=>c.role!=='backblast'&&(c.role!=='kinetic'||keepPrimary)&&c.role!=='main-charge').map(c=>({...c}));
 const primary=components.find(c=>c.role!=='fragmentation')??components[0];
 const rules={...damage.rules,robot,ballisticRange:p.rangeMiles?{minimum:null,halfDamage:null,maximum:p.rangeMiles*1760,source:p.source}:null,
  instructionOnly:!primary,primaryDamageRole:primary?.role??null,componentOrder:components.map(c=>c.role),ammunitionSource:p.source};
 delete rules.manualHoming;delete rules.backblast;
 if(rules.heProximity){robot.warheadFuze=rules.heProximity;delete rules.heProximity;}
 rules.attackBonus=0;
 rules.robotPublishedCost=p.costByTL[type.robot.tl];rules.costPerShot=p.id==='shuriken'?500:null;
 return {...damage,...(p.id==='shuriken'?{nativeSafe:true,status:'resolved',reason:null,transformations:[],support:{manual:[]}}:{}),formula:primary?.formula??null,components,rules,effectiveChanges:{...damage.effectiveChanges,damage:primary?.formula??'spec. (robot)',range:p.rangeMiles?String(p.rangeMiles*1760):null}};
}
