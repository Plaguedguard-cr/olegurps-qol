import { LP_PROFILES, lpBlocker } from '../scripts/tools/ut-liquid-propellant.js';
import { UT_ERRATA_REVISION } from '../scripts/ut-errata.js';
import { utCompatibilityDecision, UT_COMPATIBILITY_REVISION } from '../scripts/ut-compatibility-policy.js';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { CatalogService } from '../scripts/catalog-service.js';
import { UT_ALL_FAMILIES, UT_SPECIAL_RULES } from '../scripts/tools/ut-special-ammunition.js';
import { UT_CONVENTIONAL_READY_MODES as UT_CONVENTIONAL_MODES, UT_CONVENTIONAL_DEFERRED, UT_CONVENTIONAL_RULES, UT_MANUAL_MOTOR_POWER } from '../scripts/tools/ut-conventional-ammunition.js';
import { UT_ADDITIONAL_FAMILIES } from '../scripts/tools/ut-ammunition-scope.js';
import { UT_HOMING_CANDIDATES } from '../scripts/tools/ut-sefop.js';
import { AutomaticAmmunitionProfileService } from '../scripts/tools/automatic-ammunition-profiles.js';
import { AmmunitionCompatibilityService } from '../scripts/ammunition-compatibility-service.js';
import { resolveAmmunitionEffects } from '../scripts/tools/ammunition-effects.js';
import { standaloneModeStats } from '../scripts/tools/standalone-weapon-service.js';
import { uawFeed } from '../scripts/tools/ut-uaw.js';
import { STORM_FEEDS, STORM_MODE } from '../scripts/tools/ut-storm-feeds.js';
import { PAINT_CARBINE_MODE } from '../scripts/tools/ut-paint-power.js';
import { ETC_PROFILES, etcBlocker } from '../scripts/tools/ut-etc.js';
const root=new URL('../',import.meta.url);
export const matrixURL=new URL('data/ut-weapon-ammunition-matrix.json',root);
export async function loadUTAuditCatalogs() {
  const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('data/catalogs/'+url.split('/').at(-1),root),'utf8'))})});
  await catalogs.load();return catalogs;
}
export async function loadUTSourceContract(){return JSON.parse(await readFile(new URL('tests/fixtures/ut-ammunition-coverage-contract.json',root),'utf8'));}
const warheadVariant=id=>Object.entries({...UT_CONVENTIONAL_RULES,...UT_SPECIAL_RULES}).find(([,r])=>r.id===id)?.[0]??'ut_'+id;
const specialVariant={drugged_dart:'ut_drugged_dart',drugged_ice_sliver:'ut_drugged_ice',paint_pellet:'ut_paint',
  biochemical_liquid_pellet:'ut_biochemical_liquid',solid_slug_25mm_tangler_gun:'ut_solid_slug'};
