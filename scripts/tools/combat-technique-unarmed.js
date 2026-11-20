import {readCombatTechniqueSkills} from "./combat-technique-data.js";
import {techniqueMastery,weaponPenaltyPerk} from './ma-combat-perks.js';

export function unarmedBonus(skill){
 if(!skill?.learned||!Number.isFinite(skill.dx)||!Number.isFinite(skill.baseLevel))return 0;
 const r=skill.baseLevel-skill.dx;
 return skill.name==='Brawling'?(r>=2?1:0):skill.name==='Boxing'?(r>=2?2:r>=1?1:0):skill.name==='Karate'?(r>=1?2:r>=0?1:0):0;
}
export function resolveProfileTechnique(actor,p){
 if(!p?.technique)return null;
 const rows=readCombatTechniqueSkills(actor,{objectRows:true}),learned=r=>(Number(r.points)>0||r.learned===true)&&Number.isFinite(Number(r.level??r.import));
 const twoHanded=p.technique==='Two-Handed Punch';
 const baseNames=twoHanded?['Brawling']:['Brawling','Karate'];
 const bases=rows.filter(r=>baseNames.includes(r.name)&&learned(r)).map(r=>({name:r.name,level:Number(r.level??r.import)}));
 const defaultPenalty=p.technique==='Kicking'||twoHanded?-2:-1;
 const direct=(candidate)=>{
  const perk=weaponPenaltyPerk(actor,p,candidate.baseSkill,p.attackModifier);
  const penalty=p.attackModifier+(perk?.modifier??0);
  return {...candidate,level:candidate.level+penalty,directWeaponPenalty:penalty,
    penalty:candidate.defaultPenalty+penalty,perks:[...(candidate.perks??[]),...(perk?[perk]:[])]};
 };
 const candidates=[];
 for(const b of bases)candidates.push({level:b.level+defaultPenalty,source:'skill-default',sourceName:b.name,sourceLevel:b.level,defaultPenalty,baseSkill:b.name});
 if(p.technique==='Kicking'&&Number.isFinite(Number(actor?.system?.attributes?.DX?.value)))candidates.push({level:Number(actor.system.attributes.DX.value)-2,source:'attribute-default',sourceName:'DX',sourceLevel:Number(actor.system.attributes.DX.value),defaultPenalty:-2,baseSkill:'DX'});
 for(const r of rows.filter(learned)){
  const m=/^(Hammer Fist|Kicking|Two-Handed Punch)(?:\s*\((Brawling|Karate)\))?$/i.exec(String(r.name));if(!m||m[1].toLowerCase()!==p.technique.toLowerCase())continue;
  const base=bases.filter(b=>!m[2]||b.name.toLowerCase()===m[2].toLowerCase()).sort((a,b)=>b.level-a.level)[0];
  if(!base)continue;
  const mastery=techniqueMastery(actor,{name:p.technique},base,0);
  candidates.push({level:Math.min(Number(r.level??r.import),base.level+(mastery?.maximum??0)),source:'learned-technique',sourceName:r.name,sourceLevel:Number(r.level??r.import),defaultPenalty:0,baseSkill:base.name,perks:mastery?[mastery]:[]});
 }
 const best=candidates.map(direct).sort((a,b)=>b.level-a.level)[0];
 return best?{...best,name:p.technique,resolved:true,learned:best.source==='learned-technique',candidates:[]}:
 {name:p.technique,resolved:false,level:null,candidates:[],reason:'Нет изученного базового Brawling/Karate для Hammer Fist (LT64; MA73).'};
}

// BS Kick is an attack mode/default only; learned Kicking is not wired to it.
export function resolveBasicKickDefault({profile,skill,encumbrance=0}={}) {
  return skill?.resolved ? skill.level+(profile.penalty??0)-encumbrance : null;
}
