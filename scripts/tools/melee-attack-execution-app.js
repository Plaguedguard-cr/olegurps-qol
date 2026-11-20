import {notifyMeleeExecutionError} from './melee-execution-state.js';
import { moduleMessage, moduleText } from "../localization.js";
import { buildRandomHitLocationsHtml } from "./hit-location-result.js";
import { executeNativeMeleeAttack,executeNativeMeleeDamage } from "./melee-service.js";
import { withClearedFoundryTargets,withFoundryTargets } from "./foundry-targets.js";
import {withMeleeTechniqueExecution} from './melee-technique-sequences.js';
import {sequenceUseCount,recordSequenceUse,recordInitialCarvingPart,initialCarvingProgress,nativeTechniqueCheck} from './melee-technique-procedures.js';
import {prepareStrikeAttack,recordStrikeOutcome,finishEarClapPair} from './melee-strike-procedures.js';
import {prepareWhirlwindStrike} from './melee-strike-sequence.js';
import {rollCriticalTable} from './critical.js';
import {maRussian,movementChecks,movementOutcome} from './ma-combat-options.js';

const ApplicationV2 = globalThis.foundry?.applications?.api?.ApplicationV2;
const escapeHTML = value => globalThis.foundry?.utils?.escapeHTML
  ? globalThis.foundry.utils.escapeHTML(String(value ?? ""))
  : String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);

