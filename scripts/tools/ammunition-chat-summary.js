import { moduleText } from '../localization.js';
import {utSwarmType} from '../ut-swarm-source.js';

// Presentation only: never read current stocks, recalculate damage or interpret user prose.
const unique = values => [...new Set(values.filter(Boolean))];
const text = key => moduleText('OleGURPS.UTPayload.' + key);
export function compactAmmoSource(value) {
  const result = [];
  for (const match of String(value ?? '').matchAll(/(Ultra-Tech(?:\s+2007)?|High-Tech|Low-Tech|UT|HT|LT|B)\s*,?\s*(?:pp?\.\s*)?(\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*)/g)) {
    result.push((/Ultra|UT/.test(match[1]) ? 'UT' : /High|HT/.test(match[1])?'HT':/Low|LT/.test(match[1])?'LT':'B') + match[2].replace(/\s/g, '').replaceAll('-', '–'));
  }
  return unique(result).join('; ');
}
const utSources = {
  ut_aphc:'UT152',ut_apds:'UT152',ut_apep:'UT152',ut_hp:'UT154',ut_shotshell:'UT154',
  ut_drugged_dart:'UT139,161',ut_drugged_ice:'UT140',ut_paint:'UT139',ut_solid_slug:'UT139',
  ut_biochemical_aerosol:'UT153',ut_biochemical_liquid:'UT153',ut_tangler:'UT155',ut_sefop:'UT146,154–155',ut_swarm:'UT156'
};
export function utBriefInstructions(variantId, { caliberMm, doses, ammunitionSupply, payload = {}, row = {}, source, rules = {} } = {}) {
  if(variantId==='ut_drugged_dart'&&(ammunitionSupply??rules.ammunitionSupply)?.supply==='external-prepared')return [
    'Готовый внешний дротик: одна доза; эффект препарата при проникновении — вручную.', 'UT139–140,161'];
  if(variantId==='ut_he'&&payload.fuze==='proximity')return [
    'HE — Proximity. Минимум 40 ярдов; атака области +4.',
    'Точка подрыва и попадания осколков — вручную.', 'UT153–154'];
  if(variantId==='ut_homing'){
    const h=rules.manualHoming;
    const special=h?.guidance==='multispectralAntiradiation'?'Цель должна излучать радио/радар.':
      h?.guidance==='multiscanner'?'За тонкими стенами/укрытием — при обнаружении и возможности пробития.':'';
    return unique([
      `Homing (${h?.attack??''}) ${h?.projectileSkill??''}; наведение: Artillery (Guided Missile), при успехе +Acc снаряду.`,
      `Попадание — вручную; ½D — скорость, ярд/с.${special?' '+special:''}`,
      ...(rules.warheadBrief??[]),compactAmmoSource(source??rules.ammunitionSource)||'UT146'
    ]);
  }
  const id = variantId?.replace(/^ut_/, '');
  const descriptions = {
    aphex:'Бронебойный заряд: follow-up-взрыв и осколки.',
    he:'Ударный заряд: взрыв и осколки.', hec:'Ударный linked-взрыв.',
    shaped_charge:'Кумулятивный заряд: linked-взрыв, осколки и incendiary.',
    hemp:'Кумулятивный заряд: linked-взрыв, осколки и incendiary.',
    memory_baton:'Double knockback.',
    monochain:'Шея, лицо, череп, конечности либо SM ≤ −2: вместо piercing — cutting (10).',
    burrow_darts:`После ≥1 HP injury: ещё 1 HP/ход, до смерти или ${caliberMm} секунд. Извлечение: First Aid −1 за секунду бурения; попытка наносит 1 HP.`,
    stingray:'Linked electrical: lethal electrical injury и Surge.',
    thermobaric: payload.atmosphere === 'very-thin' ? 'Очень тонкая атмосфера: урон /2.' :
      ['trace','vacuum'].includes(payload.atmosphere) ? 'Следовая атмосфера/вакуум: урон /4.' : '',
    plasma:'Взрыв с Surge.', force:'Взрыв с double knockback.',
    mininuke:'Смена мощности: Ready. Тепловой/радиационный импульс ослабевает как 1/r.',
    micro_antimatter:'Burning: 1/r; радиация: 1/r². Радиационный компонент — доза rad, не HP.',
    implosion:'Knockback к центру; радиационный компонент ослабевает как 1/r.',
    flare:'Освещение 5 минут; на дистанции до 1% радиуса — HT (HT−3 в темноте), ослепление на MoF секунд.',
    emp:'Electrical: HT−8 (2), отказ на MoF секунд; робот — без сознания, полный киборг — Seizure.',
    expendable_jammer:'Радио/радар: Electronics Operation (Comm) −10.',
    strobe:`Вспышка: ${row.damage ?? ''}; HT +1 за ярд. Stun/Blindness на MoF секунд; провал 5+ или Epilepsy — Seizure на MoF минут.`,
    warbler:`Звук: ${row.damage ?? ''}; HT +1 за ярд. Deafness и moderate pain на MoF минут; провал 5+ — crippling hearing loss. Работает 10 секунд. Hearing: −10 в радиусе, −5 до 2r, −2 до 5r.`,
    swarm: row.capacity ? `Вместимость роя: ${parseInt(row.capacity,10)} кв. ярдов.` : '',
    stasis:`Стазис: ${payload.durationSeconds ?? 300} секунд; учитываются защитные force fields.`,
    vortex:'Нужны атмосфера и гравитация; перенос предметов, помещающихся в радиус.',
    drugged_dart:'Одна доза инъекционного препарата.',
    drugged_ice:'Одна доза препарата; follow-up при пробитии.',
    biochemical_aerosol: (caliberMm === 10 ? 'Только при попадании в лицо.' : 'Облако: около 5 минут без ветра.') + (doses != null ? ` Доз: ${doses}.` : ''),
    biochemical_liquid: doses != null ? `Доз жидкости/пены: ${doses}.` : '',
    tangler: caliberMm === 40 ? 'Путы: ST24, DR8; +2 ST за слой. Освобождение: ST или Escape против ST пут.' :
      caliberMm === 64 ? 'Путы: ST36, DR12; +2 ST за слой; радиус 1 ярд. Освобождение: ST или Escape против ST пут.' :
      caliberMm === 100 ? 'Путы: ST60, DR20; +3 ST за слой. Освобождение: ST или Escape против ST пут.' :
      'Путы: ST15, DR5; +1 ST за слой. Освобождение: ST или Escape против ST пут.'
  };
  const swarm=id==='swarm'?utSwarmType(payload.swarmType):null;
  const lines = [descriptions[id],...(swarm?[swarm.brief+' '+text('SwarmManual')]:[])];
  if(id==='sefop'){
    const s=rules.manualSEFOP;
    lines.push(`Наведение и попадание — вручную: Artillery (Guided Missile), Homing ${s?.attack??''} ${s?.projectileSkill??''}.`);
    lines.push(payload.sefopMode==='aphex'?'Режим APHEX выбран до выстрела; Damage после ручного попадания.':
      payload.sefopAspect==='side'?'Атака сбоку; Damage после ручного попадания.':'Атака сверху: без штрафа позы и укрытия без защиты сверху; Damage после ручного попадания.');
  }
  if (id === 'expendable_jammer' && caliberMm === 25 && payload.radius?.origin === 'manual')
    lines.push('Радиус задан пользователем.');
  if (id === 'psi_bomb') lines.push('Will−5: stun, восстановление −5, амнезия 2 секунд; провал 5+ — без сознания на MoF минут.');
  if (id === 'message_psi_bomb') lines.push('Will−2: сообщение из Note и stun; провал 5+ — Moderate Pain на MoF минут после восстановления.');
  if (id === 'terror_psi_bomb') lines.push('Fright Check −5.');
  if (['psi_bomb','message_psi_bomb','terror_psi_bomb'].includes(id)) lines.push('Mind Shield помогает; Digital Mind и IQ0 не затрагиваются.');
  return unique([...lines, ...(swarm?[swarm.source]:[]),utSources[variantId] ?? compactAmmoSource(source ?? rules.ammunitionSource)]);
}

