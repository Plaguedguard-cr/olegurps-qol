import {WEAPON_MASS_DATA as facts} from './weapon-mass-data.js';
export const weaponMassFact = id => facts.weapons[id]??null;
export const feedMassFact = id => facts.feeds[id]??null;
export const ammunitionMassFact = (book,id) => facts.ammo[book+':'+id]??null;
export const variantMassFact = (book,id) => facts.variants[book+':'+id]??null;
export const feedReferenceMassFact = id => facts.feedReferences[id]??null;
export function projectAmmoMass(book,record){return record?{...record,mass:ammunitionMassFact(book,record.id)}:record;}
export function projectWeaponMass(book,data){
 if(book==='weapons')for(const e of data.equipment??[]){e.mass=weaponMassFact(e.equipment_id);for(const m of e.modes??[])m.massFeed=feedMassFact(m.weapon_mode_id);}
 for(const a of data.ammo_items??[])a.mass=ammunitionMassFact(book,a.id);
 for(const f of data.feed_devices_reference_only??[])f.massFeed=feedReferenceMassFact(f.id);
 for(const rows of Object.values(data))if(Array.isArray(rows))for(const row of rows)if(row&&variantMassFact(book,row.id))row.massModifier=variantMassFact(book,row.id);
 return data;
}