async function executeMeleeAttackSnapshotUnlocked(input) {
  if(input.sequence?.kind==='whirlwind'&&!input.whirlwindPrepared){
    await prepareWhirlwindStrike(input);
    input.whirlwindPrepared=true;
  }
  const snapshot={...input,damageOptions:{...input.damageOptions}};
  const carvingPlan=snapshot.combatCalculation?.metadata?.meleeTechniques;
  if(carvingPlan?.results?.some(r=>r.id==='initialCarving')){
    const c=carvingPlan.selection.context;
    if(!c.carvingId)throw Error('Начните новую надпись.');
    const progress=initialCarvingProgress(snapshot.actor,c),existing=progress.entry;
    const signature=JSON.stringify([c.manualTarget??null,c.targetLocationKeys??[],snapshot.techniqueTargets??[]]);
    if(existing&&((existing.letter??'')!==(c.letter??'')||existing.strokeCount!==c.strokeCount||existing.targetSignature!==signature))throw Error('Для другой цели, зоны или буквы нажмите «Начать заново».');
    if(c.autoCarvingProgress&&(progress.finished&&!c.retryCarving||c.stroke!==(c.retryCarving?progress.completed:progress.stroke)))throw Error('Штрих уже изменился. Вернитесь к панели техники и выберите следующий штрих.');
    if(c.stroke>1&&!existing?.parts.some(p=>p.stroke===1&&p.hit&&p.mark!==false))throw Error('Нет первого движения, способного оставить исходную отметину. Повторите первое движение этой буквы.');
    if(c.stroke>1&&!existing?.parts.some(p=>p.stroke===c.stroke-1))throw Error('Сначала исполните предыдущее движение этой буквы.');
  }
  if(input.sequence||input.combatCalculation?.metadata?.meleeTechniques)snapshot.damageOptions.techniqueTargets=structuredClone(input.techniqueTargets??[]);
  if(snapshot.sequence){
    const sequence={...snapshot.sequence,useOrdinal:sequenceUseCount(snapshot.actor,snapshot.sequence)+1};
    sequence.repeatedDefenseBonus=sequence.kind==='combination'&&sequence.useOrdinal>=3?1:0;
    snapshot.sequence=sequence;snapshot.damageOptions.sequence=sequence;
    snapshot.overrideText=(snapshot.overrideText??'')+'<details class="olegurps-chat-details"><summary>Условия последовательности</summary><p>'+escapeHTML(sequence.name)+
      '; защита цели '+(sequence.defenseModifier??0)+'; повторное применение: +'+sequence.repeatedDefenseBonus+' к защите.</p></details>';
  }
  const attempt=snapshot.blindFightingAttempt;
  if (attempt?.result === 'success' &&
      (attempt.used || snapshot.isBlindFightingCurrent && !snapshot.isBlindFightingCurrent())) {
    throw Error(moduleText('OleGURPS.Melee.BlindFightingUsed'));
  }
  if(attempt)attempt.used=true;
  let result;
  try {
  if(snapshot.feint){
    const outcome=await nativeTechniqueCheck({actor:snapshot.actor,name:snapshot.feint.name,
      level:snapshot.effectiveSkill,details:maRussian()?'Своя часть состязания. Разрешите результат вручную (B365, MA127).':
        'Your side of the contest. Resolve the contest manually (B365, MA127).'});
    return {...outcome,hit:false,completed:outcome.rolled};
  }
  const combatOptions=snapshot.damageOptions.maOptions;
  if(combatOptions?.movement){
    if(!snapshot.maSelection?.movementConfirmed)
      throw Error(maRussian()?'Подтвердите, что после движения цель будет в пределах досягаемости (MA107).':
        'Confirm that the target is in reach after movement (MA107).');
    combatOptions.movementStages??=[];
    const checks=movementChecks(snapshot.actor,combatOptions.movement,snapshot.maSelection);
    for(const check of checks.slice(combatOptions.movementStages.length)){
      if(check.level<3)throw Error(maRussian()?'Навык для следующего этапа ниже 3 (B345).':
        'Effective skill for the next stage is below 3 (B345).');
      const name=check.count?check.name+' '+check.step+'/'+check.count:check.name;
      const outcome=await nativeTechniqueCheck({actor:snapshot.actor,name,level:check.level,details:'MA105-107, B352'});
      if(!outcome.rolled)return outcome;
      const resolution=movementOutcome(check,outcome);
      combatOptions.movementReceipt={procedure:check.procedure,success:outcome.success,criticalFailure:outcome.criticalFailure,
        target:outcome.finaltarget,total:outcome.total,messageId:outcome.message.id};
      combatOptions.movementStages.push(combatOptions.movementReceipt);
      const instructions=resolution.manual?(maRussian()?' Продолжайте атаку, только если цель осталась в пределах досягаемости.':
        ' Continue the attack only if the target remains in reach.'):'';
      await outcome.message.update({content:outcome.message.content+'<p>'+escapeHTML(resolution.text+instructions)+'</p>'});
      if(resolution.manual)return {movementConfirmation:true,message:outcome.message};
      if(resolution.stop)return {completed:true,reason:'movement-failed',message:outcome.message,hit:false};
    }
  }
  const prerequisite=await prepareStrikeAttack(snapshot);
  if(!prerequisite.allowed)return prerequisite;
  if(prerequisite.receipt){
    input.strikePrerequisite=prerequisite.receipt;
    snapshot.damageOptions.strikePrerequisite=structuredClone(prerequisite.receipt);
    if(prerequisite.receipt.kind==='spinningContest'){
      const modifier=prerequisite.receipt.modifier;
      snapshot.deceptiveDefensePenalty=Number(snapshot.deceptiveDefensePenalty??0)+modifier;
      snapshot.overrideText=(snapshot.overrideText??'')+'<p>Quick Contest Spinning Attack: защита цели '+(modifier>0?'+':'')+modifier+'.</p>';
    }
  }
  const roll = () => executeNativeMeleeAttack({
    actor: snapshot.actor,
    sourceAttack: snapshot.sourceAttack,
    expectedExecution:snapshot.executionState,
    effectiveSkill: snapshot.effectiveSkill,
    locationText: snapshot.locationText,
    overrideText: snapshot.overrideText,
    modifierDetails: snapshot.modifierDetails,
    captureMessage: true,
    maneuver: snapshot.maneuver,
    deceptiveDefensePenalty: snapshot.deceptiveDefensePenalty,
    telegraphicCriticalBonus: snapshot.telegraphicCriticalBonus,
    damageOptions: snapshot.damageOptions, combatCalculation: snapshot.combatCalculation,
    maManeuverEffort:snapshot.maManeuverEffort,
    skillCap: snapshot.skillCap
  });
  result = snapshot.clearTargets||snapshot.sequence?.kind==='whirlwind'&&!snapshot.targetIds?.length ? await withClearedFoundryTargets(roll) : snapshot.sequence&&snapshot.targetIds?.length?
    await withFoundryTargets(snapshot.targetIds,roll):await roll();
  if(snapshot.sequence||carvingPlan?.strikes?.length){
    const native=result.rollData??globalThis.GURPS?.lastTargetedRolls?.[snapshot.actor.id];
    const linked=Number(native?.rtotal)===Number(result.message?.rolls?.[0]?.total);
    result.criticalSuccess=linked&&native?.isCritSuccess===true;
    result.criticalFailure=linked&&native?.isCritFailure===true;
    result.strikeMargin=linked&&Number.isFinite(Number(native.finaltarget))?Number(native.finaltarget)-Number(native.rtotal):null;
  }
  if(result.message){
    if(snapshot.sequence){await recordSequenceUse(snapshot.actor,snapshot.sequence);await result.message.setFlag('olegurps-qol','meleeSequenceOutcome',snapshot.sequence);}
    const plan=snapshot.combatCalculation?.metadata?.meleeTechniques;
    if(plan?.strikes)await recordStrikeOutcome(result.message,snapshot.actor,plan,result,null,snapshot.earPair??null);
    if(plan?.results?.some(r=>r.id==='initialCarving'))await recordInitialCarvingPart(result.message,{rollData:result.rollData,hit:result.hit});
    if(plan?.results?.some(r=>r.id==='pressurePointStrike')){
      await result.message.setFlag('olegurps-qol','meleeTechniqueProcedure',{version:1,kind:'pressurePointStrike',attackHit:result.hit!==false,status:result.hit===false?'attack-missed':'awaiting-defense-and-penetration'});
      const secret=/^Pressure Secrets/i.test(plan.selection.context.pressureSkill);
      const html='<details class="olegurps-chat-details"><summary>Pressure-Point Strike – продолжение</summary><button type="button" data-melee-pressure-followup="'+(secret?'hit':'penetrated')+'">'+
        (secret?'Атака прошла защиту: Pressure Secrets':'Атака прошла защиту, проник ≥1 Damage: Pressure Points')+'</button>'+
        (secret?'':'<button type="button" data-melee-pressure-defense>HT roll владельца цели</button><button type="button" data-melee-pressure-resolve>Разрешить Quick Contest</button>')+'</details>';
      await result.message.update({content:result.message.content+(result.hit===false?'<details class="olegurps-chat-details"><summary>Pressure-Point Strike</summary><p>Атака не попала; особая процедура не выполняется.</p></details>':html)});
    }
  }
  if (result.success && result.hit !== false && snapshot.randomLocation) {
    try {
      const random = await snapshot.targetingService.resolveRandomHitLocation();
      const html = buildRandomHitLocationsHtml([random], {
        escapeHtml: escapeHTML,
        contourTitle: "\u041a\u043e\u043d\u0442\u0443\u0440\u043d\u043e\u0435 \u0440\u0438\u0441\u043e\u0432\u0430\u043d\u0438\u0435"
      });
      if (result.message?.update) {
        const content = String(result.message.content ?? result.message._source?.content ?? "");
        await result.message.update({ content: content + html });
      } else {
        ui.notifications.warn("\u0410\u0442\u0430\u043a\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430, \u043d\u043e \u0441\u043b\u0443\u0447\u0430\u0439\u043d\u0443\u044e Hit Location \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432 \u0435\u0451 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435.");
      }
    } catch (error) {
      console.error("Помощник ближнего боя random Зона попадания:", error);
      ui.notifications.warn("\u0410\u0442\u0430\u043a\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430, \u043d\u043e \u0441\u043b\u0443\u0447\u0430\u0439\u043d\u0443\u044e Hit Location \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c.");
    }
  }
  return { ...result, completed: result.success || !!result.message };
  } finally {if(attempt&&!result?.success&&!result?.message)attempt.used=false;}
}

