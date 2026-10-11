"""Reconcile 75 HT unmatched modes, source-gated launcher cartridges, preserve all native GGA attack fields.
Sources: user High-Tech PDF indexed text HT 89-94, 109-120, 130-153, 175-178.
"""
from __future__ import annotations
import json,copy,re,collections,hashlib
from pathlib import Path
D=Path('/mnt/data')
def load(name):return json.loads((D/name).read_text(encoding='utf8'))
def save(name,x):(D/name).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
w=load('olegurps_weapon_reference_catalog_v5_4.json');h=load('olegurps_ht_ammunition_catalog_v1.json')
lt=load('olegurps_lt_ammunition_catalog_v1_1.json');ut=load('olegurps_ut_ammunition_catalog_v2_5.json')
old=copy.deepcopy(w);old_h=copy.deepcopy(h)
by_eq={e['name']:e for e in w['equipment'] if e['source']=='HT'}
items={i['id']:i for i in h['ammo_items']};fams={i['id']:i for i in h['ammo_families']}
old_unlinked=[(e,m) for e in w['equipment'] if e['source']=='HT' for m in e['modes'] if m.get('combat_type')=='ranged' and not m.get('ht_ammo_item_ids')]
assert len(old_unlinked)==75,len(old_unlinked)
changes={};rounds=[]

def mark(eq,mode,status,reason,ref=None,link=None,additional=None):
 assert mode['weapon_mode_id'] not in changes,(eq['name'],mode['weapon_mode_id']);assert mode['combat_type']=='ranged'
 q={'status':status,'reason_ru':reason,'source_ref':ref or eq['reference'],'book':'HT'}
 if additional:q.update(additional)
 if link:
  mode['ht_ammo_item_ids']=sorted(set(link))
  mode['ht_ammo_resolution']={'status':status,'basis':reason,'source':ref or eq['reference']}
  for iid in link:items[iid]['weapon_mode_ids']=sorted(set(items[iid].get('weapon_mode_ids',[])+[mode['weapon_mode_id']]))
 else:mode['ht_ammo_resolution']={'status':status,'basis':reason,'source':ref or eq['reference']}
 mode['ht_ammo_review']=q
 changes[mode['weapon_mode_id']]={'name':eq['name'],'usage':mode.get('usage'),'mode_id':mode['weapon_mode_id'],'status':status,'reason':reason,'ref':ref or eq['reference'],'links':link or []}

def make_round(eq, mode, key, name,kind,projectile,ref,warhead=None,damage=None,secondary=None,
    wps=None,cps=None,range_kind=None,range_value=None,platform=None,weapon_consumable=False,
    guidance=None,traits=None,ammo_evidence='book_explicit',notes=None,mode_status='weapon_specific',do_link=True):
 rid='ht_specific_'+key
 assert rid not in items,rid
 payload={
  'id':rid,'name':name,'ammo_family_id':rid,'source_equipment_id':None,'source_weapon_equipment_id':eq['equipment_id'],
  'source_ref_raw':ref,'table_ref':ref,'gcs_index':None,'minimum_tech_level':None,
  'tl_source_policy':'Use weapon/round source, not character skill TL',
  'ammunition_class':kind,'ammunition_construction':'complete_munition' if kind in ('rocket','guided_missile','rifle_grenade') else 'weapon_specific',
  'weight_per_shot_lb':wps,'cost_per_shot_usd':cps,'book_cost_weight_verified':False,
  'weapon_mode_ids':[],'round_family_policy':'exclusively enumerated platform/variant; no bore matching',
  'source_evidence_level':ammo_evidence,'warhead_type':warhead,'munition_type':projectile,
  'attack_override':{'damage':damage,'secondary_effects':secondary or [],'selected_variant_only':True} if damage is not None or secondary else None,
  'rocket_contract':{'delivery_type':kind,'compatible_equipment_ids':[eq['equipment_id']],
   'range_semantics':range_kind,'range_source':range_value,'guidance':guidance,
   'consumable_launcher_on_shot':weapon_consumable,'platform':platform,
   'notes':notes,'traits':traits or []} if kind in ('rocket','guided_missile') else None,
  'payload_policy':'Variant is explicitly selected. Do not add damage/linked component twice to a source-native mode.'}
 items[rid]=payload;h['ammo_items'].append(payload)
 fam={'id':rid,'name':name,'ammo_item_ids':[rid],'compatible_weapon_mode_ids':[],
  'class':kind,'linked_weapon_mode_count':0,'conversion_or_interchangeability':'Only named platform variant; no generic-caliber matching','source_family':'High-Tech'}
 fams[rid]=fam;h['ammo_families'].append(fam);rounds.append(rid)
 if do_link:
  mark(eq,mode,mode_status,'Штатный боеприпас/выстрел подтверждён описанием именно этой системы.',ref,[rid])
 return rid

def link_existing(eq,mode,rid,ref,reason):
 assert rid in items
 mark(eq,mode,'source_verified_existing_round',reason,ref,[rid])

def source_only(eq,mode,status,why,ref=None,additional=None):mark(eq,mode,status,why,ref,additional=additional)

