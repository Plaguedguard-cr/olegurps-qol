// Source-scoped adjustments of native GGA Apply Damage instances. No system files,
// global calculator prototypes, Actor traits, targets or resources are changed here.
const SCOPE='olegurps-qol',installations=new WeakMap(),applications=new WeakMap();
const readable=m=>m&&m.visible!==false&&m.isContentVisible!==false;
const owner=(actor,rt)=>rt.game?.user?.isGM||actor?.isOwner===true;
export function exoticDamageProvenance(context){
 const rules=context?.shot?.damage?.rules,rule=rules?.exoticBeam??(rules?.plasmaGun?{...rules.plasmaGun,family:'plasma-gun'}:null);
 return context?.status==='linked'&&rule&&['force','graviton','ghost','disintegrator','conversion','reality','plasma-gun'].includes(rule.family)?
  {version:1,sourceMessageId:context.sourceMessageId,attackId:context.shot.attackId,component:context.component??'kinetic'}:null;
}
export function exoticDamageContract(payload,runtime=globalThis){
 const provenance=payload?.olegurpsExoticBeam;
 if(!provenance)return null;
 const source=runtime.game?.messages?.get(provenance.sourceMessageId),shot=source?.flags?.[SCOPE]?.shotSnapshot;
 const damage=shot?.profile?.damage,rule=damage?.rules?.exoticBeam??(damage?.rules?.plasmaGun?{...damage.rules.plasmaGun,family:'plasma-gun'}:null);
 if(provenance.version!==1||!readable(source)||shot?.version!==1||shot.attackId!==provenance.attackId||
  shot.correlation?.attackMessageId!==source.id||!damage?.nativeSafe||!rule||
  !['force','graviton','ghost','disintegrator','conversion','reality','plasma-gun'].includes(rule.family)||!['kinetic',...(rule.family==='ghost'?['collateral']:rule.family==='conversion'?['follow-up']:[])].includes(provenance.component))
  throw Error('Не удалось подтвердить сохранённый профиль энергетического урона.');
 const component=damage.components?.find(c=>c.role===provenance.component);
 if(component?.status!=='resolved'||!component.formula||!Number.isFinite(payload.damage)||payload.damage<0||
  payload.damageType!==(['disintegrator','reality'].includes(rule.family)||rule.family==='conversion'&&provenance.component==='kinetic'?'cor':['ghost','conversion','plasma-gun'].includes(rule.family)?'burn':'cr')||
  ['disintegrator','reality'].includes(rule.family)&&payload.armorDivisor!==-1||
  rule.family==='conversion'&&(payload.armorDivisor!==(provenance.component==='kinetic'?10:0)||provenance.component==='follow-up'&&payload.damageModifier!=='ex')||
  rule.family==='plasma-gun'&&(payload.armorDivisor!==2||payload.damageModifier!=='ex')||
  rule.family==='force'&&payload.damageModifier!=='dkb'||rule.family==='graviton'&&(payload.armorDivisor!==-1||payload.damageModifier!=='nkb')||
  rule.family==='ghost'&&(payload.damageModifier!=='ex'||payload.armorDivisor!==(provenance.component==='kinetic'?-1:0)))
  throw Error('Нативный урон не соответствует сохранённому энергетическому профилю.');
 return {...structuredClone(rule),component:provenance.component,provenance:structuredClone(provenance)};
}
const getter=(object,key,get)=>Object.defineProperty(object,key,{configurable:true,get});
export function configureExoticDamageApplication(app,contract,runtime=globalThis){
 const calc=app?._calculator;
 if(!calc||!Array.isArray(calc._calculators)||!calc._calculators.length||typeof app.resolveInjury!=='function'||typeof app.submitDirectApply!=='function')throw Error('Нативный Apply Damage несовместим с энергетическим профилем.');
 const state={contract,screenDR:0,realityStabilized:false,stasisWeb:false,primaryPenetrated:false,temporalImmune:false};applications.set(app,state);
 const direct=contract.family==='ghost'&&contract.component==='kinetic',stun=contract.family==='force'&&contract.kineticStun;
 if(stun)for(const individual of calc._calculators)getter(individual,'injury',()=>0);
 if(contract.family==='graviton'||direct){
  getter(calc,'effectiveDR',()=>Math.floor(state.screenDR/(contract.family==='graviton'?100:state.realityStabilized?5:Infinity)));
  if(direct){
   getter(calc,'totalWoundingModifier',()=>3*calc.effectiveVulnerabilityMultiple);
   // Internal explosions do not use the external blast / (3 × distance) rule.
   Object.defineProperty(calc,'isExplosion',{configurable:true,get:()=>false,set:()=>{}});
  }
 }else if(contract.family==='ghost'){
  calc.isExplosion=true;
 }
 const dis=['disintegrator','reality'].includes(contract.family),follow=contract.family==='conversion'&&contract.component==='follow-up';
 if(dis){
  getter(calc,'effectiveDR',()=>state.stasisWeb||contract.family==='reality'&&state.temporalImmune?Infinity:contract.family==='disintegrator'?Math.floor(state.screenDR/10):state.realityStabilized?state.screenDR:0);
  for(const individual of calc._calculators){const original=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(individual),'injury')?.get;
   if(original)getter(individual,'injury',()=>state.stasisWeb||contract.family==='reality'&&state.temporalImmune?0:original.call(individual));}
 }
 if(follow){
  calc.isExplosion=true;
  const proto=Object.getPrototypeOf(calc),dr=Object.getOwnPropertyDescriptor(proto,'effectiveDR').get,wound=Object.getOwnPropertyDescriptor(proto,'totalWoundingModifier').get;
  getter(calc,'effectiveDR',()=>state.primaryPenetrated?0:dr.call(calc));
  getter(calc,'totalWoundingModifier',()=>state.primaryPenetrated?3*calc.effectiveVulnerabilityMultiple:wound.call(calc));
  Object.defineProperty(calc,'isExplosion',{configurable:true,get:()=>!state.primaryPenetrated,set:()=>{}});
 }
 const originalResolve=app.resolveInjury;
 app.resolveInjury=function(keepOpen,_injury,publicly,results){
  if(!owner(app.actor,runtime))throw Error('Нет прав применять урон к этому персонажу.');
  // Both native Apply paths use the computed injury, including legitimate blunt trauma.
  const result=originalResolve.call(this,keepOpen,calc.pointsToApply,publicly,results);
  if(dis)Promise.resolve(result).then(()=>{const hp=app.actor.system?.HP;if(hp&&hp.value<=-10*hp.max)runtime.ui?.notifications?.info?.('Цель достигла порога дезинтеграции (−10×HP). UT130.');});
  return result;
 };
 app.submitDirectApply=function(keepOpen,publicly){return this.resolveInjury(keepOpen,calc.pointsToApply,publicly);};
 return state;
}
export function updateExoticScreen(app,{screenDR,realityStabilized=false,stasisWeb=false,primaryPenetrated=false,temporalImmune=false}){
 const state=applications.get(app);
 if(!state||!Number.isSafeInteger(screenDR)||screenDR<0||screenDR>1000000000||[realityStabilized,stasisWeb,primaryPenetrated,temporalImmune].some(v=>typeof v!=='boolean'))throw Error('Укажите целый неотрицательный DR применимого экрана.');
 state.screenDR=screenDR;state.realityStabilized=realityStabilized;state.stasisWeb=stasisWeb;state.primaryPenetrated=primaryPenetrated;state.temporalImmune=temporalImmune;return app._calculator.effectiveDR;
}
function renderProtection(app,html,runtime){
 const state=applications.get(app);if(!state)return;
 const root=html?.[0]??html;if(!root?.querySelector||root.querySelector('[data-exotic-protection]'))return;
 const {contract}=state,direct=contract.family==='ghost'&&contract.component==='kinetic';
 const box=runtime.document.createElement('fieldset');box.dataset.exoticProtection='true';
 if(contract.family==='plasma-gun'){
  box.innerHTML='<p>Plasma/Fusion: (2), burn ex. \u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u0432\u0437\u0440\u044b\u0432 \u2014 \u0448\u0442\u0430\u0442\u043d\u044b\u0439 \u0440\u0435\u0436\u0438\u043c GGA, B414.</p>';
 }else if(['disintegrator','reality','conversion'].includes(contract.family)){
  const follow=contract.family==='conversion'&&contract.component==='follow-up',dis=contract.family!=='conversion';
  box.innerHTML='<legend>'+ (follow?'Follow-Up — B381, B415':contract.family==='conversion'?'Corrosion (10) — UT131':'Защита — '+contract.source)+'</legend>';
  const check=(name,label,value)=>'<label><input type="checkbox" name="'+name+'"'+(value?' checked':'')+'>'+label+'</label>';
  if(dis)box.innerHTML+='<label>'+ (contract.family==='reality'?'Применимый Reality-Stabilized DR':'DR Force Screen')+'<input name="screenDR" type="number" min="0" max="1000000000" value="'+state.screenDR+'"></label>'+check('stasisWeb','Stasis Web (UT193)',state.stasisWeb);
  if(contract.family==='reality')box.innerHTML+=check('realityStabilized','Защита Reality-Stabilized',state.realityStabilized)+check('temporalImmune','Temporal Inertia: применимость иммунитета подтверждена ведущим',state.temporalImmune);
  if(follow)box.innerHTML+=check('primaryPenetrated','Основной cor пробил DR этой цели: внутренний взрыв',state.primaryPenetrated)+'<p>Без проникновения: внешний взрыв, обычный DR; дистанция в GGA. Radiation/surge — вручную.</p>';
  box.addEventListener('change',()=>{try{const values={screenDR:0};for(const input of box.querySelectorAll('input'))values[input.name]=input.type==='checkbox'?input.checked:input.value.trim()===''?NaN:Number(input.value);updateExoticScreen(app,values);app.render(false);}catch(e){runtime.ui?.notifications?.warn?.(e.message);}});
 }else if(contract.family==='graviton'||direct){
  box.innerHTML=`<legend>${direct?'Внутренний взрыв — UT131':'Гравитон — UT129'}</legend><label>DR применимого силового экрана<input name="exoticScreenDR" type="number" min="0" max="1000000000" step="1" value="${state.screenDR}"></label>`+
   (direct?`<label><input type="checkbox" name="exoticRealityStabilized"${state.realityStabilized?' checked':''}>Экран Reality-Stabilized (DR/5)</label>`:'<p>Force Screen: DR/100.</p>')+
   `<p>Обычный DR игнорируется.${direct?' Повреждение после экрана ×3; обычный силовой экран не защищает.':''}</p>`;
  box.addEventListener('change',()=>{const field=box.querySelector('[name=exoticScreenDR]');
   try{updateExoticScreen(app,{screenDR:field.value.trim()===''?NaN:Number(field.value),realityStabilized:box.querySelector('[name=exoticRealityStabilized]')?.checked??false});app.render(false);}
   catch(e){field.value=String(state.screenDR);runtime.ui?.notifications?.warn?.(e.message);}});
 }else box.innerHTML='<p>'+ (contract.family==='force'?'Kinetic Stun: обычных ран нет; полный бросок и двойное отбрасывание, blunt trauma сохраняется. UT128.':'Побочный взрыв: обычный DR и обычное повреждение; дистанция от взрыва — в штатном поле GGA. UT131.')+'</p>';
 (root.querySelector('form')??root).prepend(box);
}
export function installExoticBeamDamage(runtime=globalThis){
 if(installations.has(runtime))return installations.get(runtime);
 const prototype=runtime.CONFIG?.Actor?.documentClass?.prototype,original=prototype?.handleDamageDrop;
 if(typeof original!=='function')return null;
 const wrapped=async function(data,...args){
  const items=Array.isArray(data)?data:[data];
  if(!items.some(d=>d?.olegurpsExoticBeam))return original.call(this,data,...args);
  try{
   if(!owner(this,runtime))throw Error('Нет прав применять урон к этому персонажу.');
   const contracts=items.map(d=>exoticDamageContract(d,runtime));
   if(contracts.some(c=>!c)||contracts.some(c=>JSON.stringify(c)!==JSON.stringify(contracts[0])))throw Error('Разрешайте разные компоненты энергетического урона отдельно.');
   const {default:ApplyDamageDialog}=await (runtime.__olegurpsExoticDamageLoader?.()??import('/systems/gurps/module/damage/applydamage.js'));
   // GGA's fixed default DOM id can reuse another open Apply instance. Each
   // source-scoped calculator must retain its own native form and listeners.
   const app=new ApplyDamageDialog(this,data,{id:'olegurps-exotic-apply-'+(runtime.crypto??globalThis.crypto).randomUUID()});
   configureExoticDamageApplication(app,contracts[0],runtime);app.render(true);return app;
  }catch(e){runtime.ui?.notifications?.error?.(e.message);throw e;}
 };
 prototype.handleDamageDrop=wrapped;
 const hook=runtime.Hooks?.on('renderApplyDamageDialog',(app,html)=>renderProtection(app,html,runtime));
 const installation={uninstall(){if(prototype.handleDamageDrop===wrapped)prototype.handleDamageDrop=original;if(hook!==undefined)runtime.Hooks.off('renderApplyDamageDialog',hook);installations.delete(runtime);}};
 installations.set(runtime,installation);return installation;
}
