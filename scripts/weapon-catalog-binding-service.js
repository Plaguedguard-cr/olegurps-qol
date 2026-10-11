// Reference-only matching. Actor writes are confined to the module's own confirmation flag.
export const WEAPON_BINDING_FLAG = "weaponCatalogBindings";
const MODULE_ID = "olegurps-qol";
const fields = { damage: "damage", acc: "accuracy", rof: "rate_of_fire", rcl: "recoil", bulk: "bulk", range: "range", shots: "shots", st: "strength", reach: "reach", parry: "parry", block: "block" };
const norm = value => String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\u2010-\u2015]/g, "-").replace(/\s+/g," ").trim();
const nameNorm = value => norm(value).replace(/[^\p{L}\p{N}]+/gu," ").trim();
function frozen(value) { if(value && typeof value === "object" && !Object.isFrozen(value)){Object.values(value).forEach(frozen);Object.freeze(value);}return value; }
const snapshot = value => frozen(structuredClone(value));
const present = value => norm(value) !== "";
function caliber(value) { const text = norm(value); return text.match(/(?:\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?\s*mm|\d+(?:\.\d+)?\s*mm|\.\d+\s*(?:magnum|special|long rifle|lr|acp)|\d+\s*[- ]gauge)/)?.[0].replace(/\s/g,"") ?? ""; }
function tokensSimilarity(a,b) { const x=new Set(nameNorm(a).split(" ").filter(Boolean)),y=new Set(nameNorm(b).split(" ").filter(Boolean));return x.size&&y.size?[...x].filter(t=>y.has(t)).length/new Set([...x,...y]).size:0; }
function walk(tree, path, callback, seen=new WeakSet()) { if(!tree||typeof tree!=="object"||seen.has(tree))return;seen.add(tree);for(const [key,row] of Object.entries(tree)){if(!row||typeof row!=="object")continue;const p=path+"."+key;callback(row,p);walk(row.contains,p+".contains",callback,seen);walk(row.collapsed,p+".collapsed",callback,seen);} }
export function readGgaWeaponModes(actor) {
  const result=[];
  for(const type of ["ranged","melee"])walk(actor?.system?.[type],"system."+type,(row,path)=>{
    if(!present(row.name)&&!present(row.originalName))return;
    const item=actor.items?.get?.(row.itemid ?? row.fromItem);
    const sourceItem=actor.items?.get?.(row.fromItem);
    const eqtPath=String(row.eqtkey??"").replace(/^system[.]/,"");
    const linkedEquipment=eqtPath.startsWith("equipment.")?eqtPath.split(".").reduce((value,key)=>value?.[key],actor.system):null;
    const equipment = sourceItem?.system?.eqt ?? item?.system?.eqt ?? linkedEquipment;
    const stats=Object.fromEntries(Object.keys(fields).map(k=>[k,norm(row[k])]));
    result.push({path,type,name:String(row.name??""),originalName:String(row.originalName??""),usage:String(row.mode??""),reference:String(row.pageref??""),
      uuid:String(row.uuid??""),itemId:String(row.itemid??""),itemUuid:String(item?.uuid??""),equipmentUuid:String(equipment?.uuid??""),parentUuid:String(row.parentuuid??""),
      importId:String(item?.system?.importid??""),stats,caliber:caliber(row.caliber??row.name),
      skill:{level:row.level??null,importedLevel:row.import??null,otf:row.checkotf??null}, dataFields:Object.keys(row)});
  });
  for(const mode of result) mode.identityCohortSize=result.filter(other=>sameSemantic(mode,other)&&norm(mode.reference)===norm(other.reference)&&JSON.stringify(mode.stats)===JSON.stringify(other.stats)).length;
  return snapshot(result);
}
function sameSemantic(a,b) {
  const aNames=[a.originalName,a.name].filter(present).map(nameNorm),bNames=[b.originalName,b.name].filter(present).map(nameNorm);
  return a.type===b.type && norm(a.usage)===norm(b.usage) && aNames.some(n=>bNames.includes(n));
}
export function resolveWeaponIdentity(anchor, modes) {
  if(!anchor||typeof anchor!=="object"||!anchor.stats)return {status:"needs_review",mode:null,basis:"invalid-saved-anchor",candidates:[]};
  const semantic=modes.filter(m=>sameSemantic(anchor,m));
  const strong=semantic.filter(m=>((anchor.uuid&&m.uuid===anchor.uuid)||(anchor.equipmentUuid&&m.equipmentUuid===anchor.equipmentUuid)) &&
    (!present(anchor.reference)||!present(m.reference)||norm(anchor.reference)===norm(m.reference)) &&
    ((present(anchor.reference)&&norm(anchor.reference)===norm(m.reference)) || (anchor.equipmentUuid&&m.equipmentUuid===anchor.equipmentUuid) ||
      Object.keys(fields).filter(k=>present(anchor.stats[k])&&anchor.stats[k]===m.stats[k]).length>=3));
  if(strong.length===1)return {status:"resolved",mode:strong[0],basis:"corroborated-id",candidates:[strong[0].path]};
  if(strong.length>1)return {status:"needs_review",mode:null,basis:"duplicate-id",candidates:strong.map(m=>m.path)};
  // Paths and Item UUIDs are never durable identities. No name-only migration.
  if(anchor.identityCohortSize>1)return {status:"needs_review",mode:null,basis:"previously-indistinguishable-copies",candidates:semantic.map(m=>m.path)};
  const recovered=semantic.filter(m=>present(anchor.reference)&&norm(anchor.reference)===norm(m.reference)&&
    Object.keys(fields).filter(k=>present(anchor.stats[k])&&anchor.stats[k]===m.stats[k]).length>=3);
  if(recovered.length===1)return {status:"resolved",mode:recovered[0],basis:"unique-source-and-stat-fingerprint",candidates:[recovered[0].path]};
  return {status:"needs_review",mode:null,basis:recovered.length>1?"ambiguous-fingerprint":"identity-not-proven",candidates:(recovered.length?recovered:semantic).map(m=>m.path)};
}