# Small arms: exact source evidence, NEVER equality by caliber alone.
for e,m in old_unlinked:
 n=e['name'];a=m.get('usage') or ''
 direct={
 'Voere VEC91,, 5.7x26mm':('ht_5_7x26mm_usel','HT 119-121','5.7×26mm Usel — штатный безгильзовый патрон, пуля HP уже учтена в уроне оружия.'),
 'Colt Model 1895, 6x60mmR':('ht_6x60mm_lee_236_navy','HT 130, 137, 177','6×60mmR Lee (.236 Navy) — основной вариант Colt 1895; иностранные версии требуют иного ствола/патронника.'),
 'Remington Rolling Block':('ht_45_70_springfield_11_43x53mmr','HT 109, 120, 177','Основная модель рассчитана на .45-70 Springfield; Creedmoor .44-90 — отдельное исполнение.'),
 'Zip-Gun':('ht_22_long_rifle_5_7x16mmr','HT 92, 176','Образцовый самодельный Zip-Gun в книге использует .22 LR (масса 0.0077 lb).'),
 'Remington New Model Army, .44 Caplock':('ht_44_caplock_m1860_army','HT 94, 176','Капсюльный револьвер, тот же .44 ball тип и близкий заряд, но книжная цена/масса именно M1860 Army не доказана — отдельный штатный заряд ниже.')
 }
 if n in direct:
  rid,ref,why=direct[n]
  if n=='Remington New Model Army, .44 Caplock':
   make_round(e,m,'remington_new_model_army_44_caplock','Remington New Model Army: .44 caplock powder and ball','separate_powder_and_shot','caplock ball',ref,
     wps=None,cps=None,notes='Do NOT claim M1860 Army powder charge weight or cost; 0.14 lb is weapon ammo carried weight, not validated WPS.',traits=['requires percussion cap','not fixed ammunition'])
  else: link_existing(e,m,rid,ref,why)
  continue
 if n=='MAS Pistolet AN XIII, 17.1mm Flintlock':
  make_round(e,m,'mas_an_xiii_17_1_flintlock','MAS Pistolet AN XIII: 17.1mm flintlock shot and powder','separate_powder_and_shot','ball and powder','HT 91, 176',
    notes='HT176 lists 17.1mm AN IX (different model), so same bore does not prove identical quantity/price. No cross-link.',traits=['ball and powder','flintlock ignition']);continue
 if n=='North & Cheney M1779, .69 Flintlock':
  make_round(e,m,'north_cheney_1779_69_flintlock','North & Cheney M1779: .69 flintlock shot and powder','separate_powder_and_shot','ball and powder','HT 91',
    notes='No exact priced row in HT176; do not borrow .68/.75 Flintlock pricing.',traits=['ball and powder']);continue

# Explicit unit-mode weapon list for launchers; additional variants can use alternate mode stats.
# Loaded rocket weight can be inferred only where explicit Wt. x/y nomenclature, provenance marked table-derived.
# For these fixed weapons, firing consumes launcher itself; no separate reload and round pricing should be inferred.
rocket_specs={
 'M20 Super Bazooka 3.5"':('m20_89mm_heat','M20 Super Bazooka 89mm HEAT rocket','HEAT','HT 147',False,None),
 'HASAG Panzerfaust 30, 44mm':('pf30_150mm_heat','Panzerfaust 30 150mm over-caliber HEAT round','HEAT','HT 147-148',True,None),
 'HEC M72A2, 66mm':('m72a2_66mm_heat','M72A2 LAW 66mm HEAT launcher+rocket','HEAT','HT 148-149',True,None),
 'FFV AT4, 84mm':('at4_84mm_heat','AT4 84mm HEAT launcher+rocket','HEAT','HT 148-149',True,None),
 'MBB Armbrust, 67mm':('armbrust_67mm_heat','Armbrust 67mm HEAT launcher+rocket','HEAT','HT 148-149',True,None),
 'KBP RPO-A, 93mm':('rpoa_93mm_thermobaric','RPO-A Shmel 93mm thermobaric launcher+rocket','thermobaric','HT 148-149',True,None),
 'KMZ RPG-2, 40mm':('rpg2_82mm_heat','RPG-2 82mm over-caliber HEAT projectile','HEAT','HT 148-149',False,80),
 'Dynamit-Nobel PZF3, 60mm':('pzf3_110mm_heat','Panzerfaust 3 110mm HEAT launch tube/shot','HEAT','HT 148-149',False,500),
 'Buck HAFLA, 35mm':('hafla_dm34_35mm_wp','Buck HAFLA DM34 35mm WP sealed disposable launcher','WP smoke','HT 142, 145',True,None),
}
vehicle_specs={
 'Hale 9-pr Mk I, 2.5"':('hale_9pr_he','Hale 9-pr high explosive rocket','HE','HT 150-151',55),
 'BM-13-16, 132mm':('katyusha_m13_he','M-13 132mm artillery rocket','HE','HT 150-151',100),
 'M10, 4.5"':('m10_m8_he','M8 4.5-inch aircraft rocket','HE','HT 150-151',200),
 'M260, 70mm':('hydra_mk66_he','MK 66 Hydra 70mm HE rocket','HE','HT 150-151',1300),
}
guided_specs={
 'Aérospatiale SS.11, 164mm':('ss11_heat','SS.11 164mm wire-guided HEAT missile','wire-guided','HT 150-152',None,550,'guided'),
 'Kolomna 9M17M Malyutka-M, 125mm':('malyutka_m_heat','9M14M Malyutka-M 125mm wire-guided HEAT missile','wire-guided','HT 151-152',None,550,'guided'),
 'Hughes BGM-71A TOW, 127mm':('tow_bgm71a_heat','BGM-71A TOW wire-guided HEAT missile','wire-guided','HT 151-152',14000,70,'guided'),
 'Euromissile MILAN, 103mm':('milan_103_heat','MILAN 103mm wire-guided HEAT missile','wire-guided','HT 151-152',25000,30,'guided'),
 'McDonnell FGM-77A Dragon, 127mm':('dragon_127_heat','FGM-77A Dragon wire-guided HEAT missile','wire-guided','HT 152',3000,70,'guided'),
 'Ford AIM-9L Sidewinder, 127mm':('aim9l_abf','AIM-9L Sidewinder IR-homing ABF missile','infrared homing','HT 152',None,1100,'homing'),
 'GD FIM-92A Stinger, 70mm':('stinger_fim92a_heab','FIM-92A Stinger IR-homing HE-AB missile','infrared homing','HT 152-153',40000,220,'homing'),
 'RLM FGM-148A Javelin, 127mm':('javelin_fgm148a_mseat','FGM-148A Javelin imaging-IR MS-HEAT missile','imaging IR homing','HT 152-153',85000,70,'homing'),
}