export function htBrief(profile) {
  const damage = profile.damage, rules = damage.rules ?? {}, id = damage.variantId ?? profile.ammunition?.recipe?.variantId;
  if(rules.htSourceProfile)return rules.instructions??[];
  const description = {
    ht_apex:'Бронебойный заряд: follow-up-взрыв и осколки.',
    ht_aphex:'Бронебойный заряд: follow-up-взрыв, осколки и incendiary.',
    ht_saple:'SAPLE: follow-up-взрыв и осколки.', ht_saphe:'SAPHE: follow-up-взрыв и осколки.',
    ht_saphec:'SAPHEC: follow-up-взрыв.', ht_le:'Linked-взрыв и осколки.', ht_he:'Взрыв и осколки.',
    ht_efp:'Linked-взрыв.', ht_heat:'Кумулятивный заряд с linked-взрывом.', ht_hedp:'Кумулятивный заряд: linked-взрыв и осколки.',
    ht_hesh:'При непробитии неламинированной брони: spall от linked-взрыва.',
    ht_ms_heat:'Тандем: последовательные ступени против ERA.', ht_thermobaric:'Термобарический взрыв: спад урона 1/(2r).',
    ht_frangible:'Без overpenetration при наличии DR; против DR0 считать DR1.',
    ht_apdu:'Incendiary после пробития жёсткой брони с исходным DR ≥10.',
    ht_apdsdu:'Incendiary после пробития жёсткой брони с исходным DR ≥10.',
    ht_apfsdsdu:'Incendiary после пробития жёсткой брони с исходным DR ≥10.',
    ht_baton:'Double knockback.', ht_beanbag:'Double knockback.',
    ht_buck_and_ball:'Первое попадание — пуля, последующие — дробь.',
    ht_airburst:'Воздушный подрыв: бонус области и рассеивание по выбранному взрывателю.',
    ht_incendiary:'Incendiary.', ht_tracer:'Трассер: видимый след; +1 к стрельбе в следующий ход при выполнении условий.',
    ht_silent:'Бесшумный: слышимость по таблице с дистанцией 16 ярдов.',
    ht_subsonic_pistol:'Hearing выстрела −1.', ht_subsonic_rifle:'Hearing выстрела −2.',
    ht_poison:'Доставка выбранного яда при выполнении условий контакта/пробития.',
    ht_poison_gas:'Газовый linked-компонент; доставка выбранного вещества.',
    ht_liquid:'Доставка выбранной жидкости.',
    ht_illumination:'Освещение: штраф темноты не хуже −3; контакт — 1d burn/с, до 10 секунд.',
    ht_signal_flare:'Сигнальный свет: штраф темноты не хуже −5; контакт — 1d burn/с, до 10 секунд.',
    ht_smoke:'Обычное зрение −10.', ht_colored_smoke:'Зрение и визуально наводимые атаки через дым −7.',
    ht_hot_smoke:'Зрение, Infravision и Hyperspectral Vision −10.',
    ht_prism_smoke:'Зрение, Infravision и Hyperspectral Vision −10; блокирует лазеры.',
    ht_em_smoke:'Зрение, Infravision, Hyperspectral Vision, Radar и Imaging Radar −10.',
    ht_tear_gas:'Две независимые HT−2: Coughing и Blindness; зрение −3 за ярд газа, до −10.',
    ht_tear_gas_vomit:'Три независимые HT−2: Coughing, Blindness и Retching; зрение −3 за ярд газа, до −10.',
    ht_white_phosphorus:'При сохраняющемся контакте: 1d(0.2) burn каждые 10 секунд, до минуты; удаление — DX.'
  }[id];
  const lines = [description];
  if (rules.sapleReliability) lines.push(`Взрыватель: 1d ≤ ${rules.sapleReliability.successAtMost}.`);
  const cloud = rules.environment?.sourceCloud;
  if (cloud) lines.push(`Дым: радиус ${cloud.radiusYards} ярдов, ${cloud.durationSeconds} секунд.`);
  const filler = rules.environment?.filler;
  if (Number.isFinite(filler?.dose)) lines.push(`Доза: ${filler.dose} ${filler.doseUnit ?? ''}`.trim());
  const malf = rules.pressure?.decision?.malfModifier ?? rules.pressure?.possibleMalfPenalty;
  if (malf) lines.push(`Malf ${malf > 0 ? '+' : ''}${malf}.`);
  if (rules.fuzeTracer?.selfDestructDistanceYards) lines.push(`Самоликвидация: ${rules.fuzeTracer.selfDestructDistanceYards} ярдов.`);
  return unique(lines);
}

