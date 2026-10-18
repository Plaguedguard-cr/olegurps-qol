import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { CatalogService } from '../scripts/catalog-service.js';
import { AmmunitionCompatibilityService } from '../scripts/ammunition-compatibility-service.js';
import { AutomaticAmmunitionProfileService } from '../scripts/tools/automatic-ammunition-profiles.js';
import { GAUSS_PROFILES, GAUSS_PROJECT_POLICY } from '../scripts/ut-gauss-source.js';
import { UT_CONVENTIONAL_RULES } from '../scripts/tools/ut-conventional-ammunition.js';
import { UT_SPECIAL_RULES } from '../scripts/tools/ut-special-ammunition.js';
import { UT_EXTENDED_RULES } from '../scripts/tools/ut-extended-ammunition.js';
import { UT_HOMING_GUIDANCE } from '../scripts/tools/ut-sefop.js';
import { standaloneModeStats } from '../scripts/tools/standalone-weapon-service.js';
import { resolveAmmunitionEffects } from '../scripts/tools/ammunition-effects.js';
import { requiredAmmunitionTL } from '../scripts/tools/ammunition-tech-level.js';

const root=new URL('../',import.meta.url);
export const gaussMatrixURL=new URL('data/ut-gauss-ammunition-matrix.json',root);
export async function loadGaussCatalogs() {
  const c=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('data/catalogs/'+u.split('/').at(-1),root),'utf8'))})});
  await c.load();return c;
}
export function buildGaussMatrix(catalogs) {
  const compatibility=new AmmunitionCompatibilityService(catalogs),automatic=new AutomaticAmmunitionProfileService({catalogs,compatibility});
  const variants={...UT_CONVENTIONAL_RULES,...UT_SPECIAL_RULES,...UT_EXTENDED_RULES};
  const bySourceId=Object.fromEntries(Object.entries(variants).map(([id,r])=>[r.id,id]));
  const records=[...catalogs.getCatalog('ut').warheads.map(r=>({...r,kind:'warhead'})),
    ...catalogs.getCatalog('ut').special_loads.map(r=>({...r,kind:'special-load'}))].filter(r=>r.id!=='standard_inert');
  const rows=[];
  for(const profile of Object.values(GAUSS_PROFILES)) {
    const mode=catalogs.getMode(profile.modeId),raw=standaloneModeStats(mode),family=catalogs.getAmmoFamily('ut',profile.familyId);
    if(!mode||mode.ammunition_profile.primary_ammo_family_id!==profile.familyId||!family)throw Error('Broken Gauss source identity');
    const base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:profile.familyId};
    rows.push({id:profile.modeId+':base',modeId:profile.modeId,familyId:profile.familyId,candidateId:'standard_inert',
      source:family.source_ref,physicalCompatibility:'compatible',availabilityTL:family.tl,
      implementation:'available',conditions:profile.nail?['UT82-interlock-manual']:[],
      damage:raw.damage,range:raw.range});
    const candidates=[...records,{id:'homing',name:'Homing',kind:'warhead',min_tl:9,source_ref:'UT146'}];
    for(const candidate of candidates) {
      const variantId=bySourceId[candidate.id]??'ut_'+candidate.id;
      for(const availabilityTL of [9,10,11,12].filter(tl=>tl>=(candidate.min_tl??9))) {
        const selections=candidate.id==='homing'?Object.keys(UT_HOMING_GUIDANCE).map(homingGuidance=>({homingGuidance})):
          candidate.id==='he'?[{fuze:'impact'},{fuze:'proximity'}]:[{}];
        for(const selection of selections) {
          const parameters={availabilityTL,...selection};
          const check=compatibility.checkCompatibility(profile.modeId,candidate.id,{book:'ut',kind:candidate.kind,availabilityTL});
          const prepared=automatic.prepare({modeId:profile.modeId,base,variantId,parameters});
          const effect=prepared.state==='complete'?resolveAmmunitionEffects({raw,variantId,baseStatus:prepared.baseStatus,
            constructionStatus:prepared.rulesStatus,facts:prepared.facts}):null;
          const available=!!effect?.nativeSafe;
          const sensor=UT_HOMING_GUIDANCE[selection.homingGuidance],minimum=sensor?.minSizeByTL[availabilityTL];
          const homingExcluded=candidate.id==='homing'&&(mode.ammunition_profile.supports_exotic_warheads===false||
            availabilityTL<family.tl||minimum==null||!Number.isFinite(family.caliber_mm)||family.caliber_mm<minimum);
          const physical=prepared.state==='complete'?'compatible':homingExcluded?'incompatible':check.status;
          const reason=available?null:homingExcluded?'UT146: не выполнены предел размера, TL конкретного сенсора или допуск платформы.':
            check.reasons?.find(r=>r.code==='UT_EM_TECHNOLOGY_UNKNOWN')?.message??
            prepared.reasons?.[0]??effect?.reason??check.reasons?.map(r=>r.code).join(';')??'Нет готового профиля';
          rows.push({id:[profile.modeId,candidate.id,availabilityTL,...Object.values(selection)].join(':'),
            modeId:profile.modeId,familyId:profile.familyId,candidateId:candidate.id,name:candidate.name,
            variantId,source:candidate.source_ref??variants[variantId]?.source??'UT152-159',
            physicalCompatibility:physical,constructionTL:availabilityTL,
            availabilityTL:prepared.type?requiredAmmunitionTL(prepared.type,catalogs):Math.max(availabilityTL,family.tl??0),
            parameters:prepared.type?.recipe?.parameters??parameters,
            implementation:available?'available':check.reasons?.some(r=>r.code==='UT_EM_TECHNOLOGY_UNKNOWN')?'not-admitted':physical==='incompatible'?'incompatible':'blocked',reason,
            conditions:[...(candidate.superscience?['superscience']:[]),...(candidate.notes_required?['owner-payload']:[]),
              ...(effect?.rules.instructionOnly?['manual-effect']:[]),...(candidate.id==='apds'&&profile.coilgun?['user-approved-coilgun-APDS']:[])],
            ...(available?{damage:effect.formula,components:effect.components,range:effect.effectiveChanges?.range??raw.range,
              instructionOnly:!!effect.rules.instructionOnly}:{}),
            ...(candidate.id==='apds'?{policy:GAUSS_PROJECT_POLICY}: {})});
        }
      }
    }
  }
  if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Duplicate Gauss matrix key');
  const summary={models:Object.keys(GAUSS_PROFILES).length,rows:rows.length,
    available:rows.filter(r=>r.implementation==='available').length,
    incompatible:rows.filter(r=>r.implementation==='incompatible').length,sourceUndetermined:rows.filter(r=>r.implementation==='not-admitted').length,
    blocked:rows.filter(r=>r.implementation==='blocked').length};
  return {schema:'olegurps-ut-gauss-matrix-v1',sourceEdition:'Ultra-Tech 2007',policy:GAUSS_PROJECT_POLICY,
    legacyMatrix:'ut-weapon-ammunition-matrix.json remains a separate unchanged UT-1/UT-2 inventory',
    models:Object.values(GAUSS_PROFILES),summary,rows};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const matrix=buildGaussMatrix(await loadGaussCatalogs()),text=JSON.stringify(matrix,null,2)+'\n';
  await writeFile(gaussMatrixURL,text,'utf8');
  console.log(JSON.stringify({summary:matrix.summary,sha256:createHash('sha256').update(text).digest('hex')}));
}
