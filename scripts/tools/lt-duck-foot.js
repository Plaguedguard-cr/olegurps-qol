import {ltEarlyProfile} from '../lt-early-firearms-source.js';

const degrees=angle=>angle*180/Math.PI;
const delta=(a,b)=>((a-b+540)%360)-180;
const point=t=>({x:t.center?.x??t.x+(t.w??0)/2,y:t.center?.y??t.y+(t.h??0)/2});
export function duckArcCandidates(origin,primary,tokens,offset=0){
 const o=point(origin),a=point(primary),center=degrees(Math.atan2(a.y-o.y,a.x-o.x))+offset;
 return {origin:o,center,targets:tokens.filter(t=>t.id!==origin.id&&t.id!==primary.id).map(t=>{const p=point(t),angle=delta(degrees(Math.atan2(p.y-o.y,p.x-o.x)),center);return {tokenId:t.id,actorId:t.actor?.id??null,name:t.name??t.document?.name??t.id,position:p,angle};}).filter(t=>Math.abs(t.angle)<=15&&Math.hypot(t.position.x-o.x,t.position.y-o.y)>0).sort((a,b)=>a.angle-b.angle)};
}
export function duckFootFieldsHTML(app,escape){
 if(ltEarlyProfile(app.attack?.standaloneRef?.modeId??app.weapon)?.kind!=='duck')return '';
 const draft=app._ltDuckDraft??{},primary=[...(globalThis.game?.user?.targets??[])];
 const target=primary.length===1?primary[0]:null,offset=Number(draft.offset??0),tokens=(globalThis.canvas?.tokens?.placeables??[]).filter(t=>globalThis.game?.user?.isGM||!t.document?.hidden&&t.isVisible!==false);
 const arc=target&&app.token?duckArcCandidates(app.token,target,tokens,offset):null;
 return `<fieldset data-duck-arc><legend>Duck’s Foot — залп четырёх стволов</legend><label>Точная дистанция, ярды<input name="projectileDistance" type="number" min="0" step="any" value="${escape(app.fireState.projectileDistance??'')}"></label>`+
  '<p>До 2 ярдов — одна цель, RoF1×4. При большей дистанции — один выстрел по основной цели и B389 для остальных в дуге30°, максимум четыре потенциальных попадания. LT93.</p>'+
  `<details><summary>Дуга и остальные цели для дистанции 3+ ярда</summary><p>Основная цель: ${escape(target?.name??'Отметьте ровно одну цель штатным Target в Foundry.')}</p>`+
  `<label>Смещение центра дуги относительно основной цели, градусы<input type="number" name="duck-offset" min="-15" max="15" step="any" value="${escape(offset)}"></label>`+
  `<label>Порядок<select name="duck-order"><option value="left-to-right" ${draft.order!=='right-to-left'?'selected':''}>Слева направо</option><option value="right-to-left" ${draft.order==='right-to-left'?'selected':''}>Справа налево</option></select></label>`+
  (arc?.targets??[]).map(t=>`<div data-duck-token="${escape(t.tokenId)}"><label><input type="checkbox" data-duck-include ${draft.targets?.[t.tokenId]?.include===false?'':'checked'}>${escape(t.name)} — может быть задет</label><label>Итоговый шанс намеренного выстрела по этой цели, ввод владельца<input type="number" data-duck-skill step="1" value="${escape(draft.targets?.[t.tokenId]?.skill??'')}"></label></div>`).join('')+
  `<label><input type="checkbox" name="duck-confirmed" ${draft.confirmed?'checked':''}>Дуга и список проверены; исключены цели, которые не могут быть задеты. Все остальные возможные цели указаны.</label>`+
  '<p>B389 использует меньшее из9 и введённого шанса. Защиты и применение Damage к каждой цели разрешаются отдельно; выбор дуги не наносит урон.</p></details></fieldset>';
}
export function captureDuckFootInputs(app){
 const root=app.element?.querySelector('[data-duck-arc]');if(!root)return;
 app._ltDuckDraft={offset:root.querySelector('[name=duck-offset]')?.value??'0',order:root.querySelector('[name=duck-order]')?.value??'left-to-right',confirmed:root.querySelector('[name=duck-confirmed]')?.checked===true,
  targets:Object.fromEntries([...root.querySelectorAll('[data-duck-token]')].map(row=>[row.dataset.duckToken,{include:row.querySelector('[data-duck-include]')?.checked===true,skill:row.querySelector('[data-duck-skill]')?.value??''}]))};
}
export function readDuckFootContext(app){
 if(ltEarlyProfile(app.attack?.standaloneRef?.modeId??app.weapon)?.kind!=='duck')return null;
 captureDuckFootInputs(app);const d=app._ltDuckDraft??{},targets=[...(globalThis.game?.user?.targets??[])],primary=targets.length===1?targets[0]:null;
 const offset=Number(d.offset??0),tokens=(globalThis.canvas?.tokens?.placeables??[]).filter(t=>globalThis.game?.user?.isGM||!t.document?.hidden&&t.isVisible!==false);
 const arc=primary&&app.token&&Number.isFinite(offset)?duckArcCandidates(app.token,primary,tokens,offset):null;
 const otherTargets=(arc?.targets??[]).filter(t=>d.targets?.[t.tokenId]?.include!==false).map(t=>({...t,purposeSkill:d.targets?.[t.tokenId]?.skill===''||d.targets?.[t.tokenId]?.skill===undefined?null:Number(d.targets[t.tokenId].skill)}));
 if(d.order==='right-to-left')otherTargets.reverse();
 return {version:1,widthDegrees:30,offset,order:d.order??'left-to-right',confirmed:d.confirmed===true,primaryTokenId:primary?.id??null,primaryPosition:primary?point(primary):null,origin:arc?.origin??null,centerAngle:arc?.center??null,otherTargets};
}
export function duckFootContextError(context){
 const a=context?.duckArc;if(!a||a.version!==1||a.widthDegrees!==30||a.confirmed!==true||!a.primaryTokenId||!Number.isFinite(a.offset)||Math.abs(a.offset)>15||!['left-to-right','right-to-left'].includes(a.order)||!Array.isArray(a.otherTargets))return 'Duck’s Foot: проверьте дугу30°, одну основную цель и список остальных целей.';
 const ids=new Set([a.primaryTokenId]);for(const t of a.otherTargets){if(!t.tokenId||ids.has(t.tokenId)||!Number.isSafeInteger(t.purposeSkill)||Math.abs(t.angle)>15)return 'Duck’s Foot: укажите отдельный целый шанс намеренного выстрела для каждой возможной цели в дуге.';ids.add(t.tokenId);}
 return null;
}
export async function resolveDuckFootChecks(profile,primaryResult,evaluate){
 if(!profile?.damage?.rules?.ltEarly?.duckFar)return null;
 const error=duckFootContextError(profile.context);if(error)throw Error(error);
 const targets=profile.context.duckArc.otherTargets,checks=[],rolls=[];let successes=primaryResult.failure?0:1;
 for(const target of targets){if(successes>=4)break;const chance=Math.min(9,target.purposeSkill);
  if(chance<3){checks.push({...structuredClone(target),chance,total:null,success:false,margin:null,reason:'effective-skill-below-3'});continue;}
  const {roll}=await evaluate('3d6[Duck Foot B389]'),total=Number(roll.total),criticalSuccess=total<=4,success=total<17&&(criticalSuccess||total<=chance);if(success)successes++;
  checks.push({...structuredClone(target),chance,total,success,criticalSuccess,margin:chance-total});rolls.push(roll);
 }
 return {checks,rolls,primarySuccess:!primaryResult.failure,potentialHits:successes,maximumHits:4,source:'LT93; B389',defensesManual:true};
}
export function duckFootResultHTML(result,escape){
 if(!result)return '';
 return `<p><strong>Duck’s Foot: ${result.potentialHits} потенциальных попаданий по отдельным целям.</strong></p>`+
  result.checks.map(c=>`<p>${escape(c.name)}: ${c.success?'проверка попадания успешна':'промах'}.</p>`).join('')+
  `<details class="olegurps-chat-details"><summary>Проверки остальных целей в дуге</summary><ol>${result.checks.map(c=>`<li>${escape(c.name)}: ${c.total===null?'шанс ниже 3, бросок невозможен (B345)':`3d6=${c.total}, шанс ${c.chance}, результат ${c.margin}${c.criticalSuccess?', критический успех (B347)':''}`}. B389.</li>`).join('')}</ol></details>`;
}
