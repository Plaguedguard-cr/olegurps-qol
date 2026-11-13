// Actor presentation state. Never write equipment, combat profiles or history.
export const WEAPON_VISIBILITY_FLAG = 'weaponListVisibility';
export const SHARED_WEAPON_LIST_FLAG = 'weaponListState';
export const weaponStateKey = value => [...String(value??'')].map(c=>c.codePointAt(0).toString(16).padStart(6,'0')).join('');
import {moduleText} from '../localization.js';
const scope = 'olegurps-qol', queues = new Map();
const text = value => String(value ?? '').trim();
const walk = (tree, base, result = []) => {
  for (const [key, row] of Object.entries(tree ?? {})) {
    if (!row || typeof row !== 'object') continue;
    const path = base + '.' + key;
    result.push({row, path});
    walk(row.contains, path + '.contains', result);
    walk(row.collapsed, path + '.collapsed', result);
  }
  return result;
};
const equipment = actor => [...walk(actor?.system?.equipment?.carried, 'system.equipment.carried'),
  ...walk(actor?.system?.equipment?.other, 'system.equipment.other')];
const property = (object, path) => text(path).split('.').reduce((v, k) => v?.[k], object);
const actorKey = actor => [...text(actor?.uuid)].map(c => c.codePointAt(0).toString(16).padStart(6, '0')).join('');
const modificationStamp = actor => actor?._stats?.modifiedTime ?? actor?._source?._stats?.modifiedTime ?? null;
const canonical = value => JSON.stringify(value, function(key, item) {
  if (['level','parrybonus','blockbonus'].includes(key)) return undefined;
  return item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])) : item;
});
const shortHash = source => { let h=2166136261; for(let i=0;i<source.length;i++) h=Math.imul(h^source.charCodeAt(i),16777619); return (h>>>0).toString(16); };
// A digest is only a compact lookup key. Exact proof equality is mandatory for filtering.
export function legacyAttackProof(actor, attack, user=globalThis.game?.user) {
  return canonical({path:attack.path, roster:actor?.system?.melee, lastImport:actor?.system?.lastImport??null,
    epoch:new WeaponListVisibility(actor,user).state().legacyEpoch??0});
}

/** Exact physical anchors only; catalog model/mode IDs and array paths are not identities. */
export function weaponListIdentity(actor, attack, managerWeapon = null) {
  if (attack?.unarmedRef?.native === false) return 'unarmed:' + attack.unarmedRef.id;
  const standalone = text(attack?.standaloneRef?.weaponId ?? managerWeapon?.standaloneWeaponId);
  if (standalone) return 'standalone:' + standalone;
  // Body attack rows remain separate even when GGA attaches them to one trait/Item.
  const nativeBody=attack?.unarmedRef?.native===true || text(attack?.data?.originalName??attack?.name).toLowerCase()==='natural attacks';
  const data = attack?.data ?? {}, rows = equipment(actor);
  const eqtPath = text(data.eqtkey).replace(/^system\./u, '');
  const linked = eqtPath ? rows.find(e => e.path.replace(/^system\./u, '') === eqtPath) : null;
  const instance = text(attack?.equipmentRef?.instanceId || data.parentuuid || linked?.row.uuid);
  if (!nativeBody && instance && rows.filter(e => text(e.row.uuid) === instance).length === 1) return 'equipment:' + instance;
  const itemId = text(data.itemid || linked?.row.itemid);
  if (!nativeBody && itemId && actor?.items?.get?.(itemId)) return 'item:' + itemId;
  // Module ammunition records already have an instance ID, independent of mode and name.
  if (managerWeapon?.id) return 'manager:' + managerWeapon.id;
  const uuid = text(attack?.uuid ?? data.uuid);
  const all = [...walk(actor?.system?.melee, 'system.melee'), ...walk(actor?.system?.ranged, 'system.ranged')];
  if (uuid && !globalThis.OleGURPSQOL?.catalogs?.getMode?.(uuid) && all.filter(e => text(e.row.uuid) === uuid).length === 1) return 'attack:' + uuid;
  return attack?.path?.startsWith('system.melee.') ? 'legacy:' + shortHash(legacyAttackProof(actor,attack)) : null;
}

