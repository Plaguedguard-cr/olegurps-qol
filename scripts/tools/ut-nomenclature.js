// English GURPS nomenclature, UT2007 pp. 37, 146–147, 152–162, 169.
// Presentation by saved IDs only; never rewrite snapshots or user-entered names.
import {CHEMICAL_SUBSTANCES} from './biochemical-catalog.js';
export const UT_BODY_NAMES=Object.freeze({
  "thimble25": "Thimble Grenade (25 mm)",
  "mini40": "Mini Hand Grenade (40 mm)",
  "saucer40": "Saucer Grenade (40 mm)",
  "hand64": "Hand Grenade (64 mm)"
});
export const UT_WARHEAD_NAMES=Object.freeze({
  "standard_inert": "Standard / Inert Projectile",
  "aphc": "Armor-Piercing Hard Core (APHC)",
  "apds": "Armor-Piercing Discarding-Sabot (APDS)",
  "apep": "Armor-Piercing Enhanced Penetrator (APEP)",
  "aphex": "Armor-Piercing Hardcore Explosive (APHEX)",
  "biochemical_aerosol": "Biochemical Aerosol",
  "biochemical_liquid": "Biochemical Liquid",
  "flare": "Flare",
  "he": "High Explosive (HE)",
  "hec": "High Explosive Concussion (HEC)",
  "hp": "Hollow-Point (HP)",
  "shaped_charge": "Shaped Charge",
  "memory_baton": "Memory Baton",
  "monochain": "Monochain",
  "shotshell": "Shotshell",
  "sefop": "Smart Explosively Forged Projectile (SEFOP)",
  "tangler": "Tangler",
  "thermobaric": "Thermobaric",
  "burrow_darts": "Burrow Darts",
  "hemp": "High Explosive Multi-Purpose (HEMP)",
  "stingray": "Stingray",
  "swarm": "Swarm",
  "aphd": "Armor-Piercing Hyperdense Dart (APHD)",
  "mininuke": "Mininuke",
  "micro_antimatter": "Micro-Antimatter",
  "emp": "EMP",
  "expendable_jammer": "Expendable Jammer",
  "strobe": "Strobe",
  "warbler": "Warbler",
  "force": "Force",
  "plasma": "Plasma",
  "implosion": "Implosion",
  "psi_bomb": "Psi-Bomb",
  "message_psi_bomb": "Message Psi-Bomb",
  "terror_psi_bomb": "Terror Psi-Bomb",
  "stasis": "Stasis",
  "vortex": "Vortex"
});
export const UT_SWARM_NAMES=Object.freeze({
  "bughunter": "Bughunter Swarm",
  "cannibal": "Cannibal Swarm",
  "cleaning": "Cleaning Swarm",
  "construction": "Construction Swarm",
  "decontamination": "Decontamination Swarm",
  "defoliator": "Defoliator Swarm",
  "devourer": "Devourer Swarm",
  "disassembler": "Disassembler Swarm",
  "explorer": "Explorer Swarm",
  "firefly": "Firefly Swarm",
  "forensic": "Forensic Swarm",
  "gremlin": "Gremlin Swarm",
  "harvester": "Harvester Swarm",
  "massage": "Massage Swarm",
  "painter": "Painter Swarm",
  "paramedical": "Paramedical Swarm",
  "pesticide": "Pesticide Swarm",
  "play": "Play Swarm",
  "pollinator": "Pollinator Swarm",
  "repair": "Repair Swarm",
  "security": "Security Swarm",
  "sentry": "Sentry Swarm",
  "stinger": "Stinger Swarm",
  "surveillance": "Surveillance Swarm",
  "terminator": "Terminator Swarm"
});
export const utWarheadName=id=>UT_WARHEAD_NAMES[String(id??'').replace(/^ut_/, '')]??null;
export const utChemicalName=id=>CHEMICAL_SUBSTANCES[id]?.name??null;
export const utSwarmName=id=>UT_SWARM_NAMES[String(id??'').replace(/^swarm:/,'')]??null;
export function utSavedAmmunitionName(type,catalogs){
  const id=type?.recipe?.variantId,legacy={ut_aphc:'APHC',ut_apds:'APDS',ut_apep:'APEP',ut_hp:'HP',ut_shotshell:'Дробь'};
  if(type?.source!=='catalog'||type.book!=='ut'||!legacy[id]||type.recipe.autoProfile?.origin!=='reference')return type?.name;
  const base=catalogs?.getAmmoFamily('ut',type.ammoId)?.name;
  return base&&type.name===base+' '+legacy[id]?base+' '+utWarheadName(id):type.name;
}
export function grenadeDisplayName(profile){
  const body=UT_BODY_NAMES[profile?.bodyId],payload=utWarheadName(profile?.payloadId);
  if(profile?.book!=='UT'||!body||!payload)return profile?.name??'';
  const e=profile.payloadEffect;
  if(e?.chemical&&!utChemicalName(e.chemical.id)||e?.swarm&&!utSwarmName(e.swarm.id))return profile.name??'';
  const extra=e?.chemical?utChemicalName(e.chemical.id):e?.swarm?utSwarmName(e.swarm.id):e?.setting?e.setting.replace('kt',' kt').replace('ug',' µg'):null;
  return body+' / '+payload+(extra?' / '+extra:'');
}
export function grenadeDisplayProfile(profile){
  if(!profile)return profile;
  const result=structuredClone(profile);result.name=grenadeDisplayName(profile);
  const e=result.payloadEffect;
  if(e?.chemical&&!utChemicalName(e.chemical.id)||e?.swarm&&!utSwarmName(e.swarm.id))return result;
  if(e?.chemical){e.chemical.name=utChemicalName(e.chemical.id)??e.chemical.name;result.primary=e.chemical.name+' · '+e.chemical.doses+' доз';}
  if(e?.swarm){e.swarm.name=utSwarmName(e.swarm.id)??e.swarm.name;result.primary=e.swarm.name+' · '+e.swarm.count+' × 1 кв. ярд';}
  if(e?.duration)result.primary=utWarheadName(profile.payloadId)+' · '+e.duration.value+' '+({minutes:'минут',hours:'часов',days:'дней',years:'лет'}[e.duration.unit]??e.duration.unit);
  else if(e&&!e.components?.length&&!e.chemical&&!e.swarm&&result.parameters?.damage==='spec.')result.primary=utWarheadName(profile.payloadId);
  if(e?.chemical||e?.swarm)result.effects=(result.effects??[]).filter(s=>!/(?:конкретн|газ|веществ|вид роботов).*Notes/i.test(s));
  return result;
}
export function canonicalizeGrenadeChat(message,root,runtime=globalThis){
  const effect=message.getFlag('olegurps-qol','grenadeEffectResult');
  if(effect){const heading=root.querySelector('.og-grenade-effect-result > strong'),name=utWarheadName(effect.result?.family);if(heading&&name)heading.textContent='Результат воздействия: '+name;return;}
  const actorId=message.getFlag('olegurps-qol','grenadeActorId'),eventId=message.getFlag('olegurps-qol','grenadeEventId');
  if(!actorId||!eventId)return;
  const profile=runtime.game.actors.get(actorId)?.getFlag('olegurps-qol','handGrenades')?.events?.find(e=>e.id===eventId)?.profile;
  if(!profile)return;
  const heading=root.querySelector('.message-content > strong'),old=profile.name,name=grenadeDisplayName(profile);
  if(heading&&old&&heading.textContent.startsWith(old+' – '))heading.textContent=name+heading.textContent.slice(old.length);
}