for e,m in old_unlinked:
 n=e['name'];usage=m.get('usage') or ''
 if m['weapon_mode_id'] in changes:continue
 if n in rocket_specs:
  key,name,warhead,ref,disposable,cps=rocket_specs[n]
  if n=='KMZ RPG-7, 40mm':continue
  kind='rocket'
  mode_notes={'minimum_range':'First Range is minimum range; not half damage','backblast':'HT147 60° cone; read exact named weapon for number of dice'}
  launch=make_round(e,m,key,name,kind,'rocket_or_recoilless_round',ref,warhead=warhead,damage=m['raw_calc'].get('damage'),
    cps=cps,range_kind='minimum_yards_and_maximum_yards',range_value=m['stats']['range'],
    platform=n,weapon_consumable=disposable,traits=['backblast','no_halved_damage_range'],notes=mode_notes)
  # Razor: panzerfaust rocket is not interchangeable even when nominal tube diameter coincides
  continue
 if n=='KMZ RPG-7, 40mm':
  if '85mm' in usage:
   key,name,warhead='rpg7_85mm_heat','RPG-7 85mm HEAT round','HEAT'
  else:
   key,name,warhead='rpg7_40mm_he','RPG-7 40mm HE round','HE'
  make_round(e,m,key,name,'rocket','rocket_assisted_grenade','HT 148-149',warhead=warhead,
    damage=m['raw_calc'].get('damage'),range_kind='minimum_yards_and_maximum_yards',range_value=m['stats']['range'],
    platform=n,notes='Rocket motor and warhead assembled before loading: 3 Ready maneuvers; backblast 1d+2 burn.',traits=['rocket','backblast','assembly_3_ready'])
  continue
 if n in vehicle_specs:
  key,name,warhead,ref,cps=vehicle_specs[n]
  make_round(e,m,key,name,'rocket','vehicular_unguided_rocket',ref,warhead=warhead,damage=m['raw_calc'].get('damage'),
    cps=cps,range_kind='minimum_yards_and_maximum_yards',range_value=m['stats']['range'],platform=n,
    notes='This is a rocket launcher and rocket; rate of fire and Shots represent pod, not identical to individual rockets.',traits=['unguided','minimum_range_not_half_damage'])
  continue
 if n in guided_specs:
  key,name,guide,ref,cps,mindist,gt=guided_specs[n]
  # Note source name 9M17M in GCS but 9M14M in HT. Preserve GCS and flag discrepancy.
  custom_note=('GCS name 9M17M does not agree with HT151–152 9M14M; verify naming before reproducing as official.' if n.startswith('Kolomna') else None)
  rid=make_round(e,m,key,name,'guided_missile','purpose_built_missile',ref,warhead=('ABF' if 'AIM-9' in n else 'MS-HEAT' if 'Javelin' in n else 'HE-AB' if 'Stinger' in n else 'HEAT'),
    damage=m['raw_calc'].get('damage'),cps=cps,range_kind='speed_yards_per_second_and_maximum_yards',
    range_value=m['stats']['range'],guidance=gt,platform=n,notes=custom_note,
    traits=['attack_when_missile_reaches_target','minimum_range_yards='+str(mindist),'backblast','not_ordinary_firearm_attack'])
  items[rid]['rocket_contract']['min_range_yards']=mindist
  items[rid]['rocket_contract']['attack_timing']='resolve_on_target_arrival'
  items[rid]['rocket_contract']['guidance_details']=guide
  continue

# Deliberately distinguish self-contained missiles vs ammunition (RPG7 variants) and rifle grenades.
for e,m in old_unlinked:
 if m['weapon_mode_id'] in changes:continue
 n=e['name'];wtype=m.get('weapon_family')
 if wtype=='muscle-powered-ranged' and n not in ('Slingshot','Speargun'):
  source_only(e,m,'excluded_hand_grenade','Ручная граната, исключена из активного каталога по решению пользователя.');continue
 if wtype=='grenade-launcher' and n in ('AMC M17','Bergmann GSprgr30','MECAR Energa-75','Rafael Simon 150'):
  source_only(e,m,'excluded_rifle_grenade','Винтовочная граната; пока исключена вместе с гранатами. Требует отдельного интерфейса rifle grenade + патрон для метания, не стандартная пуля.', 'HT 193-194');continue
 if n in ('Beattie M2-2','DWM FmW46','Fiedler Klief','TOZ LPO-50','TOZ ROKS-2'):
  source_only(e,m,'excluded_flamethrower','Огнемёт и топливо; вне текущего патронного каталога.', 'HT 178-180');continue
 if n in ('Large Squirt Carbine','Squirt Carbine'):
  source_only(e,m,'excluded_liquid_projector','Жидкостный распылитель; вне текущего патронного каталога.', 'HT 180');continue
 if n in ('NORINCO QXJ04','NORINCO ZM87'):
  source_only(e,m,'excluded_directed_energy','Лазерный излучатель, не патронный ствол.','HT 181');continue
 if n in ('Combustion Nail Gun','Pneumatic Nail Gun','Powder-Actuated Nail Gun'):
  source_only(e,m,'deferred_industrial_consumable','Гвозди или промышленный заряд; отдельный расходный предмет, не универсальная пуля.', 'HT 28');continue
 if n in ('Slingshot','Speargun'):
  source_only(e,m,'deferred_muscle_projectile','Мускульный боеприпас (шарик/стрела), не патрон HT и не ракетное оружие.', 'HT 201');continue
 if n in ('TASER M18','TASER M26','TASER X26','Tasertron TE-76','MX Animal TASER'):
  # Proprietary munition, no forged statistics. HT89–90.
  make_round(e,m,'taser_'+re.sub('[^a-z0-9]+','_',n.lower()).strip('_'),n+' proprietary electrodes/cartridge',
    'proprietary_electrical_cartridge','electrode_cassette','HT 89-90',notes='Model-specific electrodes/cartridge; HT does not supply universal price or per-cartridge mass; preserve native HT Affliction.',traits=['proprietary_cartridge','HT_effect_is_on_weapon'],mode_status='proprietary_electrical_cartridge');continue
 if n=='M86 PDM':
  source_only(e,m,'excluded_mine','Mina / area denial munition; excluded from cartridge selection.','HT 189');continue
 if n=='Remington Rolling Block':raise AssertionError('rolling block should be resolved')
 if n=='Motovilikha D-81TM':
  link_existing(e,m,'ht_125x408mmr','HT 140, 177','Штатный 125×408mmR с полусгораемой гильзой; конкретная выбранная боевая часть (HEAT/APFSDS/HE) определяется режимом, не применяется повторно.');continue
 if n=='DTAT MR60CS, 60mm':
  # 60 mm gun-mortar shell; book HT140 confirms gun mortar not generic drop-fired tube.
  # One family supports both firing methods, no link to generic mortar class since variant cartridge unspecified.
  rid='ht_specific_dtat_mr60cs_60mm_gun_mortar_shell'
  if rid not in items:
   make_round(e,m,'dtat_mr60cs_60mm_gun_mortar_shell','DTAT MR60CS 60mm gun-mortar HE shell','gun_mortar_shell','purpose_built_HE','HT 140',
     notes='Breechloading and trigger-fired HE/HEAT/smoke/etc; source does not demonstrate interchangeability with 60mm drop-fire mortar bombs.');continue
  else:link_existing(e,m,rid,'HT 140','Одна и та же HE-мина DTAT MR60CS для прямого и навесного огня. Не приравнивать к обычной 60-мм мине без подтверждения.');continue
 if n=='M86 PDM':raise AssertionError()
 if n in ('AMC M17','MECAR Energa-75'):raise AssertionError()
 if n in ('Rafael Simon 150','Bergmann GSprgr30'):raise AssertionError()
 if n=='Buck HAFLA, 35mm':raise AssertionError('handled')
 if n=='Remington New Model Army, .44 Caplock':raise AssertionError('handled')
 if n=='MAS Pistolet AN XIII, 17.1mm Flintlock':raise AssertionError('handled')
 if n=='North & Cheney M1779, .69 Flintlock':raise AssertionError('handled')
 if m['weapon_mode_id'] in changes:continue
 source_only(e,m,'requires_external_identification','Запись не удалось однозначно определить; не выдавать произвольный патрон, нужна проверка именно этой модели.');

