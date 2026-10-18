// Ultra-Tech 4e (2007), UT82-83,141-143; approved errata remains in ut-errata.
// Exact mode identities. This registry does not admit another weapon by name or caliber.
const rows = [
  ['WQgMjnVvLnZiHzMnk','3mm_em','B',1,25,25],
  ['Wd5PTxwpIa1Irq42i','4mm_em','C',1,40,40],
  ['WmiUP8hzgsvbFNy4_','4mm_em','B',2,40,40],
  ['WUT2007GaussNeedler3mm','3mm_em','B',2,100,100],
  ['WUT2007GaussPDW4mm','4mm_em','C',1,80,80],
  ['WjHw1alZr-q5nItrB','3mm_em','C',1,100,100],
  ['WegCPnwG-HS41cU29','4mm_em','C',1,60,60],
  ['WdZSw5CqcSq_d3eSV','10mm_g','C',1,25,25],
  ['WkhAN9tcmB9eEkmY6','7mm_em','D',1,30,30],
  ['WD2iXlhuCPJV64Nt7','18_5mm_em','C',1,30,30],
  ['WibFBUhe4qzQPgxpB','18_5mm_em','C',1,10,10],
  ['WUVbnxIkj1gtEBekV','4mm_em','C',1,300,300],
  ['WbvkCgoaLuWViWyKK','7mm_em','D',1,200,200],
  ['WJstukbcBFPxQFtJE','4mm_em','D',1,1000,1000],
  ['Wcll8hDIppP48GXcD','40mm_g','C',1,3,3],
  ['Wq7SXzV-qosc5iY1q','25mm_g','C',1,3,3],
  ['WdI9_2mws5U3wSQl-','40mm_g',null,0,null,20],
  ['W__0RKAth-4yvVBSl','64mm_em','D',1,4,4],
  ['WdV0VzMAch5j8pxdy','40mm_em_heavy',null,0,null,200],
  ['WWkrDTQ7VS2Qucb0-','construction_nail','B',1,300,50],
  ['W0SxgGEVdQ84ypsCw','construction_nail','B',1,1000,50],
  ['W7FIiW8jX03PnOzxz','construction_nail','B',1,3000,50]
];
export const GAUSS_PROFILES = Object.freeze(Object.fromEntries(rows.map(([modeId,familyId,cellSize,cells,shots,feedCapacity]) =>
  [modeId,Object.freeze({modeId,familyId,cellSize,cells,shots,feedCapacity,
    source:familyId==='construction_nail'?'UT82-83':'UT141-143',external:cellSize===null,
    externalAuthority:modeId==='WdI9_2mws5U3wSQl-'?'user-decision-2026-10-18':cellSize===null?'UT143':null,
    railgun:['WdZSw5CqcSq_d3eSV','WkhAN9tcmB9eEkmY6','WdV0VzMAch5j8pxdy'].includes(modeId),
    coilgun:!['WdZSw5CqcSq_d3eSV','WkhAN9tcmB9eEkmY6','WdV0VzMAch5j8pxdy','W__0RKAth-4yvVBSl'].includes(modeId)&&familyId!=='construction_nail',
    nail:familyId==='construction_nail'})])));
export const GAUSS_FAMILIES = Object.freeze(Object.fromEntries(rows.map(([id,family])=>[id,family])));
export const gaussProfile = id => Object.hasOwn(GAUSS_PROFILES,id??'')?GAUSS_PROFILES[id]:null;
export const GAUSS_PROJECT_POLICY = Object.freeze({
  authority:'user-approved-project-policy',date:'2026-10-18',
  coilgunAPDS:true,railgunAPDS:false,
  hmg:'UT143:7mm/200/TL10; conflicting UT141:4mm/4000 retained as evidence',
  minigun:'UT143:TL10; conflicting UT141:TL9 retained as evidence',
  autoEMGL:'External power by user decision; original UT143 note [4] D/20 differs'
});
export function projectGaussCatalog(book,data) {
  if(book!=='weapons'||!data.sources?.some(s=>s.code==='UT'&&s.sha256==='21f9ddb6ddc2936d74e5ad781af43a6d3787352172e0e1f74a80d85db7cbf5f1'))return data;
  const projected=structuredClone(data);
  for(const e of projected.equipment??[])if(e.source==='UT')for(const m of e.modes??[]) {
    const p=gaussProfile(m.weapon_mode_id);if(!p)continue;
    m.ut_gauss={revision:1,source:p.source,physicalFamily:p.familyId,
      power:{cellSize:p.cellSize,cells:p.cells,shotsPerSet:p.shots,external:p.external,authority:p.externalAuthority??p.source},
      speedSource:'UT141 expressly refers to UT139; nails UT82',
      ...(m.weapon_mode_id==='WbvkCgoaLuWViWyKK'?{conflict:GAUSS_PROJECT_POLICY.hmg}:{}),
      ...(m.weapon_mode_id==='WJstukbcBFPxQFtJE'?{conflict:GAUSS_PROJECT_POLICY.minigun}:{}),
      ...(m.weapon_mode_id==='WdI9_2mws5U3wSQl-'?{conflict:GAUSS_PROJECT_POLICY.autoEMGL}:{}),
      ...(p.nail?{safety:'UT82: living-flesh interlock; Security roll and one minute per attempt to disable; DR3 conceals flesh'}:{})};
    m.ut_source_data={...m.ut_source_data,power_accounting_required:!p.external,special_variants_pending:false,readiness:'implemented-gauss-resources'};
    if(m.weapon_mode_id==='WbvkCgoaLuWViWyKK'||m.weapon_mode_id==='WJstukbcBFPxQFtJE')
      m.ut_source_data.source_conflict=m.ut_gauss.conflict;
  }
  return projected;
}
