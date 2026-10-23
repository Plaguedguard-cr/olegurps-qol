import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {BEAM_PROFILES} from '../scripts/ut-beam-source.js';
import {laserModificationAdmission} from '../scripts/ut-laser-modifications.js';
const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+u.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();
const rows=Object.values(BEAM_PROFILES).map(p=>{
 const a=laserModificationAdmission(p.modeId),mode=catalogs.getMode(p.modeId),rof=Number(mode.stats.rate_of_fire),ordinary=p.family==='laser';
 return {modeId:p.modeId,name:p.name,tl:catalogs.getEquipmentForMode(p.modeId).tech_level,family:p.family,chemical:p.chemical,oneShot:p.oneShot,baseRoF:rof,
  dazzle:a.dazzle?'available':p.oneShot?'blocked-sealed-single-use':'undetermined-emitter-scope',
  blinding:a.blinding?'available':p.oneShot?'blocked-sealed-single-use':'undetermined-emitter-scope',
  blueGreen:p.chemical?'incompatible-chemical':a.blueGreenReason?'incompatible-user-base-rof-one':a.blueGreen?'available':ordinary&&p.oneShot?'blocked-two-charge-single-use':'undetermined-wavelength-conversion',
  ultraviolet:a.ultraviolet?'available':p.oneShot?'undetermined-single-use-damage-halving':'undetermined-wavelength-conversion',
  pulse:a.pulse?'available':'incompatible-chemical-or-rainbow',beamPulse:a.beamPulse?'available':p.chemical||p.family==='rainbow'?'incompatible-chemical-or-rainbow':'blocked-sealed-single-use',source:p.source};
});
const data={date:'2026-10-20',moduleVersion:'0.2.1',source:'Ultra-Tech 2007 UT113–119; B9',policy:'conservative source review; unresolved pairs are not admitted; user-approved Blue-Green exclusion at source RoF 1',rows};
if(process.argv.includes('--write'))await fs.writeFile(new URL('../data/ut-laser-modifications-matrix.json',import.meta.url),JSON.stringify(data,null,2)+'\n','utf8');
const sign=v=>v==='available'?'+':v.startsWith('blocked-')?'Б':v.startsWith('incompatible-')?'×':'?';
console.log('| Модель | TL | Dazzle | Blinding | Blue-Green | UV | Pulse | Beam/Pulse |');
console.log('|---|---:|:---:|:---:|:---:|:---:|:---:|:---:|');
for(const r of rows)console.log('| '+[r.name,r.tl,...['dazzle','blinding','blueGreen','ultraviolet','pulse','beamPulse'].map(k=>sign(r[k]))].join(' | ')+' |');