assert len(changes)==75,(len(changes),[e['name'] for e,m in old_unlinked if m['weapon_mode_id'] not in changes])

# Create add-on projectile families for published alternate launch loads, without overloading native weapon mode.
# Exact book text with explicit Dmg; alternate variants use native fire-mode with runtime override ONCE.
def variant(platform,base_key,key,name,warhead,ref,damage=None,secondary=None,wps=None,cps=None,range_val=None,notes=None,selectable_on_base=True):
 e=by_eq[platform];base=items['ht_specific_'+base_key]
 modeid=base['weapon_mode_ids'][0]
 mode=next(m for m in e['modes'] if m['weapon_mode_id']==modeid)
 rid=make_round(e,mode,key,name,'guided_missile' if base['ammunition_class']=='guided_missile' else 'rocket',
 'alternative_named_round',ref,warhead=warhead,damage=damage,secondary=secondary,wps=wps,cps=cps,
 range_kind=base['rocket_contract']['range_semantics'],range_value=range_val or base['rocket_contract']['range_source'],
 platform=platform,weapon_consumable=base['rocket_contract']['consumable_launcher_on_shot'],guidance=base['rocket_contract']['guidance'],
 notes=notes,traits=['explicit_alternate_only','requires_attack_override','do_not_mutate_base_mode'],do_link=False)
 # Add to base mode as additional explicitly available selections.
 if selectable_on_base:
  mode['ht_ammo_item_ids']=sorted(set(mode['ht_ammo_item_ids']+[rid]))
  items[rid]['weapon_mode_ids']=[modeid]
 else:
  items[rid]['weapon_mode_ids']=[]
  items[rid]['alternate_model_not_selectable_as_base_ammunition']=True
  items[rid]['rocket_contract']['model_template_for_equipment_id']=e['equipment_id']
  items[rid]['rocket_contract']['compatible_equipment_ids']=[]
  items[rid]['rocket_contract']['requires_explicit_platform_variant']=True
 return rid

# RPG-7 existing TWO weapon modes belong to ONE platform. ALT rounds should be selectable on either base attack,
# but damage is not the same; runtime must replace attack damage+secondary and range based on selected round.
for base_key,key,name,warhead,damage,secondary,wps in [
 ('rpg7_85mm_heat','rpg7_93mm_heat','RPG-7 93mm HEAT round','HEAT','6d×8(10) cr ex',[{'relation':'linked','damage':'6d×3 cr ex'}],5.7),
 ('rpg7_85mm_heat','rpg7_105mm_msheat','RPG-7 105mm tandem MS-HEAT round','MS-HEAT','6d×2(10) cr ex',[{'relation':'follow_up','damage':'6d×7(10) cr ex'},{'relation':'linked','damage':'6d×3 cr ex'}],9.9),
 ('rpg7_85mm_heat','rpg7_93mm_thermobaric','RPG-7 93mm thermobaric round','thermobaric','6d×9 cr ex',[],10.3)]:
 variant('KMZ RPG-7, 40mm',base_key,key,name,warhead,'HT 148-149',damage=damage,secondary=secondary,wps=wps,
   range_val='20/750' if warhead=='thermobaric' else None,
   notes='For RPG-7 data Wt. after slash is ammunition weight; needs selected warhead and rocket assembly. Do NOT assume launcher calibre gives warhead diameter.')
 # Cross-bind variants to both attack modes; each chosen load supplies entire damage definition.
 for mode in by_eq['KMZ RPG-7, 40mm']['modes']:
  if mode['combat_type']=='ranged':
   mode['ht_ammo_item_ids']=sorted(set(mode['ht_ammo_item_ids']+['ht_specific_'+key]))
   items['ht_specific_'+key]['weapon_mode_ids']=sorted(set(items['ht_specific_'+key]['weapon_mode_ids']+[mode['weapon_mode_id']]))

