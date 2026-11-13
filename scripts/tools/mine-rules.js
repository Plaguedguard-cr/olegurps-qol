// No canvas, token geometry, Combat or initiative dependencies.
import {parseFragmentDamage,explosionTargetDamage,fragmentTargetProfile,fragmentHitCount,fragmentRangeModifier} from './explosion-fragmentation.js';
import {calculateGrenadeEffect,grenadeEffectInput} from './grenade-effects.js';
import {grenadeHasCheck,grenadeProtection} from './grenade-effect-chat.js';
import {mt} from './mine-localization.js';

const number=(value,min=-Infinity)=>{if(value===''||value==null||!Number.isFinite(Number(value))||Number(value)<min)throw Error(mt('Invalid'));return Number(value);};
const integer=(value,min=-Infinity)=>{const n=number(value,min);if(!Number.isSafeInteger(n))throw Error(mt('Invalid'));return n;};
export const mineSector=(bearing,facing,sector)=>Math.abs((((bearing-facing+540)%360)+360)%360-180)<=sector/2+1e-9;
export function mineDistance(profile,target,heightFeet=profile.burstHeightFeet){
  return Math.hypot(number(target.distance,0),(number(target.elevationFeet)-number(heightFeet,0))/3);
}
export function normalizeMineTargets(profile,targets,{heightFeet=profile.burstHeightFeet,atmosphere='normal',runtime=globalThis}={}){
  number(heightFeet,0);
  if(!Array.isArray(targets)||!['normal','very-thin','trace','vacuum','water'].includes(atmosphere))throw Error(mt('Invalid'));
  const ids=new Set();let contacts=0;
  return targets.map((t,index)=>{
    const id=String(t.id??index);if(ids.has(id)||t.coverChecked!==true)throw Error(mt('Invalid'));ids.add(id);
    const target={...structuredClone(t),id,name:String(t.name??'').trim(),distance:number(t.distance,0),elevationFeet:number(t.elevationFeet),
      sm:integer(t.sm??0),postureModifier:number(t.postureModifier??0),modifier:integer(t.modifier??0),dodged:integer(t.dodged??0,0),
      blastCoverDR:number(t.blastCoverDR??0,0),projectileCoverDR:number(t.projectileCoverDR??0,0),
      coveredLocations:Array.isArray(t.coveredLocations)?t.coveredLocations:String(t.coveredLocations??'').split(',').map(s=>s.trim()).filter(Boolean),bodyplan:t.bodyplan??'humanoid'};
    target.partialCoveredLocations=Array.isArray(t.partialCoveredLocations)?t.partialCoveredLocations:String(t.partialCoveredLocations??'').split(',').map(s=>s.trim()).filter(Boolean);
    if(!target.name||!['humanoid','quadruped','winged-quadruped','hexapod','winged-hexapod','centaur','avian'].includes(target.bodyplan))throw Error(mt('Invalid'));
    if(profile.directed&&typeof t.inSector!=='boolean')throw Error(mt('Invalid'));
    target.slantDistance=mineDistance(profile,target,heightFeet);
    if(profile.requiresContact&&t.contact===true){contacts++;if(target.slantDistance!==0)throw Error(mt('Invalid'));}
    if(profile.payloadEffect){
      const e=profile.payloadEffect,input={...t.effect,distance:target.slantDistance,atmosphere,targetActorId:t.actorId||undefined};
      if(grenadeHasCheck(profile)){
        const actor=runtime.game.actors.get(t.actorId);if(!actor)throw Error(mt('Invalid'));
        // Existing protection and resistance service remains the source of trait effects.
        const protection=grenadeProtection(profile,actor,input);Object.assign(input,protection.choices);
        input.distance=target.slantDistance;
        target.protection=protection;
      }
      grenadeEffectInput(profile,input,runtime);target.effect=input;
      if(e.components.some(c=>c.radiation))target.effect.radiationFactor=number(input.radiationFactor??1,1);
      if(e.chemical?.id==='disassembler')target.effect.sealedDR=number(input.sealedDR??0,0);
    }
    return target;
  }).map((t,_i,all)=>{if(profile.requiresContact&&contacts!==1)throw Error(mt('Invalid'));return t;});
}
export function mineDirectedAttack(profile,target,remaining,total){
  const p=profile.directed,d=target.slantDistance;
  if(!p||!target.inSector||d>p.maxRange+1e-9||remaining<=0)return {eligible:false,hits:0,remaining};
  // HT189 explicitly fixes 9 + 9. SM and other ranged conditions are separate.
  // B409: a close shotload becomes one bundled hit, with half the pellet multiplier.
  const close=d<p.halfDamage*.1,multiplier=close?Math.floor(p.pellets/2):1;
  const range=fragmentRangeModifier(d),posture=Number(target.postureModifier??0),skill=p.baseSkill+(close?0:p.rofBonus)+range+target.sm+posture+target.modifier;
  const success=skill>=3&&(total<=4||(total<17&&total<=skill)),margin=skill-total;
  let hits=success?1+Math.floor(Math.max(0,margin)/p.rcl):0;
  if(close)hits=Math.min(1,hits);
  if(!close&&target.immobile===true&&target.sm>=-range&&success)hits=margin>=p.rcl?remaining:Math.ceil(remaining/2);
  hits=Math.min(hits,Math.floor(remaining/multiplier));
  const criticalSuccess=success&&(total<=4||total===5&&skill>=15||total===6&&skill>=16);
  const landed=Math.max(0,hits-(criticalSuccess?0:target.dodged));
  const intercepted=landed*multiplier;
  return {eligible:true,skill,base:p.baseSkill,rapidFire:close?0:p.rofBonus,range,sm:target.sm,posture,modifier:target.modifier,total,margin,
    hits:landed,intercepted,remaining:remaining-intercepted,close,multiplier,criticalSuccess,damageFactor:d>p.halfDamage?2:1};
}
export async function calculateMine(profile,targets,options={},runtime=globalThis){
  const rows=normalizeMineTargets(profile,targets,{...options,runtime}),result={version:1,profile:structuredClone(profile),heightFeet:options.heightFeet??profile.burstHeightFeet,atmosphere:options.atmosphere??'normal',targets:[],components:[]};
  const roll=async formula=>{const r=await runtime.Roll.create(formula).evaluate();return {total:Number(r.total),formula:r.formula??formula,dice:(r.dice??[]).flatMap(d=>(d.results??[]).filter(v=>v.active!==false&&!v.discarded).map(v=>v.result))};};
  const location=async target=>{
    if(runtime.mineLocation)return runtime.mineLocation(target);
    const {TargetingService}=await import('./targeting-service.js'),service=await TargetingService.create({bodyplan:target.bodyplan});
    const l=await service.resolveRandomHitLocation();return {ggaKey:l.ggaKey,label:l.label,total:l.total,canonicalKey:l.canonicalKey};
  };
  const coverAt=async(target,l)=>{
    const matches=rows=>rows.includes('*')||rows.includes(l.ggaKey)||rows.includes(l.canonicalKey);
    if(matches(target.coveredLocations))return {coverDR:target.projectileCoverDR};
    if(matches(target.partialCoveredLocations)){const r=await roll('1d6');return {coverDR:r.total>=4?target.projectileCoverDR:0,coverRoll:r.total};}
    return {coverDR:0};
  };
  let remaining=profile.directed?.pellets??0;
  const ordered=profile.directed?[...rows].sort((a,b)=>a.slantDistance-b.slantDistance):rows;
  const add=(target,key,c,value,extra={})=>result.components.push({id:target.id+':'+key,targetId:target.id,targetName:target.name,targetActorId:target.actorId??null,key,
    formula:c.formula,type:c.type,divisor:c.divisor??1,modifiers:c.modifiers??'',value:Math.max(0,Math.floor(value)),nativeSafe:true,...extra});
  for(const target of ordered){
    const row={target:structuredClone(target),distance:target.slantDistance,attacks:[]};result.targets.push(row);
    const d=target.slantDistance;
    if(profile.blast&&!profile.payloadEffect){
      const damage=parseFragmentDamage(profile.blast.formula),r=await roll(damage.formula),b=explosionTargetDamage({damage,total:r.total,distance:d,environment:result.atmosphere});
      row.blast={...b,roll:r,coverDR:target.blastCoverDR};add(target,'blast',profile.blast,b.value-target.blastCoverDR,{divisor:1,location:'Torso'});
    }
    if(profile.direct&&target.contact===true){const r=await roll(parseFragmentDamage(profile.direct.formula).formula);row.direct=r;add(target,'direct',profile.direct,r.total,{location:target.directLocation??'Torso'});}
    if(profile.fragments){
      const damage=parseFragmentDamage(profile.fragments.formula),p=fragmentTargetProfile({damage,distance:d,sm:target.sm,postureModifier:target.postureModifier});
      const avoided=profile.dropAvoidsFragments&&target.dropImmediately===true;
      const attack=d<=p.dangerRadius&&!avoided?await roll('3d6'):null;
      const hits=attack?fragmentHitCount({total:attack.total,skill:p.effectiveSkill,followUp:target.contact===true}):0;
      row.fragments={...p,total:attack?.total??null,hits,avoided};if(attack)row.attacks.push({kind:'Fragments',base:15,skill:p.effectiveSkill,total:attack.total,dice:attack.dice,hits,range:p.rangeMod,sm:target.sm,posture:target.postureModifier});
      for(let i=0;i<hits;i++){
        const l=await location(target),r=await roll(damage.formula),coverage=await coverAt(target,l);
        add(target,'fragment'+i,profile.fragments,r.total-coverage.coverDR,{roll:r,location:l.ggaKey,locationRoll:l,...coverage});
      }
    }
    if(profile.directed){
      const p=profile.directed,eligible=target.inSector&&d<=p.maxRange+1e-9&&remaining>0;
      const r=eligible?await roll('3d6'):null,a=mineDirectedAttack(profile,target,remaining,r?.total??18);row.directed=a;remaining=a.remaining;
      if(r)row.attacks.push({kind:'Pellets',...a,dice:r.dice});
      for(let i=0;i<a.hits;i++){
        const l=await location(target),damage=parseFragmentDamage(p.formula),formula=a.close?`${damage.dice*a.multiplier}d6${damage.adds*a.multiplier>=0?'+':''}${damage.adds*a.multiplier}`:damage.formula,r=await roll(formula);
        const coverage=await coverAt(target,l),cover=coverage.coverDR;
        // Cover is material DR, so the projectile divisor applies to it too.
        add(target,'pellet'+i,p,r.total/a.damageFactor-cover*a.multiplier/p.divisor,{divisor:p.divisor/a.multiplier,roll:r,location:l.ggaKey,locationRoll:l,...coverage,drMultiplier:a.multiplier,halfDamage:a.damageFactor===2});
      }
    }
    if(profile.payloadEffect){
      const chemical=profile.payloadEffect.chemical,checks=chemical?.checks??[];
      const immediateChecks=checks.filter(c=>c.id!=='residue'&&!(chemical?.id==='mustard'&&c.id==='respiratory')&&!(chemical?.duration?.delaySeconds>0));
      row.deferredChecks=checks.filter(c=>!immediateChecks.includes(c)).map(c=>({...c,source:chemical.source,delaySeconds:chemical.id==='mustard'&&c.id==='respiratory'?7200:chemical.duration?.delaySeconds??null,reason:c.id==='residue'?mt('Residual'):mt('Deferred')}));
      const checkInputs=checks.length?immediateChecks.map(c=>({...target.effect,checkId:c.id})):[target.effect];row.effects=[];
      for(const checkInput of checkInputs){
      let effectProfile=structuredClone(profile),input={...checkInput,distance:d};
      const actor=target.actorId?runtime.game.actors.get(target.actorId):null;
      const protectedPlan=grenadeHasCheck(profile)?grenadeProtection(profile,actor,input).plan:null;
      if(protectedPlan){
        // calculateGrenadeEffect derives the profile modifier itself; add only trait bonus.
        const rawPlan=(await import('./grenade-effects.js')).grenadeResistancePlan(profile,input,runtime.game.actors.get(target.actorId));
        input.modifier=Number(input.modifier??0)+(protectedPlan.modifier-rawPlan.modifier);
        if(!protectedPlan.applies){effectProfile.payloadEffect={...effectProfile.payloadEffect,family:'components',kind:'components'};}
      }
      const {result:effect}=await calculateGrenadeEffect(effectProfile,input,runtime);
      for(const c of effect.components){
        if(/\bex\b/.test(c.modifiers)&&c.falloff==='triple-distance'&&d>2*parseFragmentDamage(c.formula).effectiveDice)c.value=0;
        if(c.radiation){c.rawRads=c.value;c.radiationFactor=target.effect.radiationFactor;c.rads=c.rawRads/c.radiationFactor;}
      }
      if(profile.payloadEffect.radius!=null&&d>profile.payloadEffect.radius&&profile.payloadEffect.family!=='flare'){
        effect.applies=false;if(effect.resistance)effect.resistance.applies=false;
      }
      if(profile.payloadEffect.family==='tangler'&&d>(profile.payloadEffect.radius??0)){effect.applies=false;delete effect.tangler;}
      if(protectedPlan&&!protectedPlan.applies)effect.resistance={applies:false,reason:protectedPlan.immunity};
      // Only the initial, source-confirmed dose is issued here. Later cycles
      // remain explicit GM actions; no scheduler or accumulated state is invented.
      const initial=effect.resistance?.applies!==false&&effect.resistance?.success===false;
      let instant=null;
      if(initial&&chemical?.outcomes?.failureDamage==='1d tox'&&input.checkId==='initial')instant={formula:'1d',type:'tox',divisor:-1,nativeSafe:true};
      if(initial&&chemical?.id==='mustard'&&input.checkId==='contact')instant={formula:'1',type:'tox',divisor:-1,nativeSafe:true};
      if(initial&&chemical?.id==='paralysis'&&effect.resistance.criticalFailure)instant={formula:'1d',type:'SOURCE_UNDETERMINED',divisor:1,nativeSafe:false,note:mt('UnknownDamage')+'; UT160'};
      if(chemical?.id==='disassembler'&&input.exposed!==false&&input.immune!==true&&input.protected!==true&&(chemical.radius==null||d<=chemical.radius)){
        const r=await roll('(1d6-2)*2');instant={formula:'2×(1d-2)',type:'cor',divisor:-1,nativeSafe:true,value:Math.max(0,r.total-Math.floor(input.sealedDR/10)),roll:r,sealedDR:input.sealedDR,source:'UT161/169; first second only'};
      }
      if(instant){
        if(instant.value==null){const r=await roll(instant.formula==='1'?'1':'1d6');instant={...instant,value:r.total,roll:r};}
        effect.components.push({...instant,key:'initial-dose',modifiers:'',falloff:'direct'});
      }
      row.effects.push(effect);row.effect??=effect;
      for(const [i,c] of effect.components.entries())add(target,'effect'+(input.checkId??'')+i,c,c.value-(c.type==='cr'||c.type==='burn'?target.blastCoverDR:0),{...c,nativeSafe:c.nativeSafe,value:Math.max(0,c.value-(c.type==='cr'||c.type==='burn'?target.blastCoverDR:0)),location:'Torso'});
      }
    }
  }
  result.remaining=remaining;return result;
}
