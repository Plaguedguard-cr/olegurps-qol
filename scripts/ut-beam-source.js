// Ultra-Tech 4e (2007), printed UT113-118. Exact reviewed identities; no name admission.
const rows = [
  ["Wm0JEnm7qc1UMFRMJ","e4MAlLcPDVsEmrkE1","Area Defense Laser","F",10,83,"UT116","laser","Gunner","Beams"],
  ["WdE418jjnR9LT9qHl","eqmEm3vEao5gN7tJM","Assault Laser","chemical",1,40,"UT115","laser","Beam Weapons","Rifle"],
  ["W7lSMo8cFWd4JZTBT","ecRfyv5uDotDjSsUr","Dinosaur Graser","D",1,35,"UT118","graser","Beam Weapons","Rifle"],
  ["WTY4stfOc8dsLHbj6","etU9krC1dOaDdOChj","Dinosaur Laser","D",1,35,"UT115","laser","Beam Weapons","Rifle"],
  ["WQXf574e3MQgiqOjT","ex8c6sDVNeyGQwPqe","Dinosaur Rainbow Laser","D",1,35,"UT117","rainbow","Beam Weapons","Rifle"],
  ["WWD518NZwbUXKQkjv","eSSRq-HjPID9urpzo","Gatling Laser","E",1,100,"UT116","laser","Gunner","Beams"],
  ["Wl8pfEIt0lDrF8N8y","ebBOHGh1wXVX7tAX2","Graser Cannon","F",10,83,"UT118","graser","Gunner","Beams"],
  ["Wjehd13gUuNCUaJCG","e3p6dD7cCTRMSrfFl","Graser Carbine","C",2,28,"UT118","graser","Beam Weapons","Rifle"],
  ["WYXEggDAB8XvLAJUl","e9S498fQa60SS0VIR","Graser Pistol","C",1,33,"UT118","graser","Beam Weapons","Pistol"],
  ["WpwW-d59mktP9xP5h","e-KxyzBP1zZ55J1fl","Graser Rifle","D",1,83,"UT118","graser","Beam Weapons","Rifle"],
  ["WRCA_Pii_eNjB9e-a","eRZRZVQQ9098nEJ56","Heavy Graser Pistol","C",2,56,"UT118","graser","Beam Weapons","Pistol"],
  ["WTA-8AmAT11Ed7XnQ","eZy6BFBoX-Q3tdBQv","Heavy Laser Pistol","C",2,56,"UT115","laser","Beam Weapons","Pistol"],
  ["WJKny3UHj4SVw7sTF","exYOC6emseKRHSAyl","Heavy Rainbow Laser Pistol","C",2,56,"UT117","rainbow","Beam Weapons","Pistol"],
  ["WsnzM2hK-rTzkuSJp","edRBp1blNIxph6a0k","Heavy X-Ray Laser Pistol","C",2,56,"UT118","xray","Beam Weapons","Pistol"],
  ["WSzRnBfV8bvlC38tL","eLvWnLgQmuv8k2VBP","Holdout Graser","B",1,22,"UT118","graser","Beam Weapons","Pistol"],
  ["WK2APM9OSzUrmtcQb","eKgc2TYCDL6dVjNQx","Holdout Laser","B",1,22,"UT115","laser","Beam Weapons","Pistol"],
  ["Woa0LwUqAanFvHPN6","emE7-KRWB7VJkZKLZ","Holdout Rainbow Laser","B",1,22,"UT117","rainbow","Beam Weapons","Pistol"],
  ["Wt0gFdLg5mfVU8f0-","e0PlbKQPJLjRB_IdW","Holdout X-Ray Laser","B",1,22,"UT118","xray","Beam Weapons","Pistol"],
  ["WIFpFU3L67kVgjIaA","ekoxH_5vcxv9EvyAx","Laser Cannon","F",10,83,"UT116","laser","Gunner","Beams"],
  ["WOe0AiejW3FSlE-nO","eXIdPRU6d3ta3Zpgk","Laser Carbine","C",2,28,"UT115","laser","Beam Weapons","Rifle"],
  ["Wci8UZ1PotNMyGWgA","eANNUkHRbCEIhyacu","Laser Crystal","integrated",1,1,"UT115","laser","Beam Weapons","Pistol"],
  ["Wc8n7l5aGm-_aywZc","e0k1uCmBF-xZUhA7d","Laser Pistol","C",1,33,"UT115","laser","Beam Weapons","Pistol"],
  ["WEKZc3qKlKcbdRyNi","eXxvmiDy3aPO9TqMr","Laser Rifle","D",1,83,"UT115","laser","Beam Weapons","Rifle"],
  ["WpX009tH0GW_AT_qS","egs98yGPPjQ1nXN0_","Laser Sniper Rifle","chemical",1,20,"UT115","laser","Beam Weapons","Rifle"],
  ["WhXscpFZM5LXQYp5S","eyLBL-WE1b6Rc1pYb","Point Defense Laser","F",1,66,"UT116","laser","Gunner","Beams"],
  ["Wylv1NUHoY2bMMBFa","eQOQhu5RiWcnXgzw1","Rainbow Gatling Laser","E",1,100,"UT117","rainbow","Gunner","Beams"],
  ["W50gKKdq3_8ZCqNA4","egfiiZreRwlvqp2Mx","Rainbow Laser Cannon","F",10,83,"UT117","rainbow","Gunner","Beams"],
  ["WdwCPV31W4KiCkUU4","eFE5ZegbEyhGzw3uq","Rainbow Laser Carbine","C",2,28,"UT117","rainbow","Beam Weapons","Rifle"],
  ["WQ2l-NQg-aohXfpJq","edmYyO6iyS424Ay8F","Rainbow Laser Crystal","integrated",1,1,"UT117","rainbow","Beam Weapons","Pistol"],
  ["W9xFaHmLrYOcqTm_z","eum23ABkE3J3yXE_j","Rainbow Laser Pistol","C",1,33,"UT117","rainbow","Beam Weapons","Pistol"],
  ["WtuI6BNF1hhgDXR_Q","e2azNNabElm1GaC1w","Rainbow Laser Rifle","D",1,83,"UT117","rainbow","Beam Weapons","Rifle"],
  ["WLvTAej6RPNoyd8hQ","e6pVnV-VICF-6926e","Rainbow Strike Laser","F",1,45,"UT117","rainbow","Gunner","Beams"],
  ["WWZwHBgeAlfdvGZb7","eYtMl1usnY7MNPdPE","Rainbow Survival Laser","C",2,56,"UT117","rainbow","Beam Weapons","Rifle"],
  ["WXsCLDIZuQvzZAPJ-","eh0fmr3S9tmRjZyH6","Semi-Portable Graser","E",1,100,"UT118","graser","Gunner","Beams"],
  ["WY4jJpxSq5uG4KNl2","eZQ8BLxrnu-F0L4D7","Semi-Portable Laser","chemical",1,100,"UT115–116","laser","Gunner","Beams"],
  ["W3n55B_jGCqWOKiS-","eWSfmW9JVVqUMpv3-","Semi-Portable X-Ray Laser","E",1,100,"UT118","xray","Gunner","Beams"],
  ["WdvYMXBeLHXn_i-j1","e-vQD4NxTQEXD8eFf","Strike Graser","F",1,66,"UT118","graser","Gunner","Beams"],
  ["W1fUkbnr1bxzNtst0","e3v99Wae6-GVlZ0dh","Strike Laser","F",1,66,"UT116","laser","Gunner","Beams"],
  ["WtueyS1tl-dqhxus_","eZmWCtWBhycwnMQpq","Survival Laser","C",2,56,"UT115","laser","Beam Weapons","Rifle"],
  ["Wt6X3D82hwHZ6d3OY","eZ_OgL4YafFURvsCI","X-Ray Dino Laser","D",1,35,"UT118","xray","Beam Weapons","Rifle"],
  ["Wkj-hXVqccdySMffW","eslG-WfeXUSCD8bV5","X-Ray Laser Cannon","F",10,83,"UT118","xray","Gunner","Beams"],
  ["Wwq33XxaswGgzkEFH","eB7JtGqNZDx3lmzpD","X-Ray Laser Carbine","C",2,28,"UT118","xray","Beam Weapons","Rifle"],
  ["WyjXKeL0uUgpH4lj-","eWXkicVlR7hNRtiPR","X-Ray Laser Pistol","C",1,33,"UT118","xray","Beam Weapons","Pistol"],
  ["WaiupSRzwrIeGex04","e4sbsa7hJQmfyNlA2","X-Ray Laser Rifle","D",1,83,"UT118","xray","Beam Weapons","Rifle"],
  ["WAg2AcFXMlFlVMhp9","elEW6MrVe8fRVux42","X-Ray Strike Laser","F",1,66,"UT118","xray","Gunner","Beams"]
];
export const BEAM_PROFILES=Object.freeze(Object.fromEntries(rows.map(([modeId,equipmentId,name,cellSize,cells,shots,source,family,skill,specialization])=>[modeId,Object.freeze({modeId,equipmentId,name,cellSize,cells,shots,source,family,skill,specialization,chemical:cellSize==='chemical',oneShot:cellSize==='integrated',external:false})])));
export const beamProfile=id=>Object.hasOwn(BEAM_PROFILES,id??'')?BEAM_PROFILES[id]:null;
export const beamWeapon=weapon=>beamProfile(weapon?.standaloneModeId??weapon?.catalogModeId);
export const BEAM_PROJECT_POLICY=Object.freeze({modeId:'WY4jJpxSq5uG4KNl2',authority:'user-approved-project-exception',
  date:'2026-10-18',choice:'UT115 separate chemical tank; UT116 published Shots100',
  sourceConflict:'UT115 chemical tank versus UT116 70/Ep; E cell is not a consumed battery',
  tank:{sizeModifier:-2,dr:10,hp:12,splashDamage:'2d cor',splashRadiusYards:2,weightLb:null,cost:null}});

export function projectBeamCatalog(book,original){
  if(book!=='weapons'||!original.sources?.some(s=>s.code==='UT'&&s.sha256==='21f9ddb6ddc2936d74e5ad781af43a6d3787352172e0e1f74a80d85db7cbf5f1'))return original;
  const data=structuredClone(original);
  for(const e of data.equipment)for(const m of e.modes){
    const p=beamProfile(m.weapon_mode_id);if(!p||e.source!=='UT'||e.equipment_id!==p.equipmentId)continue;
    m.beam_source={...p,accounting:'published-shots-per-complete-source-set'};
    if(p.modeId===BEAM_PROJECT_POLICY.modeId)m.beam_source.projectPolicy=structuredClone(BEAM_PROJECT_POLICY);
    m.governing_skill={status:'resolved',skill:{name:p.skill,specialization:p.specialization,modifier:0},candidates:[{name:p.skill,specialization:p.specialization,modifier:0}],basis:p.source+':table-skill-header'};
    if(p.oneShot)m.ut_source_data.one_shot_crystal.accounting='sealed-single-use';
  }
  return data;
}