variant('Dynamit-Nobel PZF3, 60mm','pzf3_110mm_heat','pzf3_110mm_tandem','Panzerfaust 3 110mm MS-HEAT round','MS-HEAT','HT 149','6d×4(10) cr ex',
 [{'relation':'follow_up','damage':'6d×9(10) cr ex'},{'relation':'linked','damage':'6d×4 cr ex'}],wps=24.2,range_val='10/1,000')
variant('HEC M72A2, 66mm','m72a2_66mm_heat','m72a4_66mm_heat','M72A4 66mm HEAT launcher+rocket','HEAT','HT 149','6d×5(10) cr ex',
 [{'relation':'linked','damage':'6d×2 cr ex'}],notes='Different launcher model, not ammunition that can be reloaded into used M72A2',selectable_on_base=False)
variant('HEC M72A2, 66mm','m72a2_66mm_heat','m72a6_66mm_hedp','M72A6/7 66mm HEDP launcher+rocket','HEDP','HT 149','6d×2(10) cr ex',
 [{'relation':'linked','damage':'6d×2 [3d+1] cr ex'}],notes='Different one-shot model, requires replacement of entire launcher.',selectable_on_base=False)
variant('KBP RPO-A, 93mm','rpoa_93mm_thermobaric','rpoz_93mm_wp','RPO-Z 93mm WP launcher+rocket','WP','HT 149','6d [1d(0.2)] burn ex',
 notes='RPO-Z is a distinct disposable variant; not interchangeable ammunition for the spent RPO-A.',selectable_on_base=False)
variant('M260, 70mm','hydra_mk66_he','hydra_70mm_heavy_he','Hydra 70mm heavy HE rocket','HE','HT 150','6d×5 [3d+2] cr ex')
variant('M260, 70mm','hydra_mk66_he','hydra_70mm_hedp','Hydra 70mm HEDP rocket','HEDP','HT 150','6d×3(10) cr ex',
 [{'relation':'linked','damage':'5d×4 [3d+2] cr ex'}])
variant('M260, 70mm','hydra_mk66_he','hydra_70mm_wp','Hydra 70mm WP rocket','WP','HT 150','5d [1d(0.2)] burn ex',
 range_val='70/3,300',notes='Cloud radius 19 yd, duration 5 min.')
variant('M260, 70mm','hydra_mk66_he','hydra_70mm_beehive','Hydra 70mm Beehive rocket','Beehive','HT 150','2d+2 cut',
 range_val='450/7,000',notes='RoF of weapon with beehive 7×1179, Rcl 1; must override attack RoF in runtime too.')
variant('M260, 70mm','hydra_mk66_he','hydra_laser_guided_70mm','Hydra 70mm laser-guided rocket','HE','HT 150',
 range_val='300/10,500',notes='Laser guidance: Acc 4; cost per HE rocket $3,900 and rule B412; a distinct upgraded rocket.',cps=3900)

variant('Hughes BGM-71A TOW, 127mm','tow_bgm71a_heat','tow_bgm71d_heat','TOW 2 BGM-71D 152mm HEAT missile','HEAT','HT 151-152','6d×12(10) cr ex',
 [{'relation':'linked','damage':'8d×5 cr ex'}],cps=25000,range_val='360/4,165',notes='Variant is TOW 2; cannot automatically assume original TOW launcher compatibility without variant upgrade.',selectable_on_base=False)
variant('Hughes BGM-71A TOW, 127mm','tow_bgm71a_heat','tow_bgm71f_efp','TOW 2B BGM-71F top-attack EFP missile','EFP','HT 151-152',
 '6d×4(2) pi++',secondary=[{'relation':'second_top_attack_efp','damage':'6d×4(2) pi++'}],cps=50000,range_val='336/4,165',notes='Two separately resolving 147mm EFP top-attack charges; minimum range 165 yards. Needs compatible TOW 2 launcher.',selectable_on_base=False)
variant('Hughes BGM-71A TOW, 127mm','tow_bgm71a_heat','tow_bgm71h_he','TOW 2B Bunker Buster BGM-71H HE missile','HE','HT 151-152',
 '6d×9 [7d+2] cr ex',cps=10000,range_val='336/4,165',notes='Variant is BGM-71H, minimum range 165 yards; requires appropriate launcher.',selectable_on_base=False)
variant('Euromissile MILAN, 103mm','milan_103_heat','milan2_115mm_heat','MILAN 2 115mm HEAT missile','HEAT','HT 151','6d×12(10) cr ex',
 [{'relation':'linked','damage':'7d×4 cr ex'}],cps=30000,selectable_on_base=False)
variant('Euromissile MILAN, 103mm','milan_103_heat','milan3_117mm_msheat','MILAN 3 117mm MS-HEAT missile','MS-HEAT','HT 152','7d×2(10) cr ex',
 [{'relation':'follow_up','damage':'6d×11(10) cr ex'},{'relation':'linked','damage':'7d×4 cr ex'}],cps=35000,
 notes='Variant MILAN 3 with 30mm precursor; requires matching guidance/launching version.',selectable_on_base=False)
variant('Kolomna 9M17M Malyutka-M, 125mm','malyutka_m_heat','malyutka_9m14_original','9M14 Malyutka 125mm HEAT missile','HEAT','HT 151','6d×5(10) cr ex',
 [{'relation':'linked','damage':'6d×5 cr ex'}],selectable_on_base=False)
variant('Kolomna 9M17M Malyutka-M, 125mm','malyutka_m_heat','malyutka_9m14p2_msheat','9M14P2 Malyutka-2M MS-HEAT missile','MS-HEAT','HT 151','6d×2(10) cr ex',
 [{'relation':'follow_up','damage':'6d×9(10) cr ex'},{'relation':'linked','damage':'7d×5 cr ex'}],range_val='135/3,300',selectable_on_base=False)
variant('Ford AIM-9L Sidewinder, 127mm','aim9l_abf','aim9b_he','AIM-9B Sidewinder HE missile','HE','HT 152','6d×8 [6d+1] cr ex',
 cps=35000,range_val='632/3,800',notes='Different missile generation, seeker/Acc 2.',selectable_on_base=False)