export function meleeVisibilityEntries(actor, attacks) {
  const entries = attacks.map(attack => ({id: weaponListIdentity(actor, attack), name: attack.name || attack.label,
    detail: attack.equipmentRef?.instanceId || attack.standaloneRef?.weaponId || attack.data?.parentuuid || attack.uuid || attack.path,
    type: 'melee', source: attack}));
  const groups=new Map(), totals=new Map(), ordinal=new Map();
  for(const e of entries)if(!groups.has(e.id)){groups.set(e.id,e);totals.set(e.name,(totals.get(e.name)??0)+1);}
  for(const e of groups.values()){const n=(ordinal.get(e.name)??0)+1;ordinal.set(e.name,n);e.label=e.name+(n>1?' ('+n+')':'')+((totals.get(e.name)>1&&e.source.mode)?' – '+e.source.mode:'');}
  return entries.map(e=>({...e,label:groups.get(e.id)?.label??e.name,...(e.id?.startsWith('legacy:')?{proof:legacyAttackProof(actor,e.source)}:{})}));
}

export function rangedVisibilityEntries(actor, state) {
  return (state?.weapons ?? []).map(weapon => {
    // Never resolve by name or silently follow a stale path past a known UUID.
    const ref = weapon.attackRef ?? {}, atPath = property(actor, ref.path);
    const all = walk(actor?.system?.ranged, 'system.ranged');
    const matches = ref.uuid ? all.filter(e => text(e.row.uuid) === ref.uuid) : [];
    const raw = ref.uuid ? (matches.length === 1 ? matches[0].row : null) : atPath;
    const attack = raw ? {data: raw, uuid: raw.uuid} : null;
    return {id: weaponListIdentity(actor, attack, weapon), name: weapon.name, detail: weapon.standaloneWeaponId || weapon.id,
      type: 'ranged', source: weapon};
  });
}

export class WeaponListVisibility {
  constructor(actor, user = globalThis.game?.user) { this.actor = actor; this.user = user; }
  state() {
    const shared=this.actor?.getFlag?.(scope,SHARED_WEAPON_LIST_FLAG)??{};
    return {...shared,hidden:Object.values(shared.hiddenById??{}).filter(r=>r?.hidden===true)};
  }
  legacyState() {
    const saved = this.user?.getFlag?.(scope, WEAPON_VISIBILITY_FLAG)?.actors?.[actorKey(this.actor)];
    return saved && saved.actorUuid === this.actor?.uuid ? saved : {};
  }
  records() { return Array.isArray(this.state().hidden) ? this.state().hidden.filter(r=>r&&typeof r.id==='string'&&['melee','ranged'].includes(r.type)).map(({hidden,...record})=>record) : []; }
  manualProfiles() { return Array.isArray(this.legacyState().manualProfiles) ? this.legacyState().manualProfiles.filter(id=>typeof id==='string') : []; }
  canImportLegacy() { return this.state().legacyImported!==true && Array.isArray(this.legacyState().hidden) && this.legacyState().hidden.length>0; }
  async verifyLegacyStamp() {
    await queues.get(this.actor?.uuid)?.catch(()=>{});
  }
  isHidden(id, proof) { return !!id && this.records().some(r => r.id === id && (!id.startsWith('legacy:') || proof === undefined || r.proof === proof)); }
  visible(entries) { return entries.filter(e => !this.isHidden(e.id,e.proof)); }
  hidden(entries, type) {
    const byId = new Map(entries.filter(e => e.id).map(e => [e.id, e]));
    return this.records().filter(r => r.type === type || byId.has(r.id))
      .map(r => {const e=byId.get(r.id),match=e&&(!r.id.startsWith('legacy:')||e.proof===r.proof);return {...r,...(match?e:{}),stale:!match};});
  }
  change(operation, id, entries = () => []) {
    const user = this.user, key = this.actor?.uuid, previous = queues.get(key) ?? Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      if (!this.actor?.isOwner || !this.actor?.uuid || !user || user.id !== globalThis.game?.user?.id)
        throw Error('Нет прав на настройки этого персонажа.');
      const state=this.state(),manualProfiles=[...new Set(this.manualProfiles())];
      let hidden = this.records().map(r => ({id:r.id,name:r.name,type:r.type,...(r.proof?{proof:r.proof}:{})}));
      let legacyEpoch=Number.isSafeInteger(state.legacyEpoch)?state.legacyEpoch:0;
      const patch={};
      if(operation==='import-legacy'){
        if(!this.canImportLegacy())return false;
        const available=entries();
        for(const old of this.legacyState().hidden){
          const entry=available.find(e=>e.id===old.id);
          const k=weaponStateKey(old.id);
          // A deliberate shared decision (including restore) always wins.
          if(entry&&!Object.hasOwn(state.hiddenById??{},k)&&!old.id.startsWith('legacy:'))patch[`flags.${scope}.${SHARED_WEAPON_LIST_FLAG}.hiddenById.${k}`]={id:entry.id,name:text(entry.label||entry.name),type:entry.type,hidden:true};
        }
        patch[`flags.${scope}.${SHARED_WEAPON_LIST_FLAG}.legacyImported`]=true;
      } else if (operation === 'hide') {
        const entry = entries().find(e => e.id === id);
        if (!id || !entry) throw Error('Нет надёжного идентификатора экземпляра. Скрытие недоступно.');
        hidden=hidden.filter(r=>r.id!==id);
        hidden.push({id,name:text(entry.label||entry.name),type:entry.type,...(entry.proof?{proof:entry.proof}:{})});
      } else if (operation === 'add-unarmed') {
        const entry=entries().find(e=>e.id===id&&e.source?.unarmedRef?.native===false);
        if(!entry)throw Error('Эта атака сейчас недоступна для данного персонажа.');
        const profile=entry.source.unarmedRef.id;
        if(!manualProfiles.includes(profile))manualProfiles.push(profile);
        hidden=hidden.filter(r=>r.id!==id);
      } else if (operation === 'invalidate-legacy') {
        legacyEpoch++;
      } else if (operation === 'acknowledge-legacy') {
        // An observed non-source Actor update is safe; remember it for the next login.
      } else if (operation === 'restore') hidden = hidden.filter(r => r.id !== id);
      else if (operation === 'restore-all') {
        const ids = new Set(entries().map(e => e.id));
        hidden = hidden.filter(r => r.type !== id && !ids.has(r.id));
      } else throw Error('Неизвестная операция списка оружия.');
      if(operation==='add-unarmed')await user.setFlag(scope,WEAPON_VISIBILITY_FLAG+'.actors.'+actorKey(this.actor),{...this.legacyState(),actorUuid:this.actor.uuid,manualProfiles});
      if(operation!=='import-legacy'){
        const before=new Map(this.records().map(r=>[r.id,r])),after=new Map(hidden.map(r=>[r.id,r]));
        for(const key of new Set([...before.keys(),...after.keys()]))if(JSON.stringify(before.get(key))!==JSON.stringify(after.get(key)))
          patch[`flags.${scope}.${SHARED_WEAPON_LIST_FLAG}.hiddenById.${weaponStateKey(key)}`]={...(after.get(key)??before.get(key)),hidden:after.has(key)};
        if(legacyEpoch!==(state.legacyEpoch??0))patch[`flags.${scope}.${SHARED_WEAPON_LIST_FLAG}.legacyEpoch`]=legacyEpoch;
      }
      if(Object.keys(patch).length)await this.actor.update(patch);
      return true;
    });
    queues.set(key, task);
    return task.finally(() => { if (queues.get(key) === task) queues.delete(key); });
  }
}

