import { withActorResourceWrite } from './actor-resource-writes.js';
import { basicStrengthDamage } from './gurps-strength-damage.js';

export const STRENGTH_FLAG = 'strengthAdjustments';
export const STRENGTH_KINDS = Object.freeze(['st','striking','lifting','arm']);
const integer = value => value===null||value===undefined||String(value).trim()==='' ? null :
  Number.isSafeInteger(Number(value)) ? Number(value) : null;
export const sameStrengthActor=(a,b)=>a===b||!!a?.uuid&&a.uuid===b?.uuid||!!a?.id&&a.id===b?.id&&!a?.isToken&&!b?.isToken;
export function isStrengthUpdate(change) {
  return Object.keys(change??{}).some(k=>k.startsWith('flags.olegurps-qol.'+STRENGTH_FLAG)||k==='flags'&&
    Object.hasOwn(change.flags?.['olegurps-qol']??{},STRENGTH_FLAG));
}
export function readStrengthAdjustments(actor) {
  const raw=actor?.getFlag?.('olegurps-qol',STRENGTH_FLAG);
  return {version:1,revision:Number.isSafeInteger(raw?.revision)?raw.revision:0,
    modifiers:Object.fromEntries(STRENGTH_KINDS.map(k=>[k,integer(raw?.modifiers?.[k])??0]))};
}

const advantageNames=new Map([
  ['striking st','striking'],['lifting st','lifting'],['arm st','arm'],
  ['ударная сила','striking'],['подъёмная сила','lifting'],['подъемная сила','lifting'],['сила рук','arm']
]);
/** GCS i.levels becomes GGA Advantage.level. Read the Actor's advantage tree once, not Items again. */
export function readStrengthAdvantages(actor) {
  const entries=[],seen=new Set();
  const walk=(tree,path)=>{for(const[key,row]of Object.entries(tree??{})){
    if(!row||typeof row!=='object')continue;
    const name=String(row.originalName||row.name||'').trim().replace(/\s+[+-]?\d+$/,'');
    const kind=advantageNames.get(name.toLocaleLowerCase());
    const identity=row.uuid||row.itemid||path+'.'+key;
    if(kind&&!seen.has(identity)&&row.disabled!==true&&row.active!==false){seen.add(identity);
      entries.push({kind,level:integer(row.level)??0,name,path:path+'.'+key,itemId:row.itemid??'',
        notes:String(row.notes??''),id:identity});}
    walk(row.contains,path+'.'+key+'.contains');walk(row.collapsed,path+'.'+key+'.collapsed');
  }};walk(actor?.system?.ads,'system.ads');
  const credited={striking:0,lifting:0,arm:0},globalIds=new Set();
  for(const item of actor?.items?.contents??[]){const data=item.system;
    if(!data?.bonuses||item.type==='equipment'&&!(data.equipped&&data.carried)||data.globalid&&globalIds.has(data.globalid))continue;
    if(data.globalid)globalIds.add(data.globalid);
    const contribution=entries.find(e=>e.itemId===item.id);if(!contribution)continue;
    let amount=0;
    for(const line of String(data.bonuses).split('\n')){
      const source=line.trim().replace(/^\[(.*)\]$/,'$1');
      const action=globalThis.GURPS?.parselink?.(source)?.action;
      if(action?.type==='attribute'&&action.attrkey==='ST')amount+=integer(action.mod)??0;
      else if(!globalThis.GURPS?.parselink){const match=/^ST\s*([+-]\d+)$/i.exec(source);if(match)amount+=Number(match[1]);}
    }
    credited[contribution.kind]+=Math.min(Math.max(0,amount),Math.max(0,contribution.level));
  }
  return {entries,credited,levels:Object.fromEntries(['striking','lifting','arm'].map(k=>[k,entries.filter(e=>e.kind===k).reduce((n,e)=>n+e.level,0)]))};
}

/** GCS calc.value becomes ST.import; GGA initializes value and applies Item attribute bonuses once.
 * Advantage levels are increments, not a second copy of base ST. No reverse inference from BL or damage. */
export function readActorStrength(actor, adjustments=readStrengthAdjustments(actor)) {
  const imported=integer(actor?.system?.attributes?.ST?.import),current=integer(actor?.system?.attributes?.ST?.value);
  const advantages=readStrengthAdvantages(actor),credited=Object.values(advantages.credited).reduce((n,v)=>n+v,0);
  const base=current===null?null:current-credited;
  const st=base===null?null:base+adjustments.modifiers.st;
  const variant=(kind,label)=>({label,supported:true,imported:advantages.levels[kind],current:advantages.levels[kind],
    effective:st===null?null:st+advantages.levels[kind]+adjustments.modifiers[kind],
    source:'Actor.system.ads.*.level',alreadyIncludedInGga:advantages.credited[kind]});
  return {version:1,actorId:actor?.id??null,revision:adjustments.revision,modifiers:{...adjustments.modifiers},
    kinds:{st:{label:'ST',supported:current!==null,imported,current,effective:st,baseCurrent:base,source:'Actor.system.attributes.ST',
      ...(current===null?{reason:'Не определено: отсутствует численное ST.value GGA.'}:{})},
      striking:variant('striking','Striking ST'),lifting:variant('lifting','Lifting ST'),
      arm:{...variant('arm','Arm ST'),application:'Явный выбор владельца для конкретной атаки.'}},advantages,
    ggaDamage:{swing:String(actor?.system?.swing??'').trim(),thrust:String(actor?.system?.thrust??'').trim()}};
}