variant('Ford AIM-9L Sidewinder, 127mm','aim9l_abf','aim9x_abf','AIM-9X Sidewinder ABF missile','ABF','HT 152',
 cps=75000,range_val='950/45,000',notes='Different missile generation, Acc 5.',selectable_on_base=False)
variant('GD FIM-92A Stinger, 70mm','stinger_fim92a_heab','stinger_fim92c_heab','FIM-92C Stinger HE-AB missile','HE-AB','HT 153',cps=45000,
 notes='Enhanced seeker, Acc 5. BCU consumes power, 6 sec target acquisition + 2 sec launch delay.',selectable_on_base=False)

# All confirmed special weapon ranges use minimum/speed semantics, even if mode was linked in HT v1.0.
for e in w['equipment']:
 if e['source']!='HT':continue
 for m in e['modes']:
  if m['combat_type']!='ranged':continue
  if e['reference'] in ('HT148','HT149','HT150','HT151','HT152','HT153') or e['name'] in ('GE M1A1 Bazooka, 2.36"','M20 Super Bazooka 3.5"'):
   typ='speed_yards_per_second_and_maximum_yards' if e['reference'] in ('HT152','HT153') else 'minimum_yards_and_maximum_yards'
   m['ht_range_interpretation']={'type':typ,'source':e['reference'],'raw_range':m['stats'].get('range'),
      'caution':'First range number does NOT mean half-damage distance'}
  elif e['reference'] in ('HT145','HT146','HT147','HT194'):
   m['ht_range_interpretation']={'type':'minimum_yards_and_maximum_yards','source':e['reference'],
      'raw_range':m['stats'].get('range'),'caution':'First range number means minimum range'}
# Recoilless cannons are supported as cartridge weapons but also require hazardous backblast guidance.
for e in w['equipment']:
 if e['source']!='HT':continue
 if e['name'] in ('Carl Gustaf M2, 84x250mmR','Firestone M18, 57x305mmR'):
  for m in e['modes']:
   if m['combat_type']=='ranged':m['ht_recoilless_contract']={'delivery':'recoilless_rifle',
       'ammo_is_round_not_rocket':'HT177 84×250mmR / 57×305mmR','backblast_rule':'HT147',
       'range':'first value is minimum range, not half damage'}
# Supplied selected-variant-specific structured overrides for cases where default native weapon mode differs.
for rid in rounds:
 x=items[rid];a=x.get('attack_override');
 if a is None:continue
 if rid=='ht_specific_hydra_70mm_beehive':a.update({'rate_of_fire':'7×1,179','recoil':'1'})
 if rid=='ht_specific_hydra_laser_guided_70mm':a.update({'accuracy':'4','guidance':'semi_active_laser'})
 if rid=='ht_specific_aim9b_he':a.update({'accuracy':'2'})
 if rid=='ht_specific_aim9x_abf':a.update({'accuracy':'5'})
 if rid=='ht_specific_stinger_fim92c_heab':a.update({'accuracy':'5'})
# Mark source-mandated platform restrictions: replacements are model change, not interchangeable shots.
for rid in rounds:
 x=items[rid];c=x.get('rocket_contract')
 if c:
  if c['range_semantics']=='speed_yards_per_second_and_maximum_yards':
   c['range_source_columns']=['speed_yd_s','max_range_yd']
  else:c['range_source_columns']=['minimum_range_yd','max_range_yd']
  if x['name'].startswith(('M72A','RPO-Z','TOW 2','MILAN 2','MILAN 3','AIM-9B','AIM-9X')):
   c['requires_launcher_model_confirmation']=True
  if c['consumable_launcher_on_shot']:
   c['inventory_consumption']='ENTIRE launcher+munition; cannot reload spent tube'
  else:c['inventory_consumption']='munition only unless weapon itself explicitly disposable'
# Distinguish missile-only mass, full disposable launching system, and projectile housed in launch tube.
# Values below are directly from HT tables 148/150/152 or weapon paragraphs 147-153, not estimates.
missile_weights={'ss11_heat':66,'malyutka_m_heat':25,'tow_bgm71a_heat':54,'milan_103_heat':26.4,
 'dragon_127_heat':25,'aim9l_abf':188,'javelin_fgm148a_mseat':35.1}
rockets_only={'m20_89mm_heat':9,'rpg2_82mm_heat':4,'rpg7_85mm_heat':5,
 'hale_9pr_he':8.4,'katyusha_m13_he':92,'m10_m8_he':38,'hydra_mk66_he':23}
complete_disposable={'pf30_150mm_heat':11.5,'m72a2_66mm_heat':5.2,'armbrust_67mm_heat':13.9,
 'rpoa_93mm_thermobaric':24.2,'at4_84mm_heat':14.7,'hafla_dm34_35mm_wp':1.4}
loaded_tubes={'pzf3_110mm_heat':23.3,'stinger_fim92a_heab':29.2}
backblast={'m20_89mm_heat':'source does not state per-weapon backblast dice',
 'pf30_150mm_heat':'1d burn','m72a2_66mm_heat':'1d+2 burn','armbrust_67mm_heat':'1d+1 cr',
 'rpoa_93mm_thermobaric':'3d burn','at4_84mm_heat':'4d burn',
 'rpg2_82mm_heat':'1d+2 burn','rpg7_85mm_heat':'1d+2 burn','rpg7_40mm_he':'1d+2 burn',
 'pzf3_110mm_heat':'2d cr','ss11_heat':'6d burn','malyutka_m_heat':'4d burn',
 'tow_bgm71a_heat':'8d burn','milan_103_heat':'2d burn','dragon_127_heat':'3d burn',
 'aim9l_abf':'5d×2 burn','stinger_fim92a_heab':'4d burn','javelin_fgm148a_mseat':'3d burn'}
