import { moduleText } from '../localization.js';

const text=key=>moduleText('OleGURPS.WeaponDisplay.'+key);
// Presentation of an already resolved profile only. No formulas, catalog scan or Actor writes.
export function attackProfilePresentation(profile) {
  const damage=profile?.damage;
  const etc=profile?.weaponConfiguration?.variant==='etc',lp=profile?.weaponConfiguration?.variant==='lp';
  if(!damage?.nativeSafe)return {etc,lp,damageText:text('Unknown')};
  if(damage.rules?.chemical){
    const checks=[...new Set(damage.rules.chemical.checks.map(c=>'HT'+(c.modifier<0?'−'+Math.abs(c.modifier):c.modifier>0?'+'+c.modifier:'')))];
    const linked=(damage.components??[]).filter(c=>c.role==='linked'&&c.status==='resolved').map(c=>c.formula);
    return {etc,lp,damageText:[damage.rules.instructionOnly?'Химический эффект':damage.formula,...checks,...linked].filter(Boolean).join(' · ')};
  }
  if(damage.rules?.plasmaGun)return {etc,lp,damageText:damage.formula+' · '+(damage.rules.plasmaGun.hot?'Hot Power Cartridge':'Plasma Power Cartridge')};
  if(damage.rules?.exoticBeam)return {etc,lp,damageText:damage.effectiveChanges.damage+
    (damage.rules.exoticBeam.family==='conversion'?' · Follow-Up '+damage.components.find(c=>c.role==='follow-up')?.formula+' rad sur':'')};
  if(damage.rules?.sonicNeural?.family==='mindripper')return {etc,lp,damageText:damage.effectiveChanges.damage};
  if(damage.rules?.laserModifications){
    const c=damage.rules.laserModifications,e=damage.rules.resistanceEffect;
    return {etc,lp,damageText:e?(c.mode==='dazzle'?'Ослепление':'Повреждение зрения')+`: HT${e.modifier} aff`:'Урон '+damage.formula};
  }
  if(damage.rules?.electrolaser){
    const effect=damage.rules.resistanceEffect,kill=damage.rules.electrolaser.mode==='kill';
    return {etc,lp,damageText:(effect?`HT${effect.modifier} (2) aff · `:'')+damage.formula,
      electrolaser:{heading:effect?`${kill?'Смертельный разряд':'Оглушение'}: HT${effect.modifier<0?'−'+Math.abs(effect.modifier):'+'+effect.modifier} (${effect.armorDivisor})`:damage.formula,
        hint:effect&&kill?'Heart Attack при провале на 5+':'',burn:damage.formula,linked:!!effect}};
  }
  if(damage.rules?.plasmaParticle)return {etc,lp,damageText:damage.rules.resistanceEffect?profile.effective.damage:damage.formula};
  if(damage.rules?.resistanceEffect)return {etc,lp,damageText:damage.rawFormula};
  if(damage.rules?.instructionOnly)return {etc,lp,damageText:text('Manual')};
  const primary=damage.rules?.primaryDamageRole??'kinetic';
  const components=(damage.components??[]).filter(c=>c.status==='resolved'&&c.formula);
  const labels={'follow-up':'FollowUp',fragmentation:'Fragmentation',linked:'Linked','main-charge':'Alternative'};
  const lines=components.map(c=>`${c.role===primary&&primary==='kinetic'?text('Damage'):text(labels[c.role]??'Damage')} ${c.formula}`);
  if(!lines.length&&damage.formula)lines.push(text('Damage')+' '+damage.formula);
  return {etc,lp,damageText:lines.join(' · ')||text('Unknown')};
}
export const executionAmmoCaption=(caption,presentation)=>String(caption??'')+(presentation?.etc?' - ETC':presentation?.lp?' - LP':'');

// Fire Control's display title only; never write this back to the model or ammo.
export function fireControlWeaponTitle(name,presentation) {
  let title=String(name??'').replace(/(?: - (?:ETC|LP))+$/u,'');
  const family=String(presentation?.physicalFamily??'').trim();
  const normalized=value=>value.normalize('NFKC').toLowerCase().replaceAll('\u00d7','x').replace(/\s+/g,'');
  if(/\d/u.test(family)&&!normalized(title).includes(normalized(family)))title+=', '+family;
  return executionAmmoCaption(title,presentation);
}