const normalizedDice=value=>String(value??'').trim().replace(/d6(?=[+-]|$)/,'d').replace(/\+0$/,'');
/** Numeric base only. Never changes skill, aiming, Bulk, lifting, Actor.system or an inventory resource. */
export function resolveStrengthDamage(actor, mode, {applyArmST=false}={}) {
  const strength=readActorStrength(actor),base=strength.kinds.st;
  const result={ready:false,strength,effectiveST:null,strengthKind:'st',mode,baseFormula:null,source:'Basic Set B15-16'};
  const damageUnchanged=strength.modifiers.st===0&&strength.modifiers.striking===0&&
    (!applyArmST||strength.advantages.levels.arm+strength.modifiers.arm===0);
  if(!base.supported){
    if(damageUnchanged&&/^\d+d(?:6)?(?:[+-]\d+)?$/.test(strength.ggaDamage[mode]??''))
      return {...result,ready:true,strengthKind:'gga-imported-damage',baseFormula:strength.ggaDamage[mode],source:'Actor.system.'+mode};
    return {...result,reason:base.reason};
  }
  const anchor=base.imported??base.baseCurrent,levels=strength.advantages.levels;
  const striking=levels.striking+strength.modifiers.striking,arm=applyArmST?levels.arm+strength.modifiers.arm:0;
  const effectiveST=base.effective+striking+arm;
  const importedPair=strength.ggaDamage;
  const anchors=[anchor,anchor+levels.striking,anchor+levels.striking+levels.arm,
    base.baseCurrent,base.baseCurrent+levels.striking,base.baseCurrent+levels.striking+levels.arm];
  const mismatch=!anchors.some(st=>['swing','thrust'].every(kind=>!importedPair[kind]||
    normalizedDice(importedPair[kind])===normalizedDice(basicStrengthDamage(st,kind))));
  if(mismatch){
    if(base.baseCurrent===anchor&&damageUnchanged&&/^\d+d(?:6)?(?:[+-]\d+)?$/.test(importedPair[mode]??''))
      return {...result,ready:true,strengthKind:'gga-imported-damage',baseFormula:importedPair[mode],source:'Actor.system.'+mode,
        reason:'Разновидность ST в импортированном уроне не определена; повторные бонусы не добавляются.'};
    return {...result,reason:'Импортированные Swing/Thrust не согласуются с базовой ST по B16. Разновидность ST и уже учтённые бонусы не определены; пересчёт временной поправки невозможен.'};
  }
  const formula=basicStrengthDamage(effectiveST,mode);
  if(!formula)return {...result,reason:'Нет точной проверенной строки урона для ST '+effectiveST+'. Интерполяция не применяется.'};
  return {...result,ready:true,effectiveST,strengthKind:applyArmST?'st+striking+arm':'st+striking',
    applied:{st:base.effective,striking,arm,lifting:0,applyArmST},baseFormula:formula};
}

export class StrengthService {
  constructor(actor){this.actor=actor;}
  read(){return readActorStrength(this.actor);}
  save(modifiers,{expectedRevision=readStrengthAdjustments(this.actor).revision}={}){
    return withActorResourceWrite(this.actor,async()=>{
      if(this.actor?.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Нет прав на изменение ST этого персонажа.');
      const before=readStrengthAdjustments(this.actor),current=readActorStrength(this.actor);
      if(before.revision!==expectedRevision)throw Error('Поправки ST уже изменены. Откройте редактор заново.');
      if(!modifiers||Object.keys(modifiers).some(k=>!STRENGTH_KINDS.includes(k))||
        STRENGTH_KINDS.some(k=>modifiers[k]!=null&&String(modifiers[k]).trim()!==''&&integer(modifiers[k])===null))
        throw Error('Временная поправка ST должна быть целым числом со знаком.');
      const parsed=Object.fromEntries(STRENGTH_KINDS.map(k=>[k,integer(modifiers[k])??0]));
      if(!current.kinds.st.supported&&Object.values(parsed).some(v=>v!==0))throw Error(current.kinds.st.reason);
      const value={version:1,revision:before.revision+1,modifiers:parsed};
      await this.actor.setFlag('olegurps-qol',STRENGTH_FLAG,value);
      return readActorStrength(this.actor);
    });
  }
}
