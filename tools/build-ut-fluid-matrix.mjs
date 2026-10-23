import {writeFile} from 'node:fs/promises';
import {UT_FLUID_PROFILES} from '../scripts/ut-fluid-source.js';
import {FLUID_FILLERS,fluidCompatibility} from '../scripts/tools/ut-fluid.js';
const rows=Object.values(UT_FLUID_PROFILES).flatMap(p=>Object.values(FLUID_FILLERS).map(f=>({modeId:p.modeId,equipmentId:p.equipmentId,model:p.name,filler:f.id,tl:f.tl,costPerDose:f.cost,phase:f.phase,route:f.route,source:f.source,...fluidCompatibility(p.modeId,f.id)})));
await writeFile(new URL('../data/ut-fluid-vortex-ammunition-matrix.json',import.meta.url),JSON.stringify({date:'2026-10-23',authority:'UT134,160–161; approved HT171/B439 additions; conservative gas-only Vortex with explicit backpack Firefoam exception',rows},null,2)+'\n','utf8');
console.log(JSON.stringify({pairs:rows.length,available:rows.filter(r=>r.allowed).length,excluded:rows.filter(r=>!r.allowed).length}));