for rid in rounds:
 x=items[rid];k=rid.removeprefix('ht_specific_');c=x.get('rocket_contract')
 if not c:continue
 c['backblast_cone_degrees']=60 if k in backblast else None
 if k in backblast:c['backblast_damage']=backblast[k]
 if k in missile_weights:
  c['munition_weight_lb']=missile_weights[k]
  c['weight_description']='missile weight after slash (HT152); launcher itself has separate weight except Sidewinder missile-only row'
 if k in rockets_only:
  c['munition_weight_lb']=rockets_only[k]
  c['weight_description']='rocket weight after slash in launcher table HT148/150'
 if k in complete_disposable:
  c['complete_launcher_and_munition_weight_lb']=complete_disposable[k]
  c['weight_description']='single-use entire weapon weight, NOT reload shot weight'
 if k in loaded_tubes:
  c['loaded_launch_tube_weight_lb']=loaded_tubes[k]
  c['weight_description']='loaded launch tube with munition; includes consumable launch tube'
 if k=='stinger_fim92a_heab':c['reusable_grip_weight_lb']=5.3
 if k=='pzf3_110mm_heat':
  c['reusable_firing_unit_weight_lb']=5.1
  c['disposable_loaded_launch_tube']=True
  c['inventory_consumption']='one loaded disposable launch tube/round; re-use 5.1-lb firing unit'
 if k in ('m72a2_66mm_heat','pf30_150mm_heat','armbrust_67mm_heat','rpoa_93mm_thermobaric','at4_84mm_heat'):
  c['single_use_whole_system']=True
 if k=='pf30_150mm_heat':c['complete_launcher_plus_round_price_usd']=400
 if k=='m72a2_66mm_heat':c['complete_launcher_plus_round_price_usd']=500
 if k=='armbrust_67mm_heat':c['complete_launcher_plus_round_price_usd']=1000
 if k=='rpoa_93mm_thermobaric':c['complete_launcher_plus_round_price_usd']=3600
 if k=='at4_84mm_heat':c['complete_launcher_plus_round_price_usd']=1600
 if k=='m20_89mm_heat':c['backblast_damage']=None
 if c['range_semantics']=='minimum_yards_and_maximum_yards':
  rg=str(c['range_source']).replace(',','').split('/') if c['range_source'] else []
  if len(rg)==2 and all(z.isdigit() for z in rg):c['min_range_yards']=int(rg[0]);c['max_range_yards']=int(rg[1])
 if c['range_semantics']=='speed_yards_per_second_and_maximum_yards':
  rg=str(c['range_source']).replace(',','').split('/') if c['range_source'] else []
  if len(rg)==2 and all(z.isdigit() for z in rg):c['speed_yd_per_s']=int(rg[0]);c['max_range_yards']=int(rg[1])
 # Source variant metadata is always preserved as on actual selected payload, not generic launcher.
 if k in ('rpg7_93mm_heat','rpg7_105mm_msheat','rpg7_93mm_thermobaric'):
  c['munition_weight_lb']=x['weight_per_shot_lb'];c['weight_description']='ammunition figure after slash HT149'
 if k=='pzf3_110mm_tandem':c['loaded_launch_tube_weight_lb']=24.2

# Need pointer to existing GCS companion Linked effect; do not invent secondary dice.
for e in w['equipment']:
 if e['source']!='HT':continue
 companions=[m for m in e['modes'] if m.get('combat_type')=='effect' and m.get('role') in ('linked-effect','follow-up-effect')]
 attacks=[m for m in e['modes'] if m.get('combat_type')=='ranged' and m.get('ht_ammo_item_ids')]
 if len(attacks)==1 and companions:
  m=attacks[0]
  for iid in m['ht_ammo_item_ids']:
   if iid in items and items[iid].get('rocket_contract') and not items[iid].get('alternate_model_not_selectable_as_base_ammunition'):
    # Native companion rows authoritative only for default load, not alternate variant stats.
    if items[iid]['source_evidence_level']=='book_explicit' and items[iid]['munition_type'] not in ('alternative_named_round',):
     items[iid]['native_linked_mode_ids']=[x['weapon_mode_id'] for x in companions]
 if e['name']=='KMZ RPG-7, 40mm':
  for m in attacks:
   for iid in m['ht_ammo_item_ids']:
    if iid in items and iid.endswith('rpg7_85mm_heat'):
     items[iid]['native_linked_mode_ids']=[x['weapon_mode_id'] for x in companions if '85mm' in (x.get('usage') or '')]

# The source already contained a 2.36-inch Bazooka round, so annotate instead of cloning it.
base_bazooka=items['ht_2_36_60mm_heat_rocket']
base_bazooka['rocket_contract']={'delivery_type':'rocket','platform':'GE M1A1 Bazooka, 2.36-inch',
 'range_semantics':'minimum_yards_and_maximum_yards','min_range_yards':10,'max_range_yards':700,
 'munition_weight_lb':3.4,'cost_per_rocket_usd':215,'backblast_cone_degrees':60,
 'backblast_damage':'1d+1 burn','consumable_launcher_on_shot':False,
 'source_ref':'HT 147-148','policy':'source-verified HEAT rocket, no caliber-only substitutions'}
# Bugfix: variants with base GGA effect stats should NOT make status equal generic HT shot.

# Reverse links reconstructed from scratch across HT, including new variant payloads and existing legacy ammo references.
for i in h['ammo_items']:i['weapon_mode_ids']=[]
for e in w['equipment']:
 if e['source']!='HT':continue
 for m in e['modes']:
  for rid in m.get('ht_ammo_item_ids',[]):
   assert rid in items,(e['name'],rid)
   items[rid]['weapon_mode_ids'].append(m['weapon_mode_id'])
for i in h['ammo_items']:i['weapon_mode_ids']=sorted(set(i['weapon_mode_ids']))
for f in h['ammo_families']:
 mids=sorted({q for aid in f['ammo_item_ids'] for q in items[aid]['weapon_mode_ids']})
 f['compatible_weapon_mode_ids']=mids;f['linked_weapon_mode_count']=len(mids)

