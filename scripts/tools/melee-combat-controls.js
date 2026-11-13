import { editorMeleeContext,meleeEditorProfiles,selectMeleeEditorProfile } from './melee-profile-editor.js';
import {unarmedSkills,unarmedSelection,resolveUnarmedAttack,saveUnarmedSkill,unarmedHint,unarmedParryHint} from './bs-unarmed.js';
import {UT_NEURAL_SETTINGS} from '../ut-exotic-melee-source.js';
import {weaponListIdentity} from './weapon-list-visibility.js';
import { MeleeProfileService, resolveMeleeProfile, resolveMeleeHands, meleeMartialGrips } from './melee-profile-service.js';
import { readActorStrength } from './strength-service.js';
import { weaponStrengthExplanation } from './weapon-strength-display.js';
import { StandaloneWeaponDraft, StandaloneWeaponService } from './standalone-weapon-service.js';
import { resolveStandaloneSkill } from './standalone-skill-service.js';

const defaultRoute = skill => skill?.resolved && ['attribute-default','skill-default'].includes(skill.source) && Number.isFinite(skill.defaultPenalty)
  ? skill.sourceName + (skill.defaultPenalty > 0 ? '+' + skill.defaultPenalty : skill.defaultPenalty < 0 ? String(skill.defaultPenalty) : '') : '';
const skillLabel=(name,skill)=>{const route=defaultRoute(skill);return name+(route&&route!==name?' ('+route+')':'');};
export function meleeOutcomeLabel(attack,damage){
  const special=attack?.meleeProfile?.utExotic??attack?.meleeProfile?.htSpecial;
  if(special?.instructionOnly){
    const effect=special.resistanceEffect;
    return effect?'Спасбросок '+effect.attribute+(effect.modifier>0?'+'+effect.modifier:effect.modifier<0?String(effect.modifier):''):'Специальное воздействие';
  }
  return 'Урон '+(damage||'-');
}
export const meleePhysicalAttackKey=(attack,actor=null)=>actor?(weaponListIdentity(actor,attack)??'attack:'+attack?.key):attack?.standaloneRef?'weapon:'+attack.standaloneRef.weaponId:attack?.equipmentRef?.instanceId?'equipment:'+attack.equipmentRef.instanceId:attack?.data?.parentuuid?'gga-equipment:'+attack.data.parentuuid:attack?.data?.eqtkey?'gga-path:'+String(attack.data.eqtkey).replace(/^system\./,''):'attack:'+attack?.key;
export function meleePhysicalAttackGroups(attacks,selectedKey,actor=null){
  const groups=new Map();
  for(const attack of attacks){const key=meleePhysicalAttackKey(attack,actor);if(!groups.has(key))groups.set(key,{key,attacks:[]});groups.get(key).attacks.push(attack);}
  return [...groups.values()].map(group=>({...group,attack:group.attacks.find(a=>a.key===selectedKey)??group.attacks[0]}));
}
function modeLabel(profile){
  if(['ut:zap-glove','ut:neuroglove'].includes(profile.modelId))return (profile.modelId==='ut:neuroglove'?'Neural':profile.resistanceEffect?.kind==='lethal'?'Kill':'Stun')+(profile.modeId.endsWith('Punch')?' + кулак':profile.contactProcedure?' – контакт':' – касание');
  return String(profile.usage||'Атака').replace(/ – связанный контакт$/u,'');
}

