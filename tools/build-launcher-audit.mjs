import fs from 'node:fs/promises';
import { LAUNCHER_ACTIONS } from '../scripts/launcher-actions.js';
const read = path => fs.readFile(path,'utf8').then(JSON.parse);
const [macros, ru, en, manifest] = await Promise.all(['data/macros/olegurps-macros.json','lang/ru.json','lang/en.json','module.json'].map(read));
const settingsOnly = [
  { id:'weapon-settings',labelKey:'OleGURPS.WeaponSkillTL.Title',icon:'fas fa-user-gear',menu:'olegurps-qol.weapon-skills' },
  { id:'effect-visibility',labelKey:'OleGURPS.Launcher.Effects',icon:'fas fa-eye',menu:'olegurps-qol.status-effect-visibility-menu' },
  { id:'developer',labelKey:'OleGURPS.Launcher.Developer',icon:'fas fa-flask',handler:'developer',method:'open',gmOnly:true,menu:'olegurps-qol.developer-mode' }
];
const handlers = {
  ammo:'scripts/tools/ammo.js#openAmmoManager',fireControl:'scripts/tools/fire-control.js#openFireControl',
  melee:'scripts/tools/melee-assistant.js#openMeleeAssistant',fright:'scripts/tools/fright.js#openFrightCheck',
  reaction:'scripts/tools/reaction.js#openReactionRoll',critical:'scripts/tools/critical.js#openCriticalTables',
  falling:'scripts/tools/falling.js#openFallingDamage',explosion:'scripts/tools/explosion-fragmentation.js#openExplosionFragmentation',
  luck:'scripts/tools/luck.js#openLuck',damage:'scripts/tools/damage.js#openDamageRoll',developer:'scripts/tools/developer-mode-app.js#openDeveloperMode',
  'weapon-settings':'scripts/tools/weapon-skill-settings-app.js#WeaponSkillSettingsApp',
  'effect-visibility':'scripts/tools/status-effect-visibility.js#StatusEffectVisibilityMenu'
};
const registry = {
  module:'olegurps-qol',version:manifest.version,shippedMacroCount:10,additionalRegisteredToolCount:3,
  launcherActionCount:LAUNCHER_ACTIONS.length,playerActionCount:LAUNCHER_ACTIONS.length,
  sources:['scripts/main.js','scripts/module-macros.js','scripts/macro-labels.js','data/macros/olegurps-macros.json',
    'packs/macros (live game.packs.getDocuments; 10 records)','scripts/tools/','assets/','module.json','lang/ru.json','lang/en.json'],
  uiLanguage:'Russian regardless of Foundry language, per AGENTS.md',
  actions:[...LAUNCHER_ACTIONS,...settingsOnly].map(action=>{
    const macro = macros.find(m=>m._id===action.macroId);
    return { id:action.id,macroId:action.macroId??null,names:{ru:ru[action.labelKey],en:en[action.labelKey]},
      icon:action.image??action.icon,iconSource:macro?'original shipped and live compendium Macro.img':'existing registered settings menu icon',
      originalCommand:macro?.command??(action.menu?`new (game.settings.menus.get('${action.menu}').type)().render({force:true})`:'game.olegurpsQOL.developer.open()'),
      publicHandler:action.handler?`game.olegurpsQOL.${action.handler}.open()`:`game.settings.menus.get('${action.menu}').type`,
      originalEntrypoint:handlers[action.id],settingsMenu:action.menu??(action.id==='developer'?'olegurps-qol.developer-mode':null),
      selectedToken:action.tokenRequired?'exactly one owned token':action.id==='fireControl'?'optional; existing token/character/manual fallback':'not required',
      access:action.gmOnly?'GM only; original requireDeveloperGM retained':action.tokenRequired?'Actor OWNER (or GM), checked by existing entrypoint':'all players; original tool validation retained',
      behavior:action.id==='luck'?'original immediate two rolls and one ChatMessage; no window':'original ApplicationV2 or DialogV2',
      inLauncher:LAUNCHER_ACTIONS.some(a=>a.id===action.id),settingsOnly:settingsOnly.some(a=>a.id===action.id),section:action.section??null };
  }),
  exclusions:{worldMacros:'Not enumerated for launcher actions; never imported, created, removed, or evaluated by launcher.',
    parameterizedServiceMethods:'Catalog, damageShots, resistance, developer arm/cancel and internal assistant controls remain in their existing tools; they are not separate shipped macros or standalone registered menu tools.'},
  preferences:{storage:'Foundry v14 server-backed Setting documents with scope=user and the current user id',
    visible:{key:'launcherVisible',type:'Boolean',default:true,config:false},
    position:{key:'launcherPosition',type:'String',default:'bucket',choices:['bucket','hotbar-left','hotbar-right','controls','custom'],config:false},
    coordinates:{key:'launcherCoordinates',type:'Object',default:null,config:false},
    size:{key:'launcherSize',type:'Number',default:40,min:28,max:72,step:4,scope:'user',config:false},
    settingsMenu:'olegurps-qol.launcher-settings',restricted:false}
};
await fs.mkdir('docs/audit',{recursive:true});
await fs.writeFile('docs/audit/olegurps-launcher-actions.json',JSON.stringify(registry,null,2)+'\n');
console.log(JSON.stringify({actions:registry.launcherActionCount,macros:registry.shippedMacroCount,player:registry.playerActionCount}));