let sourceHook=null;
export function registerWeaponListVisibilityHooks() {
  if(sourceHook!==null)return;
  sourceHook=Hooks.on('updateActor',(actor,changes,_options,userId)=>{
    const system=changes.system??{};
    const rewritten=Object.keys(changes).some(k=>/^system\.(?:melee(?:\.|$)|-=melee$|lastImport$)/.test(k)) || ['melee','-=melee','lastImport'].some(k=>Object.hasOwn(system,k));
    const service=new WeaponListVisibility(actor);
    if(rewritten&&actor.isOwner&&globalThis.game?.user?.id===userId&&service.records().some(r=>r.id.startsWith('legacy:')))
      void service.change('invalidate-legacy').catch(error=>console.error('OleGURPS shared legacy list:',error));
  });
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const visibilityText = key => moduleText('OleGURPS.WeaponList.' + key);
export function hiddenWeaponsHTML(service, entries, type, actionAttribute) {
  const records = service.hidden(entries, type), unique = [...new Map(records.map(r => [r.id, r])).values()];
  return `<details class="gam-hidden-weapons"><summary>${visibilityText('Show')} (${unique.length})</summary>
    <div class="gam-hidden-weapons-list">${unique.length ? unique.map(r => `<div class="gam-hidden-weapon">
      <span><strong>${esc(r.label||r.name)}</strong><small>${esc(r.id)}${r.stale ? ' · ' + visibilityText('Stale') : ''}</small></span>
      <button type="button" ${actionAttribute}="restore-weapon" data-visibility-id="${esc(r.id)}">${visibilityText('Restore')}</button></div>`).join('') : `<p>${visibilityText('None')}</p>`}
    ${unique.length ? `<button type="button" ${actionAttribute}="restore-all-weapons">${visibilityText('RestoreAll')}</button>` : ''}
    ${service.canImportLegacy()?`<button type="button" ${actionAttribute}="import-legacy-visibility">Перенести прежнее скрытие в общий список</button>`:''}</div></details>`;
}