// The panel and the editor share persisted profile selections and the combat resolver.
// A published sibling mode is a different attack, never an extra grip of this mode.
export function meleeCombatControls(actor, attack,{attacks=[]}={}) {
  if(attack?.unarmedRef){
    const p=attack.unarmedRef.profile,selected=unarmedSelection(actor,attack),projected=resolveUnarmedAttack(actor,attack);
    return {context:null,record:null,profile:null,skills:[...(attack.unarmedRef.native?[{value:'',label:'Исходный итог GGA'}]:[]),...unarmedSkills(actor,p).map(s=>({value:s.name,label:s.name,disabled:!s.resolved}))],skill:selected.skill??(attack.unarmedRef.native?'':'DX'),grips:[{value:'published',label:'Безоружная атака'}],grip:'published',modes:[{value:attack.key,label:p.name}],mode:attack.key,modeSelection:'attack',neuralSettings:[],hint:[unarmedHint(p),unarmedParryHint(p,projected.meleeProfile.skill)].filter(Boolean).join(' ')+' '+(projected.meleeProfile.unarmed.alreadyIncluded?'Бонусы исходного Damage GGA сохранены.':'Бонус выбранного навыка: +'+projected.meleeProfile.unarmed.bonusPerDie+' за кубик базового thrust.')};
  }
  const context = editorMeleeContext(actor, attack);
  const profile = context?.profiles.find(p => p.modeId === (context.saved.modeId || context.source.modeId));
  const selection = context?.saved ?? {};
  const projected = context ? resolveMeleeProfile({ actor, attack, context }) : attack;
  const skills = [];
  if (context?.imported || !attack?.standaloneRef&&!attack?.equipmentRef?.virtual) skills.push({ value: '', label: 'Итог GGA' });
  if (profile) for (const name of profile.primarySkills) {
    const result = resolveMeleeProfile({ actor, attack, context, selection: { ...selection, skill: name } });
    const skill = result.meleeProfile?.skill;
    skills.push({ value: name, label: skillLabel(name,skill),
      hint: result.skillDescription ?? result.readinessReason ?? name, disabled: !skill?.resolved });
  }
  // Source-only records still use the catalog's permitted skills and its existing default resolver.
  const ref = attack?.standaloneRef;
  const record = !context && ref ? actor.getFlag('olegurps-qol', 'standaloneWeapons')?.weapons?.find(w => w.id === ref.weaponId) : null;
  const mode = record?.modes.find(m => m.modeId === ref.modeId);
  if (mode) {
    const source = mode.snapshot?.governing_skill;
    const candidates = source?.candidates ?? mode.snapshot?.governing_skill_selection?.candidates ?? (source?.skill ? [source.skill] : []);
    for (const skill of candidates) {
      const name = skill.name + (skill.specialization ? ' (' + skill.specialization + ')' : '');
      const resolved = resolveStandaloneSkill({actor,record,mode:{...mode,overrides:{...mode.overrides,governingSkill:name}}});
      if (!skills.some(s => s.value === name)) skills.push({ value: name, label: skillLabel(name,resolved), disabled: !resolved.resolved,
        hint: resolved.reason ?? '' });
    }
  }
  if (!skills.length) skills.push({ value: '', label: 'Навык не определён', disabled: true });
  const skill = selection.skill || (context?.imported || !ref&&!attack?.equipmentRef?.virtual ? '' : mode?.overrides?.governingSkill || profile?.primarySkills[0] || ref.governingSkill?.name || '');
  const strength = readActorStrength(actor).kinds.st.effective;
  const hands = resolveMeleeHands(profile?.stats.st ?? attack?.st, 'published', strength, profile?.hands ?? null, profile?.requiresTwoHands);
  const grips = [{ value: 'published', label: profile?.publishedGripLabel || (hands.hands === 2 ? 'Двуручный' : hands.hands === 1 ? 'Одноручный' : 'Штатный') }];
  if (profile && hands.symbol && !resolveMeleeHands(profile.stats.st, 'one-handed', strength, profile.hands, profile.requiresTwoHands).reason)
    grips.push({ value: 'one-handed', label: 'Одноручный (B270)' });
  if (profile) for (const grip of meleeMartialGrips(profile)) grips.push({ value: grip,
    label: grip === 'defensive' ? 'Defensive Grip' : grip === 'tip' ? 'Tip Grip (Thrust)' : 'Reversed Grip' });
  const grip = selection.grip || 'published';
  // A saved selection is never silently reset after ST/source changes.
  if (!grips.some(g => g.value === grip)) grips.push({ value: grip, label: 'Выбранный хват (сейчас недоступен)', disabled: true });
  const neuralSettings=profile?.neural?(selection.neuralSettings?.length?selection.neuralSettings:[selection.neuralSetting].filter(Boolean)).map(value=>({value,label:UT_NEURAL_SETTINGS[value]})):[];
  const siblings=attacks.filter(a=>meleePhysicalAttackKey(a,actor)===meleePhysicalAttackKey(attack,actor));
  const modes=context?meleeEditorProfiles(context,selection).map(p=>({value:p.modeId,label:modeLabel(p),hint:p.name+' – '+p.usage})):
    (siblings.length?siblings:[attack]).map(a=>({value:a.key,label:a.mode||a.data?.mode||'Атака',hint:a.label}));
  return { context, record, profile, skills, skill, grips, grip,modes,modeSelection:context?'profile':'attack',mode:profile?.modeId??attack.key,neuralSettings,neuralSetting:selection.neuralSetting,
    hint: [...(profile?.sourcePages ?? []), projected.meleeProfile?.strength?.ready ?? hands.ready,
      weaponStrengthExplanation(projected.meleeProfile?.weaponStrength??projected.weaponStrength,{baseLevel:projected.meleeProfile?.levelBeforeStrength}),
      ...(projected.meleeProfile?.gripEffects?.conditions ?? []),
      ...(profile?.tooltipHints ? projected.meleeProfile?.manualHints ?? [] : []),
      mode?.snapshot?.lt_flexible_manual,mode?.snapshot?.lt_tool_manual,mode?.snapshot?.ht_tool_manual,attack?.manualSourceHint].filter(Boolean).join(' ') };
}

