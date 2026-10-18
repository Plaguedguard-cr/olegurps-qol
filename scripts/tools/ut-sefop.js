// Ultra-Tech 2007, printed pp. 146, 154-155. Selection and saved facts, never rolls or permissions.
export const UT_HOMING_GUIDANCE = Object.freeze({
  infrared:{minSizeByTL:{9:15,10:10,11:7,12:0},skill:13,introductionTL:9,surcharge:3,attack:'Infravision'},
  multispectralPassive:{minSizeByTL:{9:40,10:25,11:15,12:10},skill:14,introductionTL:9,surcharge:9,attack:'Hyperspectral Vision'},
  multispectralAntiradiation:{minSizeByTL:{9:40,10:25,11:15,12:10},skill:14,introductionTL:9,surcharge:9,attack:'Detect Radar and Radio'},
  multispectralActive:{minSizeByTL:{9:40,10:25,11:15,12:10},skill:14,introductionTL:9,surcharge:9,attack:'Imaging Radar'},
  multiscanner:{minSizeByTL:{11:15,12:10},skill:12,introductionTL:11,surcharge:9,attack:'Penetrating Para-Radar',superscience:true}
});
// Preserve existing SEFOP recipe identities and imports; all manual guidance uses this one table.
export const UT_SEFOP_GUIDANCE = UT_HOMING_GUIDANCE;
export const UT_HOMING_SOURCE = Object.freeze({id:'homing',name:'Homing',min_tl:9,source_ref:'UT146',compatibility:{}});
export const UT_HOMING_CANDIDATES = Object.freeze({homing:null,homing_ir:'infrared',
  homing_multispectral_passive:'multispectralPassive',homing_multispectral_antiradiation:'multispectralAntiradiation',
  homing_multispectral_active:'multispectralActive',homing_multiscanner:'multiscanner'});
export function reviewHoming({caliberMm,availabilityTL,guidance='infrared'}) {
  const sensor=Object.hasOwn(UT_HOMING_GUIDANCE,guidance??'')?UT_HOMING_GUIDANCE[guidance]:null;
  const minimum=sensor?.minSizeByTL?.[availabilityTL];
  if(!Number.isInteger(availabilityTL)||availabilityTL<9||availabilityTL>12||
    !Number.isFinite(caliberMm)||caliberMm<=0||!sensor||minimum==null||caliberMm<minimum)return null;
  return {guidance,manual:true,aimSkill:'Artillery (Guided Missile)',
    projectileSkill:sensor.skill+availabilityTL-sensor.introductionTL,attack:sensor.attack,
    guidanceSurcharge:sensor.surcharge,superscience:!!sensor.superscience,
    source:'UT146',projectileHit:'manual',automaticGuidance:false};
}
export const manualProjectileGuidance = profile => profile?.damage?.rules?.manualHoming ?? profile?.damage?.rules?.manualSEFOP ?? null;
export function reviewSEFOP({caliberMm,availabilityTL,input={}}) {
  const guidance=input.sefopGuidance??'infrared',mode=input.sefopMode??'sefop',aspect=input.sefopAspect??'top';
  const reviewed=reviewHoming({caliberMm,availabilityTL,guidance});
  if(!reviewed||caliberMm<15||!['sefop','aphex'].includes(mode)||
    mode==='aphex'&&availabilityTL<10||!['top','side'].includes(aspect))return null;
  return {guidance,mode,aspect,manual:true,aimSkill:'Artillery (Guided Missile)',
    projectileSkill:reviewed.projectileSkill,attack:reviewed.attack,
    guidanceSurcharge:reviewed.guidanceSurcharge,superscience:reviewed.superscience,
    source:'UT146,154-155',projectileHit:'manual',automaticGuidance:false};
}
