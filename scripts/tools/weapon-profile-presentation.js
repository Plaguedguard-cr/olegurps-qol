import { moduleText } from '../localization.js';

const text=key=>moduleText('OleGURPS.WeaponDisplay.'+key);
// Presentation of an already resolved profile only. No formulas, catalog scan or Actor writes.
export function attackProfilePresentation(profile) {
  const damage=profile?.damage;
  const etc=profile?.weaponConfiguration?.variant==='etc',lp=profile?.weaponConfiguration?.variant==='lp';
  if(!damage?.nativeSafe)return {etc,lp,damageText:text('Unknown')};
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