function assessSource(mode,family,candidate,kind) {
  const size=family.caliber_mm,ice=family.id==='3mm_ice';
  const decision=utCompatibilityDecision(mode.weapon_mode_id,candidate.id,{caliberMm:size});
  if(decision)return decision;
  const result=(status,reason,tl=9,conditions=[])=>({status,reason,availabilityTL:tl,conditions});
  if(kind==='design') {
    if(candidate.minSizeByTL){
      if(ice)return result('undetermined','UT140,146: установленная система наведения внутри ледяной иглы не подтверждена.');
      const tl=Object.keys(candidate.minSizeByTL).map(Number).find(tl=>size>=candidate.minSizeByTL[tl]);
      return tl?result('conditional','UT146: индивидуальный размер/TL и sensor '+candidate.name+'; отдельные lock-on и projectile attack.',tl,
        ['homing-sensor','lock-on','projectile-attack',...(candidate.superscience?['superscience']:[])]):
        result('incompatible','UT146: ни один опубликованный TL9–12 не допускает этот sensor в снаряде данного размера.');
    }
    const chemical=!!UT_CONVENTIONAL_MODES[mode.weapon_mode_id]||!!UT_CONVENTIONAL_DEFERRED[mode.weapon_mode_id];
    if(candidate.id==='liquid_propellant'&&family.id==='18_5mm_pc')return result('undetermined','UT139 задаёт liquid-propellant версию caseless-оружия; тождество существующего plastic-cased 18.5mmPC с отдельным жидкостным зарядом не подтверждено.');
    if(candidate.id==='etc'||candidate.id==='liquid_propellant')return chemical?
      result('conditional','UT139: отдельная конструкция оружия и дополнительный расходуемый ресурс.',9,['weapon-conversion','power-or-propellant']):
      result('incompatible','UT139: конструкция conventional slugthrower не распространяется на это оружие.');
    if(candidate.id==='homing')return ice?result('undetermined','UT140,146: управляемая ледяная игла не подтверждена.'):
      result('conditional','UT146: конкретный sensor, TL/размер, Artillery lock-on и независимая атака снаряда.',size>=15?9:size>=10?10:size>=7?11:12,['homing-sensor','lock-on','projectile-attack']);
    return result('incompatible','Область применения '+candidate.scope+'; выбранный физический режим к ней не относится.');
  }
  if(kind==='special-load') {
    const ids=mode.ammunition_profile?.special_load_ids??[];
    if(!ids.includes(candidate.id))return result('incompatible',candidate.source_ref+': нет индивидуальной связи этого специального заряда с режимом.');
    return result(candidate.id==='ice_needle'?'confirmed':'conditional',candidate.source_ref+': явно описанный специальный заряд этого носителя.',candidate.min_tl,
      candidate.id==='ice_needle'?[]:['owner-payload','manual-effect']);
  }
  if(ice)return candidate.id==='standard_inert'?result('incompatible','UT140: исходный заряд — ice needle, не inert metal.'):
    result('incompatible','UT135: Ice Gun прямо исключён из общего допуска exotic warheads.');
  const c=candidate.compatibility;
  const tls=[9,10,11,12].filter(tl=>tl>=candidate.min_tl&&(c.min_size_mm_by_tl?.[tl]??c.min_size_mm??0)<=size);
  if(!tls.length||c.min_size_mm!=null&&size<c.min_size_mm||c.max_size_exclusive_mm!=null&&size>=c.max_size_exclusive_mm)
    return result('incompatible',candidate.source_ref+': не выполнен опубликованный предел размера.',candidate.min_tl);
  const tags=mode.ammunition_profile?.platform_tags??[];
  if(c.platform_any?.length&&!c.platform_any.some(tag=>tags.includes(tag))||c.exclude_platforms.some(tag=>tags.includes(tag)))
    return result('incompatible',candidate.source_ref+': не выполнено требование к типу платформы.',candidate.min_tl);
  if(c.base_damage_types_any&&!c.base_damage_types_any.includes(mode.stats?.damage?.type))
    return result('incompatible',candidate.source_ref+': исходный тип Damage не допускается.',candidate.min_tl);
  const conditions=[];
  if(tls[0]>9)conditions.push('TL'+tls[0]);
  if(candidate.superscience)conditions.push('superscience');
  if(c.requires_homing)conditions.push('homing-sensor','lock-on','projectile-attack');
  if(['mininuke','micro_antimatter','stasis'].includes(candidate.id))conditions.push('preset-before-shot');
  if(['biochemical_aerosol','biochemical_liquid','swarm','message_psi_bomb'].includes(candidate.id))conditions.push('owner-payload','manual-effect');
  if(candidate.id==='vortex')conditions.push('atmosphere','gravity');
  if(candidate.id==='expendable_jammer'&&size===25)conditions.push('user-radius-25-yards');
  return result(conditions.length?'conditional':'confirmed',
    'UT135: guns/launchers, кроме Ice Gun; индивидуальный носитель '+family.name+' (UT135–140); '+candidate.source_ref+': требования выполнены.',tls[0],conditions);
}
export function buildUTMatrix(catalogs,contract) {
  const automatic=new AutomaticAmmunitionProfileService({catalogs,compatibility:new AmmunitionCompatibilityService(catalogs)});
  const candidates=[...contract.warheads.map(r=>({...r,kind:'warhead'})),...contract.specialLoads.map(r=>({...r,kind:'special-load'})),
    ...[...contract.designs,...contract.guidanceVariants].map(r=>({...r,kind:'design',source_ref:'UT'+r.pages.join(',')})),
    {id:'he_proximity',kind:'attack-mode',source_ref:'UT153–154',name:'HE proximity'}];
  const modes=Object.entries(UT_ALL_FAMILIES).map(([modeId,familyId])=>({modeId,familyId,
    name:catalogs.getEquipmentForMode(modeId).name,usage:catalogs.getMode(modeId).usage,
    caliberMm:catalogs.getAmmoFamily('ut',familyId).caliber_mm,
    warheadClass:catalogs.getMode(modeId).ammunition_profile.warhead_class,
    nativeTL:catalogs.getMode(modeId).ammunition_profile.native_weapon_tl,
    platformTags:catalogs.getMode(modeId).ammunition_profile.platform_tags,
    integralIgnitionPower:UT_CONVENTIONAL_MODES[modeId]||UT_CONVENTIONAL_DEFERRED[modeId]?
      {cell:'B',source:'UT135,149',accounting:'manual-existing-UT1',publishedPerShotDrain:null,sourceDecisionPending:false,userDecision:'2026-10-15'}:null,
    scope:UT_ADDITIONAL_FAMILIES[modeId]?'deferred':'UT-1/UT-2',source:'UT135–140',
    motorPowerAccounting:UT_MANUAL_MOTOR_POWER[modeId]?{method:'manual',userDecision:'2026-10-15',source:'UT136',...UT_MANUAL_MOTOR_POWER[modeId]}:null,
    power:modeId==='Wg_f0E5hqv6o1C0Uj'?'B cell / 10 magazines':
      modeId==='WYYJ_58OEKOTk38wi'?'B cell / 19500 shots':modeId==='W6-C_sQqk0Ak_c-8_'?'C cell / 15 minutes':
      modeId==='WmyROTLk0gs7lrYCE'?'B cell / 15 minutes':modeId==='W6bX3WBkGZdZfoeMu'?'C cell / 15 minutes':null}));
  const configurations=modes.map(m=>({id:m.modeId,modeId:m.modeId,feed:'source-default',source:m.source}));
  configurations.push({id:'W5_HQQYf_zjoG9A7J:carbine-magazine',modeId:'W5_HQQYf_zjoG9A7J',feed:'Assault Carbine magazine',source:'UT136'},
    {id:'WmyROTLk0gs7lrYCE:storm-rifle-magazine',modeId:'WmyROTLk0gs7lrYCE',feed:'Storm Rifle magazine',source:'UT136;UT137'});
  const rows=[];
  for(const configuration of configurations) {
    const m=modes.find(m=>m.modeId===configuration.modeId),mode=catalogs.getMode(m.modeId),family=catalogs.getAmmoFamily('ut',m.familyId);
    for(const candidate of candidates) {
      const assessed=candidate.kind==='attack-mode'?
        family.caliber_mm>=10&&family.id!=='3mm_ice'?{status:'conditional',reason:'UT153–154: HE proximity от 40 ярдов, область +4, только осколки и специальное рассеивание.',availabilityTL:9,conditions:['proximity-area-attack']}:
          {status:'incompatible',reason:'UT153: HE требует размера от 10mm; Ice Gun исключён.',availabilityTL:9,conditions:[]}:
        assessSource(mode,family,candidate,candidate.kind);
      const admissible=['confirmed','conditional'].includes(assessed.status);
      const homing=Object.hasOwn(UT_HOMING_CANDIDATES,candidate.id);
      let homingProfile=null,recipeParameters=null;
      let proximityProfile=null;
      if(candidate.id==='he_proximity'){
        recipeParameters={availabilityTL:9,fuze:'proximity'};
        const p=automatic.prepare({modeId:m.modeId,base:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:m.familyId},variantId:'ut_he',parameters:recipeParameters});
        if(p.state==='complete'){
          const effect=resolveAmmunitionEffects({raw:standaloneModeStats(mode),variantId:'ut_he',baseStatus:p.baseStatus,constructionStatus:p.rulesStatus,facts:p.facts});
          if(effect.nativeSafe&&effect.rules.heProximity&&effect.components.length===1&&effect.components[0].role==='fragmentation')proximityProfile=p;
        }
      }
      if(homing){
        for(const availabilityTL of [9,10,11,12]){
          const parameters={availabilityTL,homingGuidance:UT_HOMING_CANDIDATES[candidate.id]??'infrared'};
          const p=automatic.prepare({modeId:m.modeId,base:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:m.familyId},variantId:'ut_homing',parameters});
          if(p.state==='complete'){
            const effect=resolveAmmunitionEffects({raw:standaloneModeStats(mode),variantId:'ut_homing',baseStatus:p.baseStatus,constructionStatus:p.rulesStatus,facts:p.facts});
            if(effect.nativeSafe){homingProfile=p;recipeParameters=parameters;break;}
          }
        }
        recipeParameters??={availabilityTL:12,homingGuidance:UT_HOMING_CANDIDATES[candidate.id]??'infrared'};
      }
      let blocker=null;
      const alias=candidate.id==='ice_needle'?'base':candidate.id==='biochemical_liquid_pellet'?'ut_biochemical_liquid':null;
      const recipeVariant=candidate.id==='he_proximity'?'ut_he':homing?'ut_homing':candidate.id==='standard_inert'||alias==='base'?null:candidate.kind==='warhead'?warheadVariant(candidate.id):specialVariant[candidate.id]??alias;
      if(admissible) {
        if(m.power&&!m.motorPowerAccounting&&m.modeId!==PAINT_CARBINE_MODE)blocker='Нет общего атомарного учёта снаряда и обязательного питания: '+m.power+' ('+m.source+').';
        else if(homing&&!homingProfile)blocker='UT146: конкретные сенсор, размер, ТУ или профиль заряда не прошли подготовку ручного Homing.';
        else if(candidate.id==='etc')blocker=etcBlocker(m.modeId);
        else if(candidate.id==='liquid_propellant')blocker=lpBlocker(m.modeId,configuration.id);
        else if(candidate.id==='he_proximity'&&!proximityProfile)blocker='UT153–154: носитель или точный осколочный компонент HE не прошёл проверку существующего resolver.';
      }
      const feed=uawFeed(m.modeId);
      if((feed||m.modeId===PAINT_CARBINE_MODE)&&admissible&&!blocker&&recipeVariant){
        const p=automatic.prepare({modeId:m.modeId,base:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:m.familyId},variantId:recipeVariant,
          parameters:{availabilityTL:assessed.availabilityTL,...recipeParameters}});
        const effect=p.state==='complete'?resolveAmmunitionEffects({raw:standaloneModeStats(mode),variantId:recipeVariant,baseStatus:p.baseStatus,constructionStatus:p.rulesStatus,facts:p.facts}):null;
        if(!effect?.nativeSafe)blocker=(feed?'UAW':m.name)+': профиль заряда не прошёл существующий resolver: '+(effect?.reason??p.reasons.join(', '));
      }
      rows.push({configurationId:configuration.id,modeId:m.modeId,ammoFamilyId:m.familyId,candidateId:candidate.id,kind:candidate.kind,
        ...(m.modeId===STORM_MODE?{weaponFeed:configuration.id.endsWith(':storm-rifle-magazine')?STORM_FEEDS.magazine:STORM_FEEDS.belt}:{}),
        ...assessed,source:[configuration.source,candidate.source_ref??'UT152'],
        sourceLimits:candidate.kind==='warhead'?{minimumTL:candidate.min_tl,minimumMm:candidate.compatibility.min_size_mm,
          maximumExclusiveMm:candidate.compatibility.max_size_exclusive_mm,minimumMmByTL:candidate.compatibility.min_size_mm_by_tl??null,
          requiresHoming:candidate.compatibility.requires_homing,superscience:candidate.superscience}:null,
        implementation:assessed.implementationExcluded?'excluded':!admissible?'not-admitted':blocker?'blocked':'available',blocker,
        ...(candidate.id==='liquid_propellant'?{application:'weapon-configuration-not-ammunition',
          weaponConfiguration:LP_PROFILES[m.modeId]&&!lpBlocker(m.modeId,configuration.id)?
            {variant:'lp',...LP_PROFILES[m.modeId],feed:configuration.feed,nominalFeedIndependentOfInstalledMagazine:true}:null,
          executionBlocker:lpBlocker(m.modeId,configuration.id)}:{}),
        ...(candidate.id==='etc'&&admissible?{application:'weapon-configuration-not-ammunition',
          weaponConfiguration:ETC_PROFILES[m.modeId]?{variant:'etc',...ETC_PROFILES[m.modeId],
            nominalFeedIndependentOfInstalledMagazine:true}:null}:{}),
        ...(candidate.id==='sefop'&&admissible?{application:'manual-guidance-and-impact',preset:'sefop-or-TL10-aphex',guidanceSource:'UT146,154-155'}:{}),
        ...(homing?{application:'manual-guidance-and-impact',guidanceSource:'UT146',recipeParameters}:{}),
        ...(candidate.id==='he_proximity'?{application:'manual-burst-and-fragment-hits',recipeParameters,minimumYards:40,attackBonus:4,damageComponent:'fragmentation'}:{}),
        ...(feed?{feed:{...feed,source:'UT137',sourceConflict:null,
          ...(feed.id==='shotgun'?{errata:UT_ERRATA_REVISION}:{} )}}:{}),
        recipeVariant,
        aliasOf:alias});
    }
  }
  const summary={modes:modes.length,mainModes:modes.filter(m=>m.scope==='UT-1/UT-2').length,configurations:configurations.length,candidates:candidates.length,pairs:rows.length};
  for(const status of ['confirmed','conditional','undetermined','incompatible'])summary[status]=rows.filter(r=>r.status===status).length;
  summary.available=rows.filter(r=>r.implementation==='available').length;summary.blocked=rows.filter(r=>r.implementation==='blocked').length;
  const compatibilityStatusDigest=createHash('sha256').update(JSON.stringify(rows.map(r=>[r.configurationId,r.candidateId,r.status]))).digest('hex');
  return {schema:'ut-weapon-ammunition-completeness-v1',source:{...contract.source,errata:UT_ERRATA_REVISION,
    compatibilityRevision:UT_COMPATIBILITY_REVISION,compatibilityStatusDigest},userDecisions:[...contract.userDecisions,
    {id:'etc_blocker_resolution',date:'2026-10-18',source:'user-approved; docs/ut-etc-blocker-resolution-report.md',
      pcShotguns:'three standalone models; B 50/100/50',uaw:'one shared B 400/800',
      storm:'table feeds 60 and 12+1; shared C 600/1200',tank:'external power, no cell ledger',underbarrel:'ETC blocked',lpExclusions:'unchanged'},
    {id:UT_COMPATIBILITY_REVISION,date:'2026-10-18',source:'user-approved; docs/ut-16-compatibility-finalization-report.md',
      lpPC:'five source-undetermined, implementation excluded',swarm:'UT156 minimum40; conflict UT152 retained',
      partisan:'external Drugged Dart3mmN; foundry ordinary metal only',ice:'all six Homing excluded at every TL'}],
    modes,configurations,candidates:candidates.map(c=>({id:c.id,kind:c.kind,name:c.name??c.id,source:c.source_ref})),summary,rows};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]) {
  const contract=await loadUTSourceContract(),catalogs=await loadUTAuditCatalogs();
  if(process.argv.includes('--verify-sources')) {
    const source=await readFile('E:/\u041d\u0420\u0418/GURPS/BooksCodex/GURPS 4E - Ultra-Tech.pdf');
    if(createHash('sha256').update(source).digest('hex')!==contract.source.sha256)throw Error('PrimarySourceChecksumMismatch');
    const archive='A:/Program Files/FoundryVTT-R/olegurps-qol-archive/source-audits/2026-10-14-ultra-tech-preliminary/';
    const manifest=JSON.parse(await readFile(archive+'audit-manifest.json','utf8'));
    for(const item of manifest.files)if(createHash('sha256').update(await readFile(archive+item.path)).digest('hex')!==item.sha256)throw Error('ArchiveChecksumMismatch:'+item.path);
  }
  const matrix=buildUTMatrix(catalogs,contract),bytes=JSON.stringify(matrix,null,2)+'\n';
  await writeFile(matrixURL,bytes,'utf8');
  console.log(JSON.stringify({path:fileURLToPath(matrixURL),sha256:createHash('sha256').update(bytes).digest('hex'),...matrix.summary}));
}
