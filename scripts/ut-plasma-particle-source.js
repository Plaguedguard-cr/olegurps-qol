// Ultra-Tech 2007, UT123-124,127. Complete published cell sets, never size-derived Shots.
const rows=[
 ['WaryGiX2EbvCktDl7','efggUXb-_JGtDCQF_','Assault Flamer','flamer',9,'5d burn','C',2,28,'Projector'],
 ['WOEDlzH2pTKr_0bqR','eUfbCmJPvwB0HNaZ8','Hand Flamer','flamer',9,'4d burn','C',2,56,'Projector'],
 ['WLnTn3lWWz9setbCw','eTpzUK1WXNbC04-KE','Heavy Flamer','flamer',9,'8d burn','D',1,35,'Projector'],
 ['Wg-QGifndN0vSPBj3','eaLzuKM73dmPJvji0','Semi-Portable Flamer','flamer',9,'6dx3 burn','E',1,100,'Beams'],
 ['WouV3E3GYwAURw6k4','eLdup3xMnqKVMq5Hu','Blaster Pistol','blaster',11,'3d(5) burn, sur','C',1,40,'Pistol','WrMfx8fvAyDEWIKeT'],
 ['WaZ3ufvxhRu996YpD','erThxW58i5iyiPTxx','Heavy Blaster Pistol','blaster',11,'4d(5) burn, sur','C',2,33,'Pistol','WpxxbQ_RlvxEME7go'],
 ['WyzhwKRV_rMXfwvUY','eoUYul4yk9eV1avsf','Holdout Blaster','blaster',11,'2d(5) burn, sur','B',1,13,'Pistol','WTGGXp9wzCuGJ86xI'],
 ['WvmDTF1vIN5M4INV1','eTNjwDleQndep59WO','Blaster Carbine','blaster',11,'5d(5) burn, sur','C',2,17,'Rifle','W7q3IlzDU1bZLNq7e'],
 ['WvNCHvcEUSlr69mGK','eCr1NpjGklF04-Lgl','Blaster Rifle','blaster',11,'6d(5) burn, sur','C',2,10,'Rifle','W70mB_HCc5Rb9D0C8'],
 ['Wt-FXBwAXE0qZVmQH','eiahzDTx9c502zxwx','Heavy Blaster','blaster',11,'8d(5) burn, sur','D',1,20,'Rifle','Wb1Dvgl6_3MDXiEIC'],
 ['WhNFLOfS262mdQxu8','eMAFDSS_npXFkFsqm','Blaster Cannon','blaster',10,'5dx10(5) burn, sur','F',10,20,'Beams','Wz-SmwPgclwhI2rj-'],
 ['Wzdr_Vlm2jNEHk_F_','eqILKhwy4BEd_cMNz','Blaster Cannon','blaster',11,'5dx20(5) burn, sur','F',10,20,'Beams','Ws6sBaaDvtH9kH19T'],
 ['W4Cgkpefx8fSmFgmB','eE5I4zXp72jkI4tYR','Semi-Portable Blaster','blaster',11,'6dx2(5) burn, sur','E',1,50,'Beams','WhdBP6Ms5ATOcZa9z'],
 ['W-w21iY_LC7DcmrtD','ei6QKKl_8OJKQHPHX','Heavy Pulsar Pistol','pulsar',12,'8d(3) cr ex','C',2,33,'Pistol'],
 ['WaykgDTdZ7NZfsjqj','ezHrbyATACM4EUryq','Holdout Pulsar','pulsar',12,'4d(3) cr ex','B',1,13,'Pistol'],
 ['WV4sqUZiMo8K7YQOy','ejx5M4pY1vxaeBEv5','Pulsar Pistol','pulsar',12,'6d(3) cr ex','C',1,40,'Pistol'],
 ['WKUu44u13uBHnO79e','eO24bsBBpDHfpnYxX','Heavy Pulsar','pulsar',12,'8dx2(3) cr ex','D',1,20,'Rifle'],
 ['W2D1rKuYLdhcnEQdy','e3RHk41E9ksXhPFcC','Pulsar Carbine','pulsar',12,'10d(3) cr ex','C',2,17,'Rifle'],
 ['W_KVzEIX8c2mMp_JO','eb4YsQStDrzdYw36I','Pulsar Rifle','pulsar',12,'6dx2(3) cr ex','C',2,10,'Rifle'],
 ['WjT3O3uGpTMzQTtAW','eQhg7G0aPZzutirev','Antiparticle Cannon','pulsar',11,'8dx10(3) cr ex','F',1,20,'Beams'],
 ['WbP6X1nJMRhfgpZ3l','ez60QOiaQEsiBMuG5','Antiparticle Cannon','pulsar',12,'8dx20(3) cr ex','F',1,20,'Beams'],
 ['WL6F0evt279747bG7','efv7zSJrKnw0zVLD9','Semi-Portable Pulsar','pulsar',12,'6dx4(3) cr ex','E',1,60,'Beams']
];
export const PPB_PROFILES=Object.freeze(Object.fromEntries(rows.map(([modeId,equipmentId,name,family,tl,damage,cellSize,cells,shots,specialty,legacyStunId])=>
 [modeId,Object.freeze({modeId,equipmentId,name,family,tl,damage,cellSize,cells,shots,specialty,legacyStunId,source:family==='flamer'?'UT127':family==='blaster'?'UT123':'UT124'})])));
