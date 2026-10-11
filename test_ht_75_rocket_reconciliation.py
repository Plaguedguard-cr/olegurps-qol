import json,copy,collections,zipfile,sys
from pathlib import Path
D=Path('/mnt/data');N=0

def load(p):return json.loads((D/p).read_text(encoding='utf-8'))
def verify(cond,txt):
 global N
 assert cond,txt
 N+=1
old=load('olegurps_weapon_reference_catalog_v5_4.json');w=load('olegurps_weapon_reference_catalog_v5_5.json')
oh=load('olegurps_ht_ammunition_catalog_v1.json');h=load('olegurps_ht_ammunition_catalog_v1_1.json')
old_lt=load('olegurps_lt_ammunition_catalog_v1_1.json');lt=load('olegurps_lt_ammunition_catalog_v1_2.json')
old_ut=load('olegurps_ut_ammunition_catalog_v2_5.json');ut=load('olegurps_ut_ammunition_catalog_v2_6.json')
verify(w['schema_version']==old['schema_version'],'weapon schema')
verify(len(w['equipment'])==len(old['equipment']),'same equipment rows')
wm={m['weapon_mode_id']:(e,m) for e in w['equipment'] for m in e['modes']};om={m['weapon_mode_id']:(e,m) for e in old['equipment'] for m in e['modes']}
verify(len(wm)==len(om),'unique weapon IDs')
verify(wm.keys()==om.keys(),'all mode ids identical')
for mid,(e,m) in wm.items():
 oe,oldm=om[mid]
 verify(e['equipment_id']==oe['equipment_id'],'equipment id:'+mid)
 verify(m['stats']==oldm['stats'],'native GGA attack stats modified:'+mid)
 verify(m['raw_calc']==oldm['raw_calc'],'raw damage modified:'+mid)
 verify(m['governing_skill']==oldm['governing_skill'],'skill modified:'+mid)
 verify(m['mechanism']==oldm['mechanism'],'native mechanism modified:'+mid)
 verify(m['combat_type']==oldm['combat_type'],'combat_type modified:'+mid)
 for k,v in oldm.items():
  verify(k in m and m[k]==v,('old weapon mode field changed',mid,k))
for e_old,e in zip(old['equipment'],w['equipment']):
 verify(e_old['equipment_id']==e['equipment_id'],'equipment order')
 for k in e_old:
  if k=='modes':continue
  verify(k in e and e[k]==e_old[k],('old equipment field changed',e['name'],k))
for bk in ['ammunition_candidates','reference_payload_templates','excluded_weapon_profiles','stats','enrichment_sources','payload_families','source_data_corrections','rules_audit_v3','rules_audit_v4','rules_audit_v5','rules_audit_v5_1','rules_audit_v5_2','rules_audit_v5_3','rules_audit_v5_4']:
 if bk in old:verify(w.get(bk)==old.get(bk),'weapon metadata changed:'+bk)
for oldx,x,label in [(old_lt,lt,'LT'),(old_ut,ut,'UT')]:
 cp=copy.deepcopy(x)
 cp['revision']=oldx['revision']
 cp['weapon_catalog_link']['catalog_filename']=oldx['weapon_catalog_link']['catalog_filename']
 verify(cp==oldx,label+' unexpected rule/compatibility change')
verify(w['lt_ammunition_catalog_link']['catalog_filename']=='olegurps_lt_ammunition_catalog_v1_2.json','LT forward filename')
verify(w['ht_ammunition_catalog_link']['catalog_filename']=='olegurps_ht_ammunition_catalog_v1_1.json','HT forward filename')
verify(w['ammunition_catalog_link']['catalog_filename']=='olegurps_ut_ammunition_catalog_v2_6.json','UT forward filename')
for cx in [lt,ut,h]:verify(cx['weapon_catalog_link']['catalog_filename']=='olegurps_weapon_reference_catalog_v5_5.json','reverse weapon filename')
old_items={i['id']:i for i in oh['ammo_items']};items={i['id']:i for i in h['ammo_items']};fams={i['id']:i for i in h['ammo_families']}
verify(len(items)==len(h['ammo_items']),'no duplicate round ids')
verify(len(fams)==len(h['ammo_families']),'no duplicate family ids')
verify(set(old_items)<=set(items),'all original rounds retained')
for id,it in old_items.items():
 new=items[id]
 for k,v in it.items():
  if k=='weapon_mode_ids':continue
  verify(k in new and new[k]==v,('original ammo mechanics changed',id,k))
 verify(set(v for v in it['weapon_mode_ids'])<=set(new['weapon_mode_ids']),'old links deleted:'+id)
for family in h['ammo_families']:
 verify(all(i in items for i in family['ammo_item_ids']),'family missing item')
 verify(family['linked_weapon_mode_count']==len(family['compatible_weapon_mode_ids']),'family mode count')
 mids=set(x for iid in family['ammo_item_ids'] for x in items[iid]['weapon_mode_ids'])
 verify(mids==set(family['compatible_weapon_mode_ids']),'family reverse links')
