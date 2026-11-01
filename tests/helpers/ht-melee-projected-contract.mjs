import assert from 'node:assert/strict';

// Accepted M0 HT projections (HT24-29,91,199-200,220; B271-274).
// Independent expected identities and fields, never the production projector.
const rows=[
 ['ev6IWD4-uE0rGlA0e','wFmnElv38Dl7vCHz8','two',-3,'HT24, B274'],
 ['e3Q0yEd8FcjmFpRm-','wCqDJeFrsa89Srp2B','two',0,'HT27'],
 ['ekL0jdgQgscxD85sl','w290SmH6F4RcvB53D','two',0,'HT27'],
 ['exU9mGlA5F9VfY6xD','w96LrgSujNkWxD4Fx','two',0,'HT27'],
 ['estPzif3b0oJq_WXs','wnGzvaraC07stjOaT','two',0,'HT27'],
 ['eN7A1S-7ZzuakCP-u','wICNkuQO9i_FxUxf4','knife',-1,'HT91, HT199, B272'],
 ['eN7A1S-7ZzuakCP-u','wk0vCihcCMUm3nBat','knife',-1,'HT91, HT199, B272'],
 ['eGOxhmW2NAoeOReiY','w37bkrQ8qa2ehFHj-','two',-2,'HT29, B274'],
 ['eezdwLDGWE_YDI6K7','wYaeKbdic5OYqbULN','two',-2,'HT220, B274'],
 ['eC6lytQUMuXS9guYX','w1E5tlALr61HNzATz','sword',0,'HT200'],
 ['eC6lytQUMuXS9guYX','wM0HTKatanaThrust','sword',0,'HT200'],
 ['e_1UECwWT7jlR5Jrh','wp6bDROiNcRJwGzWh','two',-2,'HT25, B274'],
 ['eW-cNpwCnVcCDwAjs','w8UxOYTiLBvz6mhoR','axe',-2,'HT25, B271'],
 ['eWRfOAIsArr59NgHj','wTlBkPvUYs-6Rw3l4','two',-2,'HT25, B274'],
 ['eajfEbEtM723JxHzZ','wrL7rskIEkSAtGcTC','axe',-2,'HT29, B271'],
 ['ebtmPVWYqoPTurp35','wiVweCQycRfxLWw-S','two',-3,'HT25, B274']
];
const names={two:'Two-Handed Axe/Mace',knife:'Knife',sword:'Broadsword',axe:'Axe/Mace'};
const defaults={
 two:[['dx',-5],['Axe/Mace',-3],['Polearm',-4],['Two-Handed Flail',-4]],
 knife:[['dx',-4],['Force Sword',-3],['Main-Gauche',-3],['Shortsword',-3]],
 sword:[['dx',-5],['Force Sword',-4],['Rapier',-4],['Saber',-4],['Shortsword',-2],['Two-Handed Sword',-4]],
 axe:[['dx',-5],['Flail',-4],['Two-Handed Axe/Mace',-3]]
};
export function expectedHTMeleeProjection(source){
 const result=structuredClone(source);
 if(source.equipment_id==='eC6lytQUMuXS9guYX'){
  const thrust=structuredClone(result.modes.find(m=>m.weapon_mode_id==='w1E5tlALr61HNzATz'));
  thrust.weapon_mode_id='wM0HTKatanaThrust';thrust.usage='Thrust';
  thrust.stats.damage={...thrust.stats.damage,st:'thr',base:'1',type:'imp'};
  thrust.raw_calc.damage='thr+1 imp';result.modes.push(thrust);
 }
 for(const [equipmentId,modeId,group,attackModifier,basis]of rows.filter(r=>r[0]===source.equipment_id)){
  const mode=result.modes.find(m=>m.weapon_mode_id===modeId);assert.ok(mode,equipmentId+'/'+modeId);
  const skill={name:names[group],specialization:null,modifier:0},candidates=[skill];
  mode.governing_skill={status:'resolved',skill,candidates,attack_modifier:attackModifier,basis};
  mode.governing_skill_selection={strategy:'fixed',candidates};
  mode.defaults=defaults[group].map(([name,modifier])=>name==='dx'?{type:'dx',modifier}:{type:'skill',name,modifier});
  mode.melee_source_id=modeId;
 }
 return result;
}