export const ppbProfile=id=>Object.hasOwn(PPB_PROFILES,id??'')?PPB_PROFILES[id]:null;
export const ppbWeapon=w=>ppbProfile(w?.standaloneModeId??w?.catalogModeId);
export const ppbConfiguration=w=>({omniBlaster:w?.omniBlaster??false,mode:w?.blasterMode??'normal',environment:w?.blasterEnvironment??'air',hotshot:w?.blasterHotshot??false});
export function validPPBConfiguration(w){
 const p=ppbWeapon(w),c=ppbConfiguration(w);if(!p)return false;
 if(p.family!=='blaster')return !c.omniBlaster&&c.mode==='normal'&&c.environment==='air'&&!c.hotshot;
 return typeof c.omniBlaster==='boolean'&&['normal','stun'].includes(c.mode)&&(c.mode!=='stun'||c.omniBlaster)&&
  ['air','vacuum'].includes(c.environment)&&typeof c.hotshot==='boolean';
}
export const ppbUnits=w=>ppbConfiguration(w).hotshot?2:1;
export function projectPPBCatalog(book,data){
 if(book!=='weapons')return data;
 return {...data,equipment:data.equipment.map(e=>e.source!=='UT'?e:{...e,modes:e.modes.map(m=>{
  const legacy=Object.values(PPB_PROFILES).find(p=>p.legacyStunId===m.weapon_mode_id);
  if(legacy&&legacy.equipmentId===e.equipment_id)return {...m,hidden:true,
    stats:{...m.stats,shots:legacy.shots+(['D','E','F'].includes(legacy.cellSize)?'(5)':'(3)')}};
  const p=ppbProfile(m.weapon_mode_id);if(!p||e.equipment_id!==p.equipmentId)return m;
  const skill={name:p.specialty==='Beams'?'Gunner':'Beam Weapons',specialization:p.specialty,modifier:0};
  return {...m,ut_plasma_particle_source:{...p},stats:{...m.stats,shots:p.shots+(['D','E','F'].includes(p.cellSize)?'(5)':'(3)')},
   governing_skill:{status:'resolved',skill,candidates:[skill],basis:p.source+':table-skill-header'},
   governing_skill_selection:{strategy:'fixed',candidates:[skill],fallback_attribute:null},
   defaults:[{type:'skill',...skill},{type:'skill',name:skill.name,specialization:null,modifier:-4},
    ...(['Pistol','Rifle'].includes(p.specialty)?[{type:'skill',name:'Guns',specialization:p.specialty,modifier:-4}]:[]),{type:'dx',modifier:-4}]};
 })})};
}
export function ppbDamage(raw,id,weapon={}){
 const p=ppbProfile(id);if(!p)return null;
 const c=ppbConfiguration(weapon),base=String(raw.damage??'').replace(/burn,\s*sur$/,'burn sur').replace(/cr ex$/,'cr ex rad sur'),range=String(raw.range??'').replaceAll(',','').match(/^(\d+)\/(\d+)$/);
 const match=/^(\d+)d(?:([+-]\d+))?(?:x(\d+))?(\(5\) burn sur|\(3\) cr ex rad sur| burn)$/.exec(base),dice=match?Number(match[1])*Number(match[3]??1):0;
 const valid=!!match&&match[4]===({blaster:'(5) burn sur',pulsar:'(3) cr ex rad sur',flamer:' burn'})[p.family]&&
  validPPBConfiguration({...weapon,catalogModeId:id})&&!!range&&Number(range[1])>0&&Number(range[2])>=Number(range[1]);
 const stun=p.family==='blaster'&&c.mode==='stun',vacuum=p.family==='blaster'&&c.environment==='vacuum';
 const modifier=-Math.min(10,dice),effectModifier=c.hotshot?Math.floor(modifier*1.3):modifier;
 // UT133's +1/die alternative is used alone, including all dice represented by a multiplier.
 const formula=stun?null:c.hotshot?`${match?.[1]}d${Number(match?.[2]??0)+Number(match?.[1])>=0?'+':''}${Number(match?.[2]??0)+Number(match?.[1])}${match?.[3]?'*'+match[3]:''}${match?.[4]}`:base;
 const changes={damage:stun?`HT${effectModifier} (3) aff`:formula};
 if(vacuum&&range){changes.range=Number(range[1])/5+'/'+Number(range[2])/5;const a=/^(\d+)(\+\d+)?$/.exec(String(raw.acc??''));if(a){changes.acc=Math.ceil(Number(a[1])/2);changes.scopeBonus=Number(a[2]??0);}}
 const instructions=p.family==='flamer'?['Поджог и последствия ожога применяются по обычным правилам. UT127.']:
  p.family==='pulsar'?['Взрыв: дополнительные цели разрешаются штатным GGA вручную; radiation и surge — по UT124.']:
  [stun?'Stun: Ready для смены режима; провал HT — Unconsciousness на минуты по степени провала. UT124.':'Surge против Electrical применяется вручную. UT123.',
   ...(c.hotshot?['Hotshot: Malf14; при отказе последствия по B407 вручную. UT133.']:[])];
 return {status:valid?'resolved':'unresolved',nativeSafe:valid,reason:valid?null:'Проверьте штатный энергетический профиль и дальность.',
  rawFormula:raw.damage,formula,components:stun?[]:[{role:'kinetic',status:valid?'resolved':'unresolved',formula}],transformations:[],effectiveChanges:changes,
  rules:{plasmaParticle:{modeId:id,family:p.family,...(p.family==='blaster'?c:{}),sourceDice:dice,unitsPerShot:p.family==='blaster'?ppbUnits(weapon):1,costMultiplier:c.omniBlaster?2:1,
    ...(p.family==='pulsar'?{explosive:true,radiation:true,surge:true}:p.family==='blaster'?{surge:!stun}:{})},ammunitionSource:p.source,
   ...(stun?{instructionOnly:true,resistanceEffect:{version:1,id,name:p.name,attribute:'HT',modifier:effectModifier,condition:'omni-blaster',outcome:'unconsciousness',source:'UT124'}}:{}),
   ballisticRange:range?{halfDamage:Number(range[1]),maximum:Number(range[2]),minimum:null,source:p.source}:null},
  support:{manual:instructions.map(text=>({id:'BeamCondition',text}))}};
}
export function ppbControlsHTML(w,escape){
 if(ppbWeapon(w)?.family!=='blaster')return '';
 const c=ppbConfiguration(w);
 return '<div class="gam-fire-electrolaser-controls" data-ppb-controls><div class="gam-fire-electrolaser-fields">'+
  (c.omniBlaster?`<label>Режим<select name="blasterMode"><option value="normal"${c.mode==='normal'?' selected':''}>Normal</option><option value="stun"${c.mode==='stun'?' selected':''}>Stun</option></select></label>`:'')+
  `<label>Среда<select name="blasterEnvironment"><option value="air"${c.environment==='air'?' selected':''}>Обычная</option><option value="vacuum"${c.environment==='vacuum'?' selected':''}>Вакуум / крайне разреженная</option></select></label>`+
  `<label><input name="blasterHotshot" type="checkbox"${c.hotshot?' checked':''}>Hotshot: ×2 энергия, Malf14</label></div>`+
  (c.omniBlaster?'<small>Omni-Blaster: смена Normal/Stun требует Ready. Цена оружия ×2. UT124.</small>':'')+'</div>';
}
export const ppbOmniHTML=(id,installed)=>ppbProfile(id)?.family==='blaster'?
 `<label><input type="checkbox" name="omniBlaster"${installed?' checked':''}>Omni-Blaster: цена оружия +100%; Normal / Stun (UT124)</label>`:'';