for e in w['equipment']:
 for m in e['modes']:
  if e['source']!='HT':verify('ht_ammo_item_ids' not in m,'cross-book HT assignment')
  if e['source']=='HT':
   for rid in m.get('ht_ammo_item_ids',[]):
    verify(rid in items, 'unregistered item')
    verify(m['weapon_mode_id'] in items[rid]['weapon_mode_ids'],'nonreciprocal ammo link')
for i in h['ammo_items']:
 for mid in i['weapon_mode_ids']:
  verify(mid in wm,'dangling mode')
  verify(i['id'] in wm[mid][1].get('ht_ammo_item_ids',[]),'dangling reverse link')
  verify(wm[mid][0]['source']=='HT','cross source reverse')
recon=h['unmatched_75_reconciliation'];rows=recon['entries']
verify(len(rows)==75 and len(set(r['mode_id'] for r in rows))==75,'75 unique reviews')
original_unlinked={id for id,(eq,m) in om.items() if eq['source']=='HT' and m['combat_type']=='ranged' and not m.get('ht_ammo_item_ids')}
verify(original_unlinked==set(r['mode_id'] for r in rows),'exact original 75 reviewed')
verify(recon['unreviewed_count']==0,'unreviewed modes')
status=collections.Counter(x['status'] for x in rows)
verify(dict(status)==recon['status_counts'],'status count incorrect')
# Strict no hand grenades, rifle grenades, flamethrowers as firearm selectable rounds.
for r in rows:
 mode=wm[r['mode_id']][1]
 verify(mode.get('ht_ammo_review',{}).get('status')==r['status'],'missing per-mode audit')
 if r['status'].startswith('excluded_') or r['status'].startswith('deferred_'):
  verify(not mode.get('ht_ammo_item_ids'),('invalid special-item link',r['name']))
for name,id_fragment in [('Voere VEC91,, 5.7x26mm','ht_5_7x26mm_usel'),('Colt Model 1895, 6x60mmR','ht_6x60mm_lee_236_navy'),('Remington Rolling Block','ht_45_70_springfield_11_43x53mmr'),('Zip-Gun','ht_22_long_rifle_5_7x16mmr')]:
 eq=next(e for e in w['equipment'] if e['name']==name and e['source']=='HT')
 verify(any(id_fragment in m.get('ht_ammo_item_ids',[]) for m in eq['modes']),name+' missing resolved exact cartridge')
# 125mm gun and 60mm gun mortar not linked by bore alone to 60mm mortar.
for e in w['equipment']:
 if e['name']=='DTAT MR60CS, 60mm' and e['source']=='HT':
  for m in e['modes']:
   if m['combat_type']=='ranged':verify('ht_60mm' not in m.get('ht_ammo_item_ids',[]),'gun-mortar conflated with mortar')
# No post-hoc interchangeable generations as direct alternatives to older launchers.
for i in h['ammo_items']:
 r=i.get('rocket_contract')
 if r:
  verify(r['range_semantics'] in ('minimum_yards_and_maximum_yards','speed_yards_per_second_and_maximum_yards'),'rocket range semantics')
  if i.get('alternate_model_not_selectable_as_base_ammunition'):
   verify(len(i['weapon_mode_ids'])==0,'different rocket launcher generation made selectable')
   verify(r.get('compatible_equipment_ids')==[],'alternate version incorrectly marked as compatible with legacy equipment')
   verify(r.get('requires_explicit_platform_variant') is True,'alternative generation needs a distinct physical platform')
  if r.get('guidance'):
   verify(r['range_semantics']=='speed_yards_per_second_and_maximum_yards','guided range interpreted as half damage')
  if r.get('consumable_launcher_on_shot'):
   verify('ENTIRE' in r['inventory_consumption'],'spent disposable launcher reloadable')
# RPG-7 crosslinked variants, no guessed shared ammo with RPO-A or RPG-2.
rpg=next(e for e in w['equipment'] if e['name']=='KMZ RPG-7, 40mm' and e['source']=='HT')
for m in rpg['modes']:
 if m['combat_type']=='ranged':
  verify(len(m['ht_ammo_item_ids'])==4,'RPG7 lacks exact 4 supported rounds per mode')
  verify('ht_specific_rpg2_82mm_heat' not in m['ht_ammo_item_ids'],'RPG2-RPG7 collision')
for file in ['olegurps_weapon_reference_catalog_v5_5.json','olegurps_ht_ammunition_catalog_v1_1.json','olegurps_lt_ammunition_catalog_v1_2.json','olegurps_ut_ammunition_catalog_v2_6.json']:
 verify((D/file).is_file(),'missing file '+file)
print('PASS',N,'assertions')
print('OLD 75:',dict(status))
print('ROUNDS:',len(h['ammo_items']),'ADDED:',len(h['ammo_items'])-len(oh['ammo_items']))
print('LINKED',h['audit']['HT_mode_links_count'],'UNLINKED',514-h['audit']['HT_mode_links_count'])