export class WeaponCatalogBindingService {
  #catalogs;
  #indexData=null;
  #modes=[];
  #writes=new WeakMap();
  constructor(catalogs){if(!catalogs?.getEquipmentForMode)throw new TypeError("CatalogService required");this.#catalogs=catalogs;}
  load(){return this.#catalogs.load();}
  #index(){const data=this.#catalogs.getCatalog("weapons");if(!data)return false;if(data!==this.#indexData){this.#modes=data.equipment.flatMap(e=>e.modes.filter(m=>m.role==="attack"&&!m.hidden&&["ranged","melee"].includes(m.combat_type)).map(m=>({equipment:e,mode:m})));this.#indexData=data;}return true;}
  #select(modes,selector){const found=typeof selector==="string"?modes.filter(m=>m.path===selector):modes.filter(m=>(!selector?.path||m.path===selector.path)&&(!selector?.uuid||m.uuid===selector.uuid)&&(!selector?.type||m.type===selector.type));if(found.length!==1)throw new Error("Select one current mode by path or a unique UUID; missing/ambiguous mode.");return found[0];}
  #rank(attack){
    if(!this.#index())return {status:"unavailable",suggestion:null,candidates:[],reason:"Weapon catalog unavailable/loading."};
    const candidates=[];
    for(const {equipment:e,mode:m} of this.#modes){
      if(m.combat_type!==attack.type)continue;
      const names=[attack.name,attack.originalName].filter(present);const exact=names.some(n=>nameNorm(n)===nameNorm(e.name));
      const similarity=Math.max(0,...names.map(n=>tokensSimilarity(n,e.name)));
      if(!exact&&similarity<0.3)continue;
      const evidence=[],differences=[];let score=exact?40:Math.round(similarity*32),statMatches=0;
      evidence.push({field:"name",kind:exact?"exact":"similar",similarity});
      const usageEqual=norm(attack.usage)===norm(m.usage);
      if(usageEqual){score+=present(attack.usage)?12:4;evidence.push({field:"mode",kind:"equal"});}else if(present(attack.usage)&&present(m.usage)){score-=5;differences.push({field:"mode",gga:attack.usage,catalog:m.usage});}
      const refEqual=present(attack.reference)&&norm(attack.reference)===norm(e.reference);
      if(refEqual){score+=12;evidence.push({field:"reference",kind:"equal"});}
      const c=caliber(m.caliber_hint??e.name);if(attack.caliber&&c){if(attack.caliber===c){score+=8;evidence.push({field:"caliber",kind:"equal"});}else{score-=3;differences.push({field:"caliber",gga:attack.caliber,catalog:c});}}
      for(const [key,field] of Object.entries(fields)){let value=m.stats?.[field];if(key==="damage")value=m.raw_calc?.damage??(value?String(value.base??"")+" "+String(value.type??""):"");
        const a=attack.stats[key],b=norm(value);if(!present(a)||!present(b))continue;
        // GGA JSON importer strips the scope bonus from Acc into notes.
        const equal=a===b||(key==="acc"&&a===b.split("+")[0]);
        if(equal){score+=4;statMatches++;evidence.push({field:key,kind:"equal"});}else{score-=1;differences.push({field:key,gga:a,catalog:b});}
      }
      candidates.push({equipmentId:e.equipment_id,modeId:m.weapon_mode_id,name:e.name,usage:m.usage,type:m.combat_type,score,evidence,differences,
        convincing:usageEqual&&(exact&&refEqual || similarity>=0.65&&statMatches>=4&&(refEqual||evidence.some(x=>x.field==="caliber")))});
    }
    candidates.sort((a,b)=>b.score-a.score||a.modeId.localeCompare(b.modeId));
    const best=candidates[0],gap=best?best.score-(candidates[1]?.score??0):0;
    const proposed=best?.convincing&&best.score>=48&&gap>=12;
    return {status:proposed?"suggested":candidates.length?"candidates":"unmatched",suggestion:proposed?{equipmentId:best.equipmentId,modeId:best.modeId,confirmed:false}:null,candidates,reason:proposed?"Unique corroborated model; user confirmation is still required.":"No unique convincing catalog match."};
  }
  #state(actor){const state=actor?.getFlag?.(MODULE_ID,WEAPON_BINDING_FLAG);return state?.version===1&&Array.isArray(state.entries)?structuredClone(state):{version:1,entries:[]};}
  analyzeActor(actor){
    const modes=readGgaWeaponModes(actor),state=this.#state(actor);
    const identities=state.entries.map(entry=>({entry,resolution:resolveWeaponIdentity(entry.anchor,modes)}));
    const results=modes.map(attack=>{
      const manual=identities.filter(x=>x.resolution.mode?.path===attack.path);
      const pending=identities.filter(x=>x.resolution.status!=="resolved"&&x.resolution.candidates.includes(attack.path));
      const automatic=this.#rank(attack);
      if(manual.length===1){const {entry,resolution}=manual[0],target=this.#catalogs.getEquipmentForMode(entry.modeId);const valid=target?.equipment_id===entry.equipmentId&&this.#catalogs.getMode(entry.modeId)?.combat_type===attack.type;
        return {attack,status:valid?"confirmed":"needs_review",binding:valid?{equipmentId:entry.equipmentId,modeId:entry.modeId,confirmed:true,bindingId:entry.id}:null,manual:[entry],identity:resolution.basis,automatic,reason:valid?null:"Confirmed catalog target is unavailable or no longer valid."};}
      if(manual.length>1||pending.length)return {attack,status:"needs_review",binding:null,manual:[...manual,...pending].map(x=>x.entry),automatic,reason:"Manual confirmation is ambiguous; automatic suggestion cannot override it."};
      return {attack,status:automatic.status,binding:null,manual:[],automatic};
    });
    return snapshot({modes:results,orphanedConfirmations:identities.filter(x=>x.resolution.status!=="resolved").map(x=>({binding:x.entry,...x.resolution})),catalogStatus:this.#catalogs.getStatus("weapons"),storageVersion:1});
  }
  analyzeMode(actor,selector){const mode=this.#select(readGgaWeaponModes(actor),selector);return this.analyzeActor(actor).modes.find(r=>r.attack.path===mode.path);}
  #write(actor,fn){if(!actor||typeof actor.setFlag!=="function"||(!actor.isOwner&&!globalThis.game?.user?.isGM))return Promise.reject(new Error("Actor owner or GM permission is required."));const next=(this.#writes.get(actor)??Promise.resolve()).catch(()=>{}).then(fn);this.#writes.set(actor,next);return next;}
  confirm(actor,selector,target,{bindingId=null}={}){return this.#write(actor,async()=>{
    const modes=readGgaWeaponModes(actor),attack=this.#select(modes,selector),equipment=this.#catalogs.getEquipmentForMode(target.modeId),mode=this.#catalogs.getMode(target.modeId);
    if(!equipment||equipment.equipment_id!==target.equipmentId||mode.combat_type!==attack.type||mode.role!=="attack"||mode.hidden)throw new Error("Invalid/unavailable catalog equipment/mode pair.");
    const state=this.#state(actor);let entry=bindingId?state.entries.find(e=>e.id===bindingId):state.entries.find(e=>resolveWeaponIdentity(e.anchor,modes).mode?.path===attack.path);
    if(bindingId&&!entry)throw new Error("Unknown confirmation ID.");
    if(!entry){entry={id:globalThis.crypto.randomUUID()};state.entries.push(entry);}
    Object.assign(entry,{equipmentId:target.equipmentId,modeId:target.modeId,anchor:structuredClone(attack),confirmedBy:globalThis.game?.user?.id??null,confirmedAt:new Date().toISOString()});
    await actor.setFlag(MODULE_ID,WEAPON_BINDING_FLAG,state);return snapshot(entry);
  });}
  removeConfirmation(actor,bindingId){return this.#write(actor,async()=>{const state=this.#state(actor);state.entries=state.entries.filter(e=>e.id!==bindingId);await actor.setFlag(MODULE_ID,WEAPON_BINDING_FLAG,state);return snapshot(state);});}
  reconcileActor(actor){return this.#write(actor,async()=>{const state=this.#state(actor),modes=readGgaWeaponModes(actor);let changed=false;for(const e of state.entries){const r=resolveWeaponIdentity(e.anchor,modes);if(r.status==="resolved"&&JSON.stringify(e.anchor)!==JSON.stringify(r.mode)){e.anchor=structuredClone(r.mode);changed=true;}}if(changed)await actor.setFlag(MODULE_ID,WEAPON_BINDING_FLAG,state);return this.analyzeActor(actor);});}
}
