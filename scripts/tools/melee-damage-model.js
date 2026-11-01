const text=value=>String(value??'').trim();
export const MELEE_DAMAGE_MODES=Object.freeze(['swing','thrust','fixed']);

/** Dice and scalar adds are independent terms. Never treat +1d as +1 followed by text. */
export function parseMeleeDamageTerms(expression) {
  const source=text(expression).replace(/\s+/g,'');
  let dice=0,adds=0,end=0;
  for(const match of source.matchAll(/([+-])(\d+)(d(?:6)?)?/gy)) {
    if(match.index!==end)break;
    const amount=Number(match[2])*(match[1]==='-'?-1:1);
    if(!Number.isSafeInteger(amount))return null;
    if(match[3])dice+=amount;else adds+=amount;
    end=match.index+match[0].length;
  }
  const suffix=source.slice(end);
  if(suffix&&!/^(?:[xX*]\d+(?:\.\d+)?)?(?:\(-?(?:\d+(?:\.\d*)?|\.\d+)\))?!?$/.test(suffix))return null;
  return {dice,adds,suffix};
}

/** Only ordinary safely separable ST expressions are structured. Everything else keeps its complete text. */
export function inferMeleeDamageModel(expression) {
  const raw=text(expression),match=/^(sw(?:ing)?|thr(?:ust)?)\s*((?:[+-]\s*\d+(?:d(?:6)?)?\s*)*)\s*(\(-?(?:\d+(?:\.\d*)?|\.\d+)\))?\s*(!)?\s+([\w+-]+)(?:\s+([^,;@*\[\]]+))?$/i.exec(raw);
  if(!match||/[,;@*\[\]]/.test(raw))return {version:1,mode:'fixed',raw};
  const terms=parseMeleeDamageTerms(match[2]);
  if(!terms)return {version:1,mode:'fixed',raw};
  return {version:1,mode:/^sw/i.test(match[1])?'swing':'thrust',bonus:terms.adds,...(terms.dice?{extraDice:terms.dice}:{}),
    damageType:match[5],armorDivisor:match[3]?.slice(1,-1)??'',minimum:!!match[4],extension:match[6]??''};
}

export function normalizeMeleeDamageModel(value) {
  if(!value||!MELEE_DAMAGE_MODES.includes(value.mode))return null;
  if(value.mode==='fixed')return text(value.raw)?{version:1,mode:'fixed',raw:text(value.raw)}:null;
  const bonus=Number(value.bonus??0),extraDice=Number(value.extraDice??0),divisor=text(value.armorDivisor),damageType=text(value.damageType),extension=text(value.extension);
  if(!Number.isSafeInteger(bonus)||!Number.isSafeInteger(extraDice)||!damageType||/\s|[,;@*\[\]]/.test(damageType)||/[,;@*\[\]]/.test(extension)||
    divisor&&(!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(divisor)||!Number.isFinite(Number(divisor))||Number(divisor)===0))return null;
  return {version:1,mode:value.mode,bonus,...(extraDice?{extraDice}:{}),damageType,armorDivisor:divisor,minimum:value.minimum===true,extension};
}

export function formatMeleeDamageModel(model) {
  const value=normalizeMeleeDamageModel(model);if(!value)return null;
  if(value.mode==='fixed')return value.raw;
  return (value.mode==='swing'?'sw':'thr')+(value.extraDice?(value.extraDice>0?'+':'')+value.extraDice+'d':'')+(value.bonus?(value.bonus>0?'+':'')+value.bonus:'')+
    (value.armorDivisor?'('+value.armorDivisor+')':'')+(value.minimum?'!':'')+' '+value.damageType+(value.extension?' '+value.extension:'');
}

export function meleeDamageModelFromInputs(values) {
  return normalizeMeleeDamageModel({mode:values.damageMode,raw:values.damage,bonus:values.damageBonus,extraDice:values.damageExtraDice,
    damageType:values.damageType,armorDivisor:values.damageDivisor,minimum:values.damageMinimum==='on'||values.damageMinimum===true,
    extension:values.damageExtension});
}

let nativeParserPromise=null;
export async function getMeleeNativeDamageParser() {
  if(typeof globalThis.GURPS?.parseForRollOrDamage==='function')return globalThis.GURPS.parseForRollOrDamage.bind(globalThis.GURPS);
  nativeParserPromise??=import('/systems/gurps/lib/parselink.js').then(m=>m.parseForRollOrDamage).catch(()=>null);
  return await nativeParserPromise??(typeof globalThis.GURPS?.parselink==='function'?globalThis.GURPS.parselink.bind(globalThis.GURPS):null);
}

/** GGA 0.18 loses deriveddamage.next. Parse every explicit component through GGA, never silently discard it. */
export function parseCompleteMeleeDamage(expression,parser) {
  if(typeof parser!=='function')return null;
  const raw=text(expression);
  let depth=0,start=0;const parts=[];
  for(let i=0;i<raw.length;i++){if(raw[i]==='(')depth++;if(raw[i]===')')depth--;if(raw[i]===','&&depth===0){parts.push(raw.slice(start,i).trim());start=i+1;}}
  parts.push(raw.slice(start).trim());
  const actions=parts.map(p=>{
    const derived=/^(sw(?:ing)?|thr(?:ust)?)\s*((?:[+-]\s*\d+(?:d(?:6)?)?\s*)*)(.*)$/i.exec(p);
    if(!derived)return parser(p)?.action;
    const terms=parseMeleeDamageTerms(derived[2]);if(!terms)return null;
    if(!/[+-]\s*\d+d/i.test(derived[2])&&(derived[2].match(/[+-]/g)??[]).length<2)return parser(p)?.action;
    const action=parser(derived[1]+(/^[(!]/.test(derived[3])?'':' ')+derived[3])?.action;
    if(action?.type!=='deriveddamage')return null;
    const formula=derived[2].replace(/\s/g,'')+action.formula;
    if(!parseMeleeDamageTerms(formula))return null;
    return {...action,orig:p,formula};
  });
  if(actions.some(a=>!['damage','deriveddamage'].includes(a?.type)))return null;
  const result=actions.map(a=>structuredClone(a));for(let i=0;i<result.length-1;i++)result[i].next=result[i+1];
  return result[0];
}