export async function saveMeleeCombatControl(actor, attack, field, value) {
  if(attack?.unarmedRef&&field==='skill')return saveUnarmedSkill(actor,attack,value);
  const controls = meleeCombatControls(actor, attack);
  const rows = field === 'skill' ? controls.skills : field === 'grip' ? controls.grips : field==='modeId'?controls.modes:field==='neuralSetting'?controls.neuralSettings:[];
  if (!rows.some(row => row.value === value && !row.disabled)) throw Error('Этот вариант не разрешён для текущего режима.');
  if (controls.context) return new MeleeProfileService(actor).save(attack,
    field==='modeId'?selectMeleeEditorProfile(controls.context,controls.context.saved,field,value,actor,attack):{ ...controls.context.saved, [field]: value }, { context: controls.context });
  if (field === 'skill' && controls.record) {
    const catalogs = globalThis.OleGURPSQOL?.catalogs;
    const draft = new StandaloneWeaponDraft({ actor, catalogs, type: 'melee', existing: controls.record });
    draft.setOverride(attack.standaloneRef.modeId, 'governingSkill', value);
    return new StandaloneWeaponService(actor, catalogs).save(draft);
  }
  throw Error('Источниковый профиль оружия не определён.');
}

// A deliberate Attack-mode change selects that published row of the same instance.
// Keep its construction settings; incompatible skill/grip choices fall back to that row's defaults.
export async function selectMeleeCombatMode(actor, attack) {
  const context = editorMeleeContext(actor, attack);
  if (!context || !attack?.standaloneRef || !context.saved.modeId || context.saved.modeId === context.source.modeId) return;
  const profile = context.source, selection = { ...context.saved, modeId: profile.modeId };
  if (!profile.primarySkills.includes(selection.skill)) selection.skill = '';
  const grip = selection.grip || 'published';
  if (!meleeMartialGrips(profile).includes(grip) && resolveMeleeHands(profile.stats.st, grip, readActorStrength(actor).kinds.st.effective, profile.hands, profile.requiresTwoHands).reason)
    selection.grip = 'published';
  return new MeleeProfileService(actor).save(attack, selection, { context });
}

export function meleeCombatControlsHTML(controls, { mastery = false, visibility = false,
  governingSkills = null, governingSpecialty = '' } = {}, esc) {
  const options = (rows, value) => rows.map(row => `<option value="${esc(row.value)}" ${row.value === value ? 'selected' : ''} ${row.disabled ? 'disabled' : ''} title="${esc(row.hint ?? '')}">${esc(row.label)}</option>`).join('');
  const separator = '<span class="gam-melee-visibility-separator" aria-hidden="true">|</span>';
  // GGA keeps its original actor-skill/Targeted Attack selector, independently of catalog binding.
  const legacyGGA = Array.isArray(governingSkills);
  const skills = legacyGGA ? [{value:'',label:governingSkills.length?'Выберите навык':'Навыки не найдены'},
    ...governingSkills.map(skill=>({value:skill.value,label:String(skill.label??'').replace(/^DX\s*\(DX\)$/u,'DX')}))] : controls.skills;
  const skill = `<select name="${legacyGGA?'governingSpecialty':'meleePrimarySkill'}" aria-label="Основной навык" ${legacyGGA&&!governingSkills.length?'disabled':''}>${options(skills,legacyGGA?governingSpecialty:controls.skill)}</select>`;
  const grip = controls.grips.length > 1
    ? `<select name="meleeGrip" aria-label="Хват">${options(controls.grips, controls.grip)}</select>`
    : `<span data-melee-grip="published">${esc(controls.grips[0].label)}</span>`;
  return `<div class="gam-melee-governing-controls">
    <label class="gam-fire-governing-skill"><span>Основной навык:</span>${skill}</label>${separator}
    <label class="gam-melee-grip"><span>Хват:</span>${grip}${controls.hint ? `<span tabindex="0" data-tooltip="${esc(controls.hint)}" title="${esc(controls.hint)}" aria-label="${esc(controls.hint)}">(?)</span>` : ''}</label>
    ${controls.modes?.length>1?`<label class="gam-melee-mode"><span>Атака:</span><select name="meleeAttackMode" aria-label="Режим атаки" title="${esc(controls.modes.find(m=>m.value===controls.mode)?.hint??'')}">${options(controls.modes,controls.mode)}</select></label>`:''}${separator}
    <label class="gam-melee-rapid-mastery" title="Weapon Master / Trained by a Master для выбранной melee-атаки"><input type="checkbox" name="rapidStrikeMastery" ${mastery ? 'checked' : ''}><span>WM / TBaM</span></label>${separator}
    <label class="gam-melee-visibility-toggle"><input type="checkbox" name="meleeVisibility" ${visibility ? 'checked' : ''}><span>Видимость</span></label>
  </div>${controls.neuralSettings?.length>1?`<label>Воздействие Neural<select name="meleeNeuralSetting">${options(controls.neuralSettings,controls.neuralSetting)}</select> <span title="Смена настройки – Ready вручную. UT165.">(?)</span></label>`:''}`;
}
