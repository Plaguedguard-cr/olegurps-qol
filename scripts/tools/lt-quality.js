// LT59: instance quality and the quality of its actual physical projectile.
// Optional LT75 campaign rules are explicit; normal quality keeps old profiles unchanged.
export function ltPersonalQualityOptions(profile={}){
 return {missile:profile.kind?.startsWith('crossbow-')||['atlatl-dart','atlatl-javelin','blowpipe-dart','dart-sling','heavy-sling','sling','staff-sling','stone-stick','woomera'].includes(profile.kind),balanceAllowed:profile.kind!=='stone-stick'&&!['WHdOJqxV7QhQcqk6H','Wo3FP4KhrHj4Ovw39','WLTP3FootwearThrown','WLTP3CaltropThrown','WLTP3PitonThrown'].includes(profile.modeId)};
}
export function normalizeLTQuality(value={}, {missile=false,balanceAllowed=true}={}) {
 const quality=value?.quality??'normal',balance=value?.balance??'normal';
 if(!(missile?['normal','cheap','fine']:['normal','cheap','fine','very-fine','silver']).includes(quality))throw Error('Это качество не определено для выбранного вида оружия LT59.');
 if(!['normal','balanced','poor'].includes(balance)||!balanceAllowed&&balance!=='normal')throw Error('Баланс не применяется к палкам и подручным предметам (LT59).');
 return {quality,balance,silverCoated:value?.silverCoated===true,...(missile?{reducedAcc:value?.reducedAcc===true,cheapMalfunctions:value?.cheapMalfunctions===true}:{})};
}
export function validLTQuality(value,options={}){try{normalizeLTQuality(value,options);return true;}catch{return false;}}
export function ltQualityHTML(value, prefix, escape, {missile=false,balanceAllowed=true}={}) {
 const v=value??{},select=(key,label,options)=>`<label style="display:flex;flex-direction:column;gap:4px">${label}<select name="${prefix}-${key}" data-lt-quality="${key}">${options.map(([id,label])=>`<option value="${id}" ${(v[key]??'normal')===id?'selected':''}>${escape(label)}</option>`).join('')}</select></label>`;
 return select('quality','Качество — LT59',[['normal','Обычное'],['cheap','Дешёвое'],['fine','Хорошее'],...missile?[]:[['very-fine','Отличное'],['silver','Цельное серебро']]])+
 (balanceAllowed?select('balance','Баланс — LT59',[['normal','Обычный'],['balanced','Сбалансированное'],['poor','Плохо сбалансированное']]):'')+
 `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="${prefix}-silverCoated" data-lt-quality="silverCoated" ${v.silverCoated?'checked':''}>Серебряное покрытие; действие на цель — вручную</label>`+
 (missile?['reducedAcc','cheapMalfunctions'].map((key,i)=>`<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="${prefix}-${key}" data-lt-quality="${key}" ${v[key]?'checked':''}>${['Опционально LT75: Acc /2 вниз','Опционально LT75: отказы дешёвого лука / пращи / арбалета'][i]}</label>`).join(''):'');
}
export function captureLTQuality(root,prefix){
 return {quality:root.querySelector(`[name="${prefix}-quality"]`)?.value??'normal',balance:root.querySelector(`[name="${prefix}-balance"]`)?.value??'normal',...Object.fromEntries(['silverCoated','reducedAcc','cheapMalfunctions'].map(k=>[k,root.querySelector(`[name="${prefix}-${k}"]`)?.checked===true]))};
}
export function applyLTQuality(damage,{weapon={},projectile={},missile=false,balanceAllowed=true,cheapMalf=null,policy={}}={}) {
 if(!damage?.nativeSafe)return damage;
 const w=normalizeLTQuality(weapon,{missile,balanceAllowed}),p=missile?normalizeLTQuality(projectile):null;
 policy={...policy,reducedAcc:missile&&w.reducedAcc===true,cheapMalfunctions:missile&&w.cheapMalfunctions===true};
 if(w.quality==='normal'&&w.balance==='normal'&&!w.silverCoated&&(!p||p.quality==='normal'&&p.balance==='normal'&&!p.silverCoated)&&!policy.reducedAcc&&!policy.cheapMalfunctions)return damage;
 let bonus=0,attackBonus=0,accBonus=0,rangeMultiplier=1;
 const balance=v=>v.balance==='balanced'?1:v.balance==='poor'?-1:0;
 if(missile){accBonus=balance(w);attackBonus=p?balance(p):0;if(w.quality==='fine')rangeMultiplier=1.2;}
 else attackBonus=balance(w);
 const relevant=missile?p:w;
 if(relevant&&/\s(?:cut|imp)(?:\s|$)/.test(damage.formula??''))bonus=relevant.quality==='fine'?1:relevant.quality==='very-fine'?2:0;
 if(bonus){
  const change=formula=>formula.replace(/^(\d+)d([+-]\d+)?/,(_,dice,adds)=>{const n=Number(adds??0)+bonus;return dice+'d'+(n?(n>0?'+':'')+n:'');});
  const original=damage.formula;damage.formula=change(original);
  damage.components=damage.components.map(c=>c.relation==='primary'?{...c,formula:change(c.formula)}:c);
  damage.transformations.push({source:'LT59; B274',effectId:'lt-quality-damage',field:'damage',from:original,to:damage.formula,applied:true,order:damage.transformations.length});
 }
 damage.rules.attackBonus=(damage.rules.attackBonus??0)+attackBonus;
 const changes=damage.effectiveChanges;
 if(Number.isFinite(changes.acc)){changes.acc=Math.max(0,changes.acc+accBonus);if(missile&&policy.reducedAcc)changes.acc=Math.floor(changes.acc/2);}
 if(rangeMultiplier!==1){
  const range=String(changes.range).split('/').map(Number);if(range.every(Number.isFinite))changes.range=range.map(n=>Number((n*rangeMultiplier).toPrecision(12))).join('/');
  for(const field of ['halfDamage','maximum'])if(Number.isFinite(damage.rules.ballisticRange?.[field]))damage.rules.ballisticRange[field]=Number((damage.rules.ballisticRange[field]*rangeMultiplier).toPrecision(12));
  if(damage.rules.ltBow?.flight){const b=damage.rules.ltBow;b.halfDamage=damage.rules.ballisticRange.halfDamage;b.flightDamage=b.distance!==null&&b.distance>b.halfDamage?'zero':'half';}
 }
 changes.damage=damage.formula;
 const breakage=v=>({cheap:2,fine:-1,'very-fine':-2,silver:2}[v.quality]??0);
 damage.rules.ltQuality={source:'LT59; B274,277',weapon:w,projectile:p,missile,damageBonus:bonus,attackBonus,accBonus,rangeMultiplier,breakage:{weapon:breakage(w),projectile:p?breakage(p):null},policy:structuredClone(policy),effectsManual:true};
 if(policy.cheapMalfunctions&&w.quality==='cheap'&&cheapMalf)damage.rules.ltQuality.weaponReliability={malf:cheapMalf,source:'LT75',consequence:'manual: mechanical jam or bow/sling breakage'};
 return damage;
}