# Add exact match exceptions at weapon level, no conversion without a different mode/version.
for e in w['equipment']:
 if e['source']=='HT' and e['name']=='Remington Rolling Block':
  e['ht_verified_separate_chamberings']=[{'name':'Remington Number 1 Long Range Creedmoor','ammo_item_id':'ht_book_44_90_remington_special_11_2x62mmr','source_ref':'HT 109','policy':'different model, not alternative ammo for .45-70'},
  {'name':'Remington Number 10 shotgun','ammo_item_id':None,'source_ref':'HT 109','policy':'different model with 12G 2.5-inch shotshell'}]
 if e['source']=='HT' and e['name']=='Colt Model 1895, 6x60mmR':
  e['ht_verified_separate_chamberings']=[{'name':q,'source_ref':'HT 130','policy':'requires physical rechambering/different production gun'} for q in ['6.5×52mm Mannlicher-Carcano','7×57mm Mauser','7.62×54mmR Mosin-Nagant','7.65×53mm Mauser','.303 British']]

# AT LEAST all 75 handled; record exact audit by original ID.
assert len(changes)==75
h['revision']='1.1';h['source']['input_equipment_catalog']='olegurps_weapon_reference_catalog_v5_5.json'
h['source']['rocket_and_missile_review']='HT 140-153, 193-194; all weapon attacks copied as native modes; selected variant attack replacements only.'
h['rocket_launcher_contract']={
 'platform_separation':'launcher != projectile != warhead',
 'caliber_policy':'Launch tube diameter is NOT warhead diameter; permit only explicit rounds with named platform',
 'choice_policy':'Only manufacturer/source-confirmed named rounds; alternative missile generations or disposable launcher models require launcher-model confirmation',
 'attack_types':{'unguided':'GGA native shot; range first figure is MINIMUM not half-damage',
                 'guided':'Artillery (Guided Missile), skill attack on arrival, first Range is SPEED yd/sec',
                 'homing':'Artillery (Guided Missile) for lock/aim; resolve homing under GURPS B413 upon arrival'},
 'guided_attack_timing':'No attack roll on launch when missile is not yet at target; track flight until intercept or Max range',
 'backblast':'HT147 60-degree rear cone; do not auto-assume same damage for all launchers; indoor HT-4 and special hazards',
 'inventory':'Disposable launcher is used up together with round; reusable platform consumes projectile; launcher+rocket weight may be combined in GCS',
 'stat_override':'selected projectile damage, linked/follow-up components, range, sometimes Acc/RoF must override native displayed mode only once; do not overwrite GGA sources',
 'linked_and_follow_up':'distinct; preserve each, never double roll from GCS companion mode + ammo effects',
 'effect_hint':'One collapsed descriptive hint in existing GGA attack ChatMessage, no auto status or damage',
 'not_interchangeable_by_same_diameter':True,
}
h['unmatched_75_reconciliation']={
 'previous_unlinked_count':75,
 'entries':list(changes.values()),
 'status_counts':dict(collections.Counter(x['status'] for x in changes.values())),
 'original_mode_ids':sorted(changes),
 'unreviewed_count':0,
 'coverage_note':'Reviewed != every item is compatible with standard ammunition. Exclusions/deferred categories intentionally remain without ammo link.',
}
h['audit']['prior_unresolved_75']=h['audit']['unresolved_weapon_modes']
h['audit']['HT_mode_links_count']=sum(1 for e in w['equipment'] if e['source']=='HT' for m in e['modes'] if m['combat_type']=='ranged' and m.get('ht_ammo_item_ids'))
h['audit']['mode_link_status_counts_after']=dict(collections.Counter(m.get('ht_ammo_resolution',{}).get('status','missing') for e in w['equipment'] if e['source']=='HT' for m in e['modes'] if m['combat_type']=='ranged'))
h['audit']['source_specific_new_ammo_count']=len(rounds)
h['audit']['ammo_item_count']=len(h['ammo_items']);h['audit']['unique_cartridge_family_count']=len(h['ammo_families'])
h['source']['reference']='HT 89-94, 109-120, 130-153, 161-178, 193-201'
h['weapon_catalog_link']['catalog_filename']='olegurps_weapon_reference_catalog_v5_5.json'
# update weapon link version only; compare previous fields later.
w['ht_ammunition_catalog_link']['catalog_filename']='olegurps_ht_ammunition_catalog_v1_1.json'
w['ht_ammunition_catalog_link']['catalog_revision']='1.1'
w['rules_audit_v5_5']={'source':'HT 89-94, 109-120, 130-153, 161-178, 193-201','reviewed_75':75,
    'source_specific_rounds_added':len(rounds),'classification_counts':h['unmatched_75_reconciliation']['status_counts'],
    'foundry_live_integration':False,'notes':'Rocket calibers are tube vs warhead, guided speed vs minimum range, separate launchers, no new GGA roll'}

for cat,ver,linkfield,newfile in [(lt,'1.2','weapon_catalog_link','olegurps_lt_ammunition_catalog_v1_2.json'),(ut,'2.6','weapon_catalog_link','olegurps_ut_ammunition_catalog_v2_6.json')]:
 assert linkfield in cat
 cat['revision']=ver
 cat[linkfield]['catalog_filename']='olegurps_weapon_reference_catalog_v5_5.json'
 assert isinstance(cat[linkfield],dict)
w['lt_ammunition_catalog_link']['catalog_filename']='olegurps_lt_ammunition_catalog_v1_2.json'
w['ut_ammunition_catalog_link' if 'ut_ammunition_catalog_link' in w else 'ammunition_catalog_link']['catalog_filename']='olegurps_ut_ammunition_catalog_v2_6.json'
save('olegurps_ht_ammunition_catalog_v1_1.json',h);save('olegurps_weapon_reference_catalog_v5_5.json',w)
save('olegurps_lt_ammunition_catalog_v1_2.json',lt);save('olegurps_ut_ammunition_catalog_v2_6.json',ut)
save('olegurps_ht_75_reconciliation_v1.json',h['unmatched_75_reconciliation'])
print('STATUS',h['unmatched_75_reconciliation']['status_counts'])
print('ROUNDS',len(rounds),'ITEMS',len(h['ammo_items']),'LINKED',h['audit']['HT_mode_links_count'],'UNLINKED',514-h['audit']['HT_mode_links_count'])