export async function executeMeleeAttackSnapshot(snapshot){
  return snapshot.sequence||snapshot.combatCalculation?.metadata?.meleeTechniques||snapshot.damageOptions?.maOptions?
    withMeleeTechniqueExecution(()=>executeMeleeAttackSnapshotUnlocked(snapshot)):executeMeleeAttackSnapshotUnlocked(snapshot);
}

export class MeleeAttackExecutionApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["olegurps-qol", "melee-attack-execution"],
    tag: "section",
    window: { title: "\u0410\u0442\u0430\u043a\u0438", resizable: false, minimizable: true },
    position: { width: 310, height: "auto" }
  };

  constructor({ slots, onClose }, options = {}) {
    super(options);
    this.slots = slots.map(slot => ({ ...slot, completed: false }));
    this.onClose = onClose;
    this._busy = false;
    this._closed = false;
    this._failedSequenceTargets=new Set();
    this._boundClick = this._onClick.bind(this);
  }

  async _prepareContext() { return {}; }

  async _renderHTML() {
    return `<div class="gam-melee-execution-list">${this.slots.map((slot, index) => `
      <button type="button" data-execution-slot="${index}" ${slot.completed||this._blockedByPrior(slot) ? "disabled" : ""}>
        <strong>${escapeHTML(slot.movementConfirmation?(maRussian()?'Цель в досягаемости. Атаковать':'Target in reach. Attack'):slot.label)}${slot.completed ? " \u2713" : ""}</strong>
        <small>${escapeHTML(slot.effectiveSkill)} \u00b7 ${escapeHTML(slot.hitLocationLabel || "Зона попадания")}${slot.martialSummary ? " \u00b7 " + escapeHTML(slot.martialSummary) : ""}</small>
      </button>${slot.awaitingDefense?`<div><button type="button" data-sequence-defense="${index}" data-defended="yes">Защита цели удалась</button><button type="button" data-sequence-defense="${index}" data-defended="no">Атака прошла защиту</button>${slot.sequence.kind==='whirlwind'?'<button type="button" data-sequence-defense="'+index+'" data-defended="critical">Критический успех защиты</button>':''}</div>`:''}
      ${slot.awaitingDamage?`<div>${slot.damageRolled?'':`<button type="button" data-sequence-damage="${index}" data-damage-step="roll">Бросить Damage</button>`}<button type="button" data-sequence-damage="${index}" data-damage-step="done">Урон разрешён</button></div>`:''}
      ${(slot.sequence||slot.movementConfirmation)&&!slot.completed?`<button type="button" data-sequence-cancel="${index}">${maRussian()?'Отменить эту атаку':'Cancel this attack'}</button>`:''}`).join("")}</div>`;
  }

  _replaceHTML(result, content) { content.innerHTML = result; }

  _blockedByPrior(slot){
    return ['combination','whirlwind'].includes(slot.sequence?.kind)&&this.slots.some(other=>
      other.sequence?.id===slot.sequence.id&&other.sequence.index<slot.sequence.index&&(!other.completed||other.awaitingDefense||other.awaitingDamage));
  }

  _finished(){
    return this.slots.every(slot=>slot.completed&&!slot.awaitingDefense&&!slot.awaitingDamage);
  }

  async _finishWhirlwind(slot,outcome){
    const remaining=this.slots.filter(other=>other.sequence?.id===slot.sequence.id&&other.sequence.index>=slot.sequence.index);
    if(outcome==='critical'){
      for(const other of remaining){
        const sequence=other.sequence;
        if(!other.criticalTableId){
          const message=await rollCriticalTable(other.sourceAttack.unarmedRef?'unarmed':'miss',{
            actor:other.actor,context:'Whirlwind Attack. '+other.label,flags:{'olegurps-qol':{meleeWhirlwindCritical:sequence}}
          });
          other.criticalTableId=message?.id??null;
        }
        other.completed=true;other.awaitingDefense=false;
      }
    }else if(outcome==='hit'&&slot.sequence.stuck){
      for(const later of remaining.slice(1)){later.completed=true;later.cancelled=true;}
    }
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element?.removeEventListener("click", this._boundClick);
    this.element?.addEventListener("click", this._boundClick);
  }

  async _onClick(event) {
    const defense=event.target.closest?.('[data-sequence-defense]'),cancel=event.target.closest?.('[data-sequence-cancel]');
    const damage=event.target.closest?.('[data-sequence-damage]');
    if(damage?.dataset?.sequenceDamage!==undefined&&!this._busy){
      const slot=this.slots[Number(damage.dataset.sequenceDamage)];
      if(!slot?.awaitingDamage)return;
      this._busy=true;
      try{
        const message=globalThis.game?.messages?.get(slot.resultMessageId);
        if(damage.dataset.damageStep==='roll'&&!slot.damageRolled){
          const action=message?.getFlag('olegurps-qol','shotSnapshot')?.profile?.damage?.rules?.meleeSnapshot?.action;
          if(!action)throw Error('В сообщении атаки нет сохранённого Damage.');
          const roll=()=>executeNativeMeleeDamage({actor:slot.actor,preparedDamage:{action}});
          slot.damageRolled=await withFoundryTargets(slot.targetIds??[],roll);
        }else if(damage.dataset.damageStep==='done'){
          await message?.setFlag('olegurps-qol','meleeWhirlwindDamageResolved',true);
          slot.awaitingDamage=false;
          if(this._finished())return await this.close();
        }
      }catch(error){notifyMeleeExecutionError(error);}
      finally{this._busy=false;if(!this._closed)await this.render({force:true});}
      return;
    }
    if(defense?.dataset?.sequenceDefense!==undefined&&!this._busy){const slot=this.slots[Number(defense.dataset.sequenceDefense)];if(!slot?.awaitingDefense)return;
      this._busy=true;
      try{
        const decision=defense.dataset.defended;
        if(slot.sequence.kind==='whirlwind'){
          await this._finishWhirlwind(slot,decision==='critical'?'critical':decision==='no'?'hit':'defended');
          slot.awaitingDamage=decision==='no';
        }
        if(slot.resultMessageId)await globalThis.game?.messages?.get(slot.resultMessageId)?.setFlag('olegurps-qol','meleeSequenceDefense',{defended:decision!=='no',critical:decision==='critical',source:'explicit-owner-report'});
        slot.awaitingDefense=false;
        if(slot.earPair){
          slot.passedDefense=decision==='no';
          await finishEarClapPair(this.slots.filter(other=>other.earPair?.id===slot.earPair.id));
        }
        if(decision==='yes')this._failedSequenceTargets.add(slot.sequence.targetId);
        if(this._finished())return await this.close();
      }catch(error){notifyMeleeExecutionError(error);}
      finally{this._busy=false;if(!this._closed)await this.render({force:true});}
      return;
    }
    if(cancel?.dataset?.sequenceCancel!==undefined&&!this._busy){const slot=this.slots[Number(cancel.dataset.sequenceCancel)];if(!slot||slot.completed)return;
      for(const candidate of this.slots)if(candidate===slot||['combination','whirlwind'].includes(slot.sequence?.kind)&&candidate.sequence?.id===slot.sequence.id&&!candidate.completed){candidate.completed=true;candidate.cancelled=true;}
      if(this._finished())return this.close();await this.render({force:true});return;}
    const button = event.target instanceof Element ? event.target.closest("button[data-execution-slot]") : null;
    if (!button || this._busy || this._closed) return;
    const index = Number(button.dataset.executionSlot);
    const slot = this.slots[index];
    if (!slot || slot.completed || this._blockedByPrior(slot)) return;
    if(slot.sequence?.kind==='combination'){
      const prior=this.slots.filter(s=>s.sequence?.id===slot.sequence.id&&s.sequence.index<slot.sequence.index);
      if(prior.some(s=>!s.completed||s.awaitingDefense)){globalThis.ui?.notifications?.warn('Сначала завершите предыдущие шаги Combination и укажите результат защиты.');return;}
      if(this._failedSequenceTargets.has(slot.sequence.targetId)){
        slot.sequence={...slot.sequence,defenseModifier:3};slot.damageOptions.sequence=slot.sequence;
      }
    }
    this._busy = true;
    for (const control of this.element?.querySelectorAll("button[data-execution-slot]") ?? []) control.disabled = true;
    try {
      const result = await executeMeleeAttackSnapshot(slot);
      if (this._closed) return;
      if (result.completed) {
        slot.completed = true;
        slot.resultMessageId=result.message?.id??null;
        if(slot.sequence?.kind==='combination'){
          slot.awaitingDefense=result.hit!==false&&!result.criticalSuccess;
          if(result.hit===false)this._failedSequenceTargets.add(slot.sequence.targetId);
        }
        if(slot.sequence?.kind==='whirlwind'){
          slot.awaitingDefense=result.hit!==false&&!result.criticalSuccess;
          slot.awaitingDamage=result.hit!==false&&result.criticalSuccess;
          if(result.criticalFailure||result.criticalSuccess)await this._finishWhirlwind(slot,result.criticalFailure?'critical':'hit');
        }
        if(slot.earPair){
          slot.awaitingDefense=result.hit!==false&&!result.criticalSuccess;
          slot.passedDefense=result.hit!==false&&result.criticalSuccess;
          await finishEarClapPair(this.slots.filter(other=>other.earPair?.id===slot.earPair.id));
        }
        if (this._finished()) return await this.close();
      } else if(result.movementConfirmation) {
        slot.movementConfirmation=true;
      } else {
        ui.notifications.warn("\u0411\u0440\u043e\u0441\u043e\u043a \u043d\u0435 \u0431\u044b\u043b \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.");
      }
    } catch (error) {
      console.error("Помощник ближнего боя attack " + slot.label + ":", error);
      notifyMeleeExecutionError(error);
    } finally {
      this._busy = false;
      if (!this._closed && this.rendered) await this.render({ force: true });
    }
  }

  async close(options = {}) {
    if (this._closed) return;
    this._closed = true;
    const result = await super.close(options);
    this.slots = [];
    this.onClose?.();
    return result;
  }
}