export function ammunitionChatData(profile) {
  if(profile?.damage?.rules?.sonicShuriken){
    const f=profile.damage.rules.sonicFollowUp;
    return {name:f?.name??'',lines:f?['Две дозы; follow-up — вручную после подтверждённого пробития.',...(f.brief?[f.brief]:[])]:[],
      fields:f?.note?[{label:'Note',value:f.note}]:[],source:f?unique(['UT166',f.source]).join('; '):'UT166'};
  }
  if(profile?.damage?.rules?.robot){
    const r=profile.damage.rules.robot,copy=structuredClone(profile);delete copy.damage.rules.robot;
    const payload=ammunitionChatData(copy)??{lines:[],fields:[],source:''};
    return {...payload,name:r.name,lines:[`Команды: Artillery (Guided Missile); поведение и попадание — вручную.`,...(r.id==='shuriken'?['Таран: половина обычного collision damage, cutting (B430); фактическую скорость определяют вручную.','C cell: 10 минут; возврат и замена батареи — вручную.']:[...(!profile.damage.formula?['Столкновение: HP робота и фактическая скорость, B430; модификаторы заряда применяются вручную.']:[]),...payload.lines])],source:[r.source,payload.source].filter(Boolean).join('; ')};
  }
  if(profile?.damage?.rules?.nextEleven)return {name:'',lines:profile.damage.support?.manual?.map(c=>c.text)??[],fields:[],source:profile.damage.rules.ammunitionSource};
  if(profile?.damage?.rules?.chemical){
    const rules=profile.damage.rules,c=rules.chemical,p=profile.ammunition?.recipe?.parameters??{},h=rules.manualHoming;
    const lines=[c.brief];
    if(rules.faceOnly)lines.push('Только попадание в лицо; облака нет. UT153.');
    if(h)lines.push(`Homing (${h.attack}) ${h.projectileSkill}; наведение Artillery (Guided Missile), при успехе +Acc. Попадание — вручную. UT146.`);
    return {name:profile.ammunition?.name??c.name,lines,source:unique([c.source,utSources[profile.damage.variantId??profile.ammunition?.recipe?.variantId]]).join('; '),
      fields:[...(Number.isFinite(c.radius)?[{label:'Радиус',value:String(c.radius)}]:[]),
        ...Object.entries({note:p.note,savingThrow:p.savingThrow,description:p.description}).filter(([,v])=>typeof v==='string'&&v.trim())
          .map(([k,value])=>({label:{note:'Note',savingThrow:'Спасбросок',description:'Описание'}[k],value,description:k==='description'}))]};
  }
  if(profile?.damage?.rules?.fluid)return {name:profile.ammunition?.name??"",lines:profile.damage.support?.manual?.map(c=>c.text)??[],fields:[],source:profile.damage.rules.ammunitionSource};
  if(profile?.damage?.rules?.plasmaGun)return {name:profile.ammunition?.name??'',lines:profile.damage.support?.manual?.map(c=>c.text)??[],fields:[],source:profile.damage.rules.ammunitionSource};
  if(profile?.damage?.rules?.exoticBeam)return {name:'',lines:profile.damage.support?.manual?.map(c=>c.text)??[],fields:[],source:profile.damage.rules.ammunitionSource};
  if(profile?.damage?.rules?.sonicNeural)return {name:'',lines:profile.damage.support?.manual?.map(c=>c.text)??[],fields:[],source:profile.damage.rules.ammunitionSource};
  if(profile?.damage?.rules?.plasmaParticle)return {name:'',lines:profile.damage.support?.manual?.map(c=>c.text)??[],fields:[],source:profile.damage.rules.ammunitionSource};
  if(profile?.damage?.rules?.electrolaser)return {name:'',lines:profile.damage.support?.manual?.map(c=>c.text)??[],fields:[],source:'UT119–120'};
  if(profile?.damage?.rules?.utDazzler)return {name:'',lines:profile.damage.support?.manual?.map(c=>c.text)??[],fields:[],source:'UT113'};
  if(profile?.damage?.rules?.htLaser)return {name:'',lines:profile.damage.support?.manual?.map(c=>c.text)??[],fields:[],source:'HT181'};
  if(profile?.damage?.rules?.beam)return {name:'',lines:profile.damage.support?.manual?.map(c=>c.text)??[],fields:[],source:profile.damage.rules.beam.source};
  if (!['ht','ut','lt'].includes(profile?.ammunition?.book)) return null;
  const ammo = profile.ammunition, damage = profile.damage ?? {}, rules = damage.rules ?? {};
  const p = rules.payload ?? ammo.recipe?.parameters ?? {}, radius = p.radius;
  let name = ammo.name ?? '';
  // Only the exact suffix added by the UT recipe factory; do not parse arbitrary user names.
  if (ammo.book === 'ut' && ammo.recipe?.autoProfile && p.note && name.endsWith(' — ' + p.note)) name = name.slice(0, -(' — ' + p.note).length);
  const source = rules.ammunitionSource ?? ammo.recipe?.autoProfile?.source?.note ??
    ammo.recipe?.autoProfile?.definition?.source?.note ?? damage.transformations?.find(t => compactAmmoSource(t.source))?.source;
  let lines = ammo.book === 'ut' ? [] : htBrief(profile);
  if(rules.ltBow)lines=rules.ltBow.brief??[];
  if(rules.ltPersonal)lines=rules.ltPersonal.brief??[];
  if(rules.ltEarly)lines=rules.ltEarly.brief??[];
  // Rebuild UT prose from numerical saved facts even for a historical, verbose snapshot.
  if (ammo.book === 'ut') {
    const facts = ammo.recipe?.autoProfile?.facts ?? {};
    lines = utBriefInstructions(damage.variantId ?? ammo.recipe?.variantId, { ...facts, payload:p, rules, source });
  }
  const chargeRefs = ammo.book === 'ut' ? lines.filter(line => /^(UT|HT)\d/.test(line)) : [];
  const refs = unique(chargeRefs.length ? chargeRefs : [compactAmmoSource(source)]);
  lines = unique(lines.filter(line => !/^(UT|HT)\d/.test(line)));
  if(profile.weaponConfiguration?.variant==='gauss'&&profile.weaponConfiguration.fireMode!=='standard')lines.unshift(
    (profile.weaponConfiguration.fireMode==='boosted'?'Повышенная скорость EM':'Пониженная скорость EM; обнаружение звука −3')+' — UT141/139.');
  if(profile.weaponConfiguration?.variant==='lp')lines.unshift(profile.weaponConfiguration.hearingModifier===-3?moduleText('OleGURPS.LP.Sound'):'LP '+(profile.weaponConfiguration.fireMode==='boosted'?'Boosted':'Standard')+' - UT139.');
  if(profile.weaponConfiguration?.variant==='etc') {lines.unshift('ETC — UT139.');}
  const fields = [];
  if(utSwarmType(p.swarmType))fields.push({label:text('SwarmType'),value:utSwarmType(p.swarmType).name});
  if (p.note?.trim()) fields.push({label:text('Note'),value:p.note});
  if (radius?.applicable && Number.isFinite(radius.yards)) fields.push({label:radius.effectKind === 'illumination' ? text('Illumination') + ': ' + text('Radius') : text('Radius'),value:String(radius.yards) + (radius.origin === 'manual' ? ' (пользовательский)' : '')});
  if (p.savingThrow?.trim()) fields.push({label:text('SavingThrow'),value:p.savingThrow});
  if (p.description?.trim()) fields.push({label:text('Description'),value:p.description,description:true});
  const filler=rules.environment?.filler;
  for(const [label,value,description] of [[text('Note'),filler?.name,false],[text('SavingThrow'),filler?.resistance ?? filler?.effect?.resistance,false],[text('Description'),filler?.effect?.description,true]])
    if(typeof value === 'string' && value.trim() && !fields.some(field=>field.value===value))fields.push({label,value,description});
  if (!name && !lines.length && !fields.length && !refs.length) return null;
  return {name,lines,fields,source:refs.join('; ')};
}
export function ammunitionChatHTML(profile, escape) {
  const data = ammunitionChatData(profile);
  if (!data) return '';
  return `<details class="olegurps-ammunition-summary olegurps-ut-payload olegurps-chat-details"><summary>${escape(text('Details'))}</summary><div>` +
    (data.name ? `<p>${escape(data.name)}</p>` : '') +
    data.lines.map(line => `<p>${escape(line)}</p>`).join('') +
    data.fields.map(field => `<p${field.description ? ' class="olegurps-payload-description"' : ''}>${escape(field.label)}: <span style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(field.value)}</span></p>`).join('') +
    (data.source ? `<p>${escape(data.source)}</p>` : '') + '</div></details>';
}
