// LT quality/material policy, including the source-backed M2.1 Haladie construction.
import {ltBladeSource} from './lt-blade-source.js';
import {ltImprovisedSource} from './lt-improvised-source.js';
import {HT_MATERIALS,htMaterialChoices,htMaterialEffect,htQualityGrades,htSuperfineAllowed} from './ht-melee-quality.js';
// LT14, LT59, LT65-71 and B274-275; existing per-yard GCS rows checked against LT67/LT70-71.
export const LT_MATERIALS={
 published:{label:'Исходный материал конструкции',tl:null,source:'Индивидуальная строка LT',costScale:1},
 steel:{label:'Сталь',tl:3,metal:true,source:'B275',costScale:1},
 plastic:{label:'Пластик / композит (TL7)',tl:7,source:'B275',costScale:2,massMultiplier:0.5},
 wood:{label:'Дерево – закалённое огнём',tl:0,source:'LT71',costScale:0.1,cutToCr:true,impBonus:-1,impDivisor:0.5},
 greenWood:{label:'Дерево – незакалённое',tl:0,source:'LT71',costScale:0.1,cutToCr:true,impBonus:-2,impDivisor:0.5},
 horn:{label:'Рог / зуб',tl:0,source:'LT71',costScale:0.2,cutToCr:true,impDivisor:0.5},
 bone:{label:'Кость',tl:0,source:'LT71',costScale:0.05,cutToCr:true,allBonus:-1,impDivisor:0.5},
 stone:{label:'Камень',tl:0,source:'B275',costScale:1,noQualityDamage:true,bladeDivisor:0.5},
 obsidian:{label:'Обсидиан',tl:1,source:'B275',costScale:1,noQualityDamage:true,bladeDivisor:0.5,bladeBonus:1,fixedQuality:'Good'},
 bronze:{label:'Бронза',tl:1,metal:true,source:'B275',costScale:1,noQualityDamage:true},
 iron:{label:'Железо',tl:2,metal:true,source:'B275',costScale:1,noQualityDamage:true},
 silver:{label:'Цельное серебро',tl:1,metal:true,source:'LT59; B275',costScale:1,costFactor:19,fixedQuality:'Good'},
 stainless:HT_MATERIALS.stainless,ceramic:HT_MATERIALS.ceramic,titanium:HT_MATERIALS.titanium
};
export const LT_BALANCE_OPTIONS=[{level:'Normal',label:'Обычная',skillBonus:0,costFactor:0},{level:'Balanced',skillBonus:1,costFactor:4},{level:'Poorly Balanced',skillBonus:-1,costFactor:-0.6}];
// Manufacture TL belongs to an individual weapon, never to its actor or catalog introduction.
export function meleeWeaponTL(selection={}) {
 const raw=selection.weaponTL;
 if(raw==null||String(raw).trim()==='')return null;
 const value=Number(raw);
 if(!/^\d+$/.test(String(raw).trim())||!Number.isSafeInteger(value))throw Error('ТУ оружия должен быть целым неотрицательным числом.');
 return value;
}
export function ltTechQualityGrades(profile,selection={}) {
 if(profile.book==='HT'&&profile.ltConstruction?.domain==='HT')return htQualityGrades(profile,selection);
 const tl=meleeWeaponTL(selection),grades=profile.qualityOptions??[];
 if(!profile.ltConstruction||tl===null||tl<7)return grades;
 // B274 and MA216. LT59's wider Very Fine classes are not extrapolated to TL7+.
 const sword=profile.ltConstruction.qualityClass==='sword'&&
  (!profile.ltConstruction.shortBlade||profile.ltConstruction.modelId==='lt:main-gauche');
 return grades.filter(q=>q.level!=='Very Fine'||sword).map(q=>({...q,
  costAdjustment:{Cheap:-0.8,Good:-0.6,Fine:0,'Very Fine':3}[q.level]}));
}
export function ltSuperfineAllowed(profile,material) {
 if(profile.book==='HT'&&profile.ltConstruction?.domain==='HT')return htSuperfineAllowed(profile,material);
 return profile.ltConstruction?.construction==='blade'&&
  profile.ltConstruction.damageTypes.some(t=>['cut','imp'].includes(t))&&
  ['steel','published'].includes(material)&&
  !/\([^)]+\)/.test(profile.stats.damage);
}
export function ltQualityGrades(construction){
 const c=construction.qualityClass;
 return [{level:'Good',costFactor:0,damageBonus:0,breakage:0,massMultiplier:1},
  {level:'Cheap',costFactor:-0.6,damageBonus:0,breakage:2,massMultiplier:1},
  {level:'Fine',costFactor:c==='sword'?3:c==='cutting'?9:2,damageBonus:1,damageTypes:['cut','imp'],breakage:-1,massMultiplier:1},
  {level:'Very Fine',costFactor:c==='sword'?19:c==='crushing'?14:49,damageBonus:2,damageTypes:['cut','imp'],breakage:-2,massMultiplier:1}];
}
export function ltMaterialChoices(profile){
 if(profile.book==='HT'&&profile.ltConstruction?.domain==='HT')return htMaterialChoices(profile);
 const c=profile.ltConstruction;
 if(!c)return [];
 if(profile.shield)return ['published'];
 if(c.construction==='obsidian-edge')return ['obsidian'];
 if(c.construction==='wooden-stake')return ['wood','greenWood'];
 if(c.construction==='wood')return ['wood','bone','plastic'];
 if(c.construction==='metal-head')return c.metal?['published','silver','plastic']:['published','plastic'];
 if(c.construction!=='blade')return c.metal?['published','silver']:['published'];
 const intrinsic=/\(([^)]+)\)/.exec(profile.stats.damage);
 if(intrinsic)return ['steel','bronze','iron','silver','plastic']; // Materials adding another AD remain unconfirmed.
 return c.qualityClass==='sword'&&!c.shortBlade?['steel','wood','greenWood','horn','bone','bronze','iron','silver','plastic']:
  ['steel','wood','greenWood','horn','bone','stone','obsidian','bronze','iron','silver','plastic'];
}
export function ltMaterialEffect(profile,id){
 if(profile.book==='HT'&&profile.ltConstruction?.domain==='HT')return htMaterialEffect(profile,id);
 const c=profile.ltConstruction,base=c.construction;
 if(!ltMaterialChoices(profile).includes(id))throw Error('Материал не подтверждён для этой конструкции.');
 const sourceType=/\s+(\S+)\s*$/.exec(profile.stats.damage)?.[1];
 const m=LT_MATERIALS[id],blade=['cut','imp'].includes(sourceType);
 let damage=(m.allBonus??0)+(sourceType==='imp'?(m.impBonus??0):0)+(blade?(m.bladeBonus??0):0);
 let scale=m.costScale,type=m.cutToCr&&sourceType==='cut'?'cr':sourceType;
 let divisor=sourceType==='imp'?m.impDivisor??m.bladeDivisor:sourceType==='cut'?m.bladeDivisor:null;
 const intrinsic=/\(([\d.]+)\)/.exec(profile.stats.damage);
 if(divisor==null&&intrinsic)divisor=Number(intrinsic[1]);
 if(base==='obsidian-edge'){damage=0;scale=1;divisor=sourceType==='cut'?0.5:null;}
 if(base==='wood'&&id==='wood'){damage=0;scale=1;}
 if(base==='wooden-stake'){damage=id==='greenWood'?-1:0;scale=1;}
 return {...m,metal:m.metal||id==='published'&&c.metal===true,
  ...(id==='plastic'&&c.damageTypes?.some(t=>['cut','imp'].includes(t))?{allowedQualities:['Cheap','Good']}:{}),
  id,type,damage,scale,divisor:divisor??null};
}
export function ltMaterialHints(profile,id,quality){
 const m=LT_MATERIALS[id],out=[];
 if(!m)return out;
 if(id==='bone')out.push('Кость: −1 к урону. На предусмотренном LT71 броске поломки 1–2 ломает всё оружие; проверка и последствия вручную.');
 if(id==='horn')out.push('Рог/зуб: режущее лезвие наносит cr; колющий наконечник имеет AD(0.5). LT71.');
 if(id==='wood'||id==='greenWood')out.push('Дерево: кромка наносит cr; колющий наконечник имеет AD(0.5). Закалка огнём и состояние кромки выбираются вручную. LT71.');
 if(id==='obsidian')out.push(profile.ltConstruction.construction==='obsidian-edge'?
  'Обсидиановая кромка: парирование оружия или удар по DR2+ уменьшает cutting Damage на 1 до ремонта. После успешной атаки/парирования против оружия 1–2 на 1d ломает кромку. Смена стороны и последствия вручную. LT59.':
  'Обсидиан: +1 cut/imp и AD(0.5) уже учтены. Бонус теряется после парирования оружия или удара по DR2+; +2 к поломке. Состояние изменяет игрок вручную. B275.');
 if(['stone','bronze','iron'].includes(id))out.push('Качество не повышает Damage этого материала. При парировании тяжёлого оружия из более совершенного материала считать кромку Cheap; поломку определять вручную. B275.');
 if(['stone','obsidian','bronze','iron'].includes(id))out.push('Цена показана от табличной базы. Обычная скидка за устаревший материал зависит от эпохи и сделки; B275 не задаёт обязательную новую базовую цену.');
 if(id==='silver')out.push('Цельное серебро: +2 к поломке, не сочетается с Cheap/Fine/Very Fine. Уязвимость к серебру применяет игрок вручную. LT59; B275.');
 if(id==='plastic')out.push('Пластик/композит: масса ×0.5, исходная цена ×2. Клинки не выше Good; для дробящего оружия доступны обычные качества. Низкую массу и поломку при парировании тяжёлого оружия учитывать вручную. B275.');
 if(quality?.breakage)out.push('Качество: поправка к вероятности поломки '+(quality.breakage>0?'+':'')+quality.breakage+'; износ и поломка вручную. LT59.');
 return out;
}
export function ltMeleeQualityProfile(modeId,catalogs,legacy=null){
 const improvised=ltImprovisedSource(modeId);
 if(improvised?.improvised||improvised?.fixedPublishedQuality)return {...improvised,ltConstruction:{construction:'fixed',qualityClass:improvised.qualityClass,damageTypes:[improvised.stats.damage.split(' ').at(-1)],modelId:improvised.modelId,improvised:improvised.improvised===true}};
 if(legacy?.shield)return {...legacy,ltConstruction:{construction:'shield',qualityClass:'cutting',damageTypes:['cr','cut','imp'],modelId:legacy.modelId},qualityOptions:ltQualityGrades({qualityClass:'cutting'})};
 const equipment=catalogs?.getEquipmentForMode?.(modeId),construction=LT_MELEE_CONSTRUCTIONS[equipment?.equipment_id]??(improvised?{...improvised,damageTypes:[improvised.stats.damage.split(' ').at(-1)]}:null);
 if(equipment?.source!=='LT'||!construction)return legacy;
 const mode=catalogs.getMode(modeId);if(mode?.combat_type!=='melee'||mode.role!=='attack')return legacy;
 const primary=mode.governing_skill?.candidates?.map(s=>s.name).filter(Boolean)??[];
 const profile=legacy??ltBladeSource(modeId)??{modelId:construction.modelId,equipmentId:equipment.equipment_id,book:'LT',name:construction.name,
  modeId,usage:mode.usage,stats:{damage:mode.raw_calc?.damage,reach:mode.stats.reach,parry:mode.stats.parry,st:mode.stats.strength},
  primarySkills:primary,attackModifier:0,sourceOptions:primary.map(skill=>({unmodifiedSkills:[skill],defaults:(mode.defaults??[])
   .filter(d=>!(d.type==='skill'&&d.name===skill&&d.modifier===0)).map(d=>({from:d.name??d.type.toUpperCase(),modifier:d.modifier,type:d.type==='skill'?'skill':'attribute'}))}))};
 return {...profile,cost:construction.cost,mass:construction.mass,sourcePages:[...new Set([...construction.sourcePages,...(profile.sourcePages??[])])],ltConstruction:construction,
  qualityOptions:ltQualityGrades(construction),baselineQuality:'Good',
  baselineMaterial:construction.construction==='obsidian-edge'?'obsidian':['wood','wooden-stake'].includes(construction.construction)?'wood':construction.construction==='blade'?'steel':'published',
  balanceOptions:LT_BALANCE_OPTIONS.filter(b=>!(['wood','wooden-stake'].includes(construction.construction)||construction.improvised)||b.level!=='Balanced')};
}
export const LT_MELEE_CONSTRUCTIONS={
  eaRFBpIq0BdQCOLUj:{modelId:'lt:mining-hammer',name:'Mining Hammer',qualityClass:'crushing',construction:'metal-head',cost:90,mass:6,metal:true,sourcePages:['LT30'],damageTypes:['cr']},
  eY_6OfCesGUVNO6uD:{modelId:'lt:mining-pick-metal',name:'Mining Pick (Metal)',qualityClass:'impaling',construction:'blade',cost:70,mass:3,metal:true,sourcePages:['LT30','B271'],damageTypes:['imp']},
  eCYxe2ABpDP6xesTH:{modelId:'lt:mining-pick-antler-bone-or-wood',name:'Mining Pick (Antler, Bone or Wood)',qualityClass:'impaling',construction:'fixed',cost:35,mass:2,metal:false,sourcePages:['LT30','B271'],damageTypes:['imp']},
  eLTM25MiningHammerLarge:{modelId:'lt:mining-hammer-large',name:'Mining Hammer, Large',qualityClass:'crushing',construction:'metal-head',cost:180,mass:11,metal:true,sourcePages:['LT30'],damageTypes:['cr']},
  eLTM24BeltSword:{modelId:'lt:belt-sword',name:'Belt Sword',qualityClass:'sword',construction:'fixed',metal:true,cost:300,mass:2,sourcePages:['LT64','LT70'],damageTypes:['cr','cut']},
  eLTP3Pilum:{modelId:'lt:pilum',name:'Pilum',qualityClass:'impaling',construction:'blade',cost:40,mass:4,sourcePages:['LT73','LT69'],damageTypes:['imp']},
  eLTP3Angon:{modelId:'lt:angon',name:'Angon',qualityClass:'impaling',construction:'blade',cost:40,mass:4,sourcePages:['LT73','LT69'],damageTypes:['imp']},
  'eLMadXvd-l99hQHlD':{modelId:'lt:harpoon',name:'Harpoon',qualityClass:'impaling',construction:'blade',cost:60,mass:6,sourcePages:['LT72','LT69','LT77'],damageTypes:['imp']},
  eLTM23CrescentSpear:{modelId:'lt:crescent-headed-spear',name:'Spear (crescent head)',qualityClass:'cutting',construction:'blade',cost:40,mass:4,sourcePages:['LT62','LT69'],damageTypes:['cut']},
  eLTM23Ankus:{modelId:'lt:ankus',name:'Ankus',qualityClass:'impaling',construction:'metal-head',metal:false,
    cost:20,mass:1,sourcePages:['LT54','LT69'],damageTypes:['cr','imp']},
  eLTM23Tuja:{modelId:'lt:tuja',name:'Tuja',qualityClass:'impaling',construction:'metal-head',metal:true,
    cost:60,mass:1.5,sourcePages:['LT61','LT66','LT67'],damageTypes:['cr','imp']},
  eLTM23Pike4Y:{modelId:'lt:pike',name:'Pike (4 yards)',qualityClass:'impaling',construction:'blade',
    cost:80,mass:10,sourcePages:['LT60','LT69'],damageTypes:['imp']},
  eLTM23Pike6Y:{modelId:'lt:pike',name:'Pike (6 yards)',qualityClass:'impaling',construction:'blade',
    cost:80,mass:15,sourcePages:['LT60','LT69'],damageTypes:['imp']},
  eLTM21Haladie:{modelId:'lt:haladie',name:'Haladie',qualityClass:'sword',construction:'blade',cost:80,mass:1.5,
    sourcePages:['LT56','LT67'],shortBlade:true,damageTypes:['cut','imp']},
  "eVXaW9Nwr6YM5IlMJ": {
    "modelId": "lt:axe",
    "name": "Axe",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 50.0,
    "mass": 4.0,
    "sourcePages": [
      "LT54",
      "LT65",
      "LT70"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "e7F8fHESvA-JfH4xM": {
    "modelId": "lt:backsword",
    "name": "Backsword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 550.0,
    "mass": 3.0,
    "sourcePages": [
      "LT54",
      "LT65",
      "LT66"
    ],
    "damageTypes": [
      "cr",
      "cut",
      "imp"
    ]
  },
  "e63hCyhuUmjcmEsXd": {
    "modelId": "lt:balisong",
    "name": "Balisong",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 50.0,
    "mass": 0.5,
    "sourcePages": [
      "LT54",
      "LT67"
    ],
    "shortBlade": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "esigZu6fQ03Yb2mwP": {
    "modelId": "lt:bastard-sword",
    "name": "Bastard Sword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 650.0,
    "mass": 5.0,
    "sourcePages": [
      "LT54",
      "LT65",
      "LT70"
    ],
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "e9kI7mSnBTZp5aJTA": {
    "modelId": "lt:baton",
    "name": "Baton",
    "qualityClass": "crushing",
    "construction": "wood",
    "cost": 20.0,
    "mass": 1.0,
    "sourcePages": [
      "LT54",
      "LT69"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "eHHMfw0Ejfy2dP2o6": {
    "modelId": "lt:bill",
    "name": "Bill",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 125.0,
    "mass": 8.0,
    "sourcePages": [
      "LT55",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "e807FJw5TXekIwGGG": {
    "modelId": "lt:blackjack",
    "name": "Blackjack",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 20.0,
    "mass": 1.0,
    "sourcePages": [
      "LT55",
      "LT65"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "eWkrZwJMCIqi1cwl4": {
    "modelId": "lt:bladed-hand",
    "name": "Bladed Hand",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 100.0,
    "mass": 1.0,
    "sourcePages": [
      "LT55",
      "LT65"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "e1oB2xDuUqx4WqvmN": {
    "modelId": "lt:bokken",
    "name": "Bokken",
    "qualityClass": "sword",
    "construction": "wood",
    "cost": 40.0,
    "mass": 3.0,
    "sourcePages": [
      "LT55",
      "LT66",
      "LT70"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "ej-C1vqAdSnwD4nQg": {
    "modelId": "lt:bola-perdida",
    "name": "Bola Perdida",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 10.0,
    "mass": 1.0,
    "sourcePages": [
      "LT55",
      "LT72",
      "LT66"
    ],
    "improvised": true,
    "damageTypes": [
      "cr"
    ]
  },
  "eN-OkDp86ufSWaXn6": {
    "modelId": "lt:bolas",
    "name": "Bolas",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 20.0,
    "mass": 2.0,
    "sourcePages": [
      "LT55",
      "LT72",
      "LT66"
    ],
    "improvised": true,
    "damageTypes": [
      "cr"
    ]
  },
  "eN_f8tX490hHeJC52": {
    "modelId": "lt:brass-knuckles",
    "name": "Brass Knuckles",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 10.0,
    "mass": 0.25,
    "sourcePages": [
      "LT55",
      "LT65"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "eDbHVjWyENcCBtzP_": {
    "modelId": "lt:broadsword",
    "name": "Broadsword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 500.0,
    "mass": 3.0,
    "sourcePages": [
      "LT55",
      "LT65"
    ],
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "espQ32t5diJ_nTjVT": {
    "modelId": "lt:cavalry-saber",
    "name": "Cavalry Saber",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 500.0,
    "mass": 3.0,
    "sourcePages": [
      "LT56",
      "LT66"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "e15Zg7FmhzZBH34BF": {
    "modelId": "lt:cestus",
    "name": "Cestus",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 50.0,
    "mass": 1.0,
    "sourcePages": [
      "LT55",
      "LT65"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "eP_JkxQE24-HkwRsQ": {
    "modelId": "lt:chain-whip",
    "name": "Chain Whip, 1 yard",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 50,
    "mass": 3,
    "sourcePages": [
      "LT67",
      "LT71"
    ],
    "lengthYards": 1,
    "pricePerYard": 50,
    "massPerYard": 3,
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "ez8pUbkBIkqsUw7gm": {
    "modelId": "lt:chain-whip",
    "name": "Chain Whip, 2 yards",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 100,
    "mass": 6,
    "sourcePages": [
      "LT67",
      "LT71"
    ],
    "lengthYards": 2,
    "pricePerYard": 50,
    "massPerYard": 3,
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "eJpgscxiDhxFFAMt8": {
    "modelId": "lt:chain-whip",
    "name": "Chain Whip, 3 yards",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 150,
    "mass": 9,
    "sourcePages": [
      "LT67",
      "LT71"
    ],
    "lengthYards": 3,
    "pricePerYard": 50,
    "massPerYard": 3,
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "esfl9j5vL04oCgBTO": {
    "modelId": "lt:chain-whip",
    "name": "Chain Whip, 4 yards",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 200,
    "mass": 12,
    "sourcePages": [
      "LT67",
      "LT71"
    ],
    "lengthYards": 4,
    "pricePerYard": 50,
    "massPerYard": 3,
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "ewsHxS6FKDlJFd_kf": {
    "modelId": "lt:combat-fan",
    "name": "Combat Fan",
    "qualityClass": "cutting",
    "construction": "fixed",
    "cost": 40.0,
    "mass": 1.0,
    "sourcePages": [
      "LT56",
      "LT65"
    ],
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "ewqtnwgy4C8-NVr65": {
    "modelId": "lt:cutlass",
    "name": "Cutlass",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 500.0,
    "mass": 2.0,
    "sourcePages": [
      "LT56",
      "LT69",
      "LT65"
    ],
    "damageTypes": [
      "cr",
      "cut",
      "imp"
    ]
  },
  "eEkk6WpqrCj5KoCNQ": {
    "modelId": "lt:dagger",
    "name": "Dagger",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 20.0,
    "mass": 0.25,
    "sourcePages": [
      "LT56",
      "LT67"
    ],
    "shortBlade": true,
    "damageTypes": [
      "imp"
    ]
  },
  "ejv_7yhIWr-w7FdOC": {
    "modelId": "lt:dao",
    "name": "Dao",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 700.0,
    "mass": 5.0,
    "sourcePages": [
      "LT56",
      "LT66"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eosDvGiZVWu1XjhJ4": {
    "modelId": "lt:deer-antlers",
    "name": "Deer Antlers",
    "qualityClass": "sword",
    "construction": "fixed",
    "cost": 75.0,
    "mass": 1.5,
    "sourcePages": [
      "LT56",
      "LT67"
    ],
    "metal": true,
    "damageTypes": [
      "cut"
    ]
  },
  "ekfM7nhB56uunM59T": {
    "modelId": "lt:dress-smallsword",
    "name": "Dress Smallsword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 300.0,
    "mass": 1.0,
    "sourcePages": [
      "LT62",
      "LT69"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "eVhGQufj6f7oBBPEf": {
    "modelId": "lt:dueling-bill",
    "name": "Dueling Bill",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 100.0,
    "mass": 6.0,
    "sourcePages": [
      "LT55",
      "LT71",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eVb05bP5OVf7r8oFa": {
    "modelId": "lt:dueling-glaive",
    "name": "Dueling Glaive",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 80.0,
    "mass": 6.0,
    "sourcePages": [
      "LT56",
      "LT71",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "e9rE4EWHfOH3teNlk": {
    "modelId": "lt:dueling-halberd",
    "name": "Dueling Halberd",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 120.0,
    "mass": 10.0,
    "sourcePages": [
      "LT56",
      "LT71",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "em06hmNq249FOlUp7": {
    "modelId": "lt:dusack",
    "name": "Dusack",
    "qualityClass": "sword",
    "construction": "wood",
    "cost": 30.0,
    "mass": 1.5,
    "sourcePages": [
      "LT56",
      "LT69"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "e4g-va5KWviMGyE6F": {
    "modelId": "lt:edged-rapier",
    "name": "Edged Rapier",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 1000.0,
    "mass": 3.0,
    "sourcePages": [
      "LT61",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eVsq-INlRIDzirMJa": {
    "modelId": "lt:estoc",
    "name": "Estoc",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 500.0,
    "mass": 3.0,
    "sourcePages": [
      "LT56",
      "LT66"
    ],
    "damageTypes": [
      "cr",
      "imp"
    ]
  },
  "eRv_rs5osGxWCFftz": {
    "modelId": "lt:falchion",
    "name": "Falchion",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 400.0,
    "mass": 3.0,
    "sourcePages": [
      "LT56",
      "LT69"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eqiNxi1cldF3h_yN9": {
    "modelId": "lt:flail",
    "name": "Flail",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 100.0,
    "mass": 8.0,
    "sourcePages": [
      "LT56",
      "LT70"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "e27aWpcH_kJVEabBj": {
    "modelId": "lt:gada",
    "name": "Gada",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 100.0,
    "mass": 15.0,
    "sourcePages": [
      "LT56",
      "LT70"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "eQ9TsDoaAcFhqFOsz": {
    "modelId": "lt:glaive",
    "name": "Glaive",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 100.0,
    "mass": 8.0,
    "sourcePages": [
      "LT56",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "e994PyUFWJuCfqon9": {
    "modelId": "lt:great-axe",
    "name": "Great Axe",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 100.0,
    "mass": 8.0,
    "sourcePages": [
      "LT56",
      "LT70"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "eaRul78h0fhq10cXt": {
    "modelId": "lt:greatsword",
    "name": "Greatsword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 800.0,
    "mass": 7.0,
    "sourcePages": [
      "LT56",
      "LT70"
    ],
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "e82t4LhU-kGAvefT5": {
    "modelId": "lt:halberd",
    "name": "Halberd",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 150.0,
    "mass": 12.0,
    "sourcePages": [
      "LT56",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eVGqW67Wj3KmybMVN": {
    "modelId": "lt:hatchet",
    "name": "Hatchet",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 40.0,
    "mass": 2.0,
    "sourcePages": [
      "LT56",
      "LT65"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "e5HOg0BpWoTUeuLRT": {
    "modelId": "lt:heavy-horse-cutter",
    "name": "Heavy Horse-Cutter",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 150.0,
    "mass": 12.0,
    "sourcePages": [
      "LT56",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eZvux6XVosjUF7JXf": {
    "modelId": "lt:heavy-spear",
    "name": "Heavy Spear",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 90.0,
    "mass": 6.0,
    "sourcePages": [
      "LT62",
      "LT69"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "ed-LboHBSRdy0mMI2": {
    "modelId": "lt:hook-sword",
    "name": "Hook Sword",
    "qualityClass": "sword",
    "construction": "fixed",
    "cost": 200.0,
    "mass": 3.0,
    "sourcePages": [
      "LT56",
      "LT65",
      "LT66"
    ],
    "metal": true,
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "eyFzn-BFYhzHXAAXt": {
    "modelId": "lt:hungamunga",
    "name": "Hungamunga",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 40.0,
    "mass": 1.0,
    "sourcePages": [
      "LT72",
      "LT78",
      "B272"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "ekHIDinjTY_Oqkw2K": {
    "modelId": "lt:javelin",
    "name": "Javelin",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 30.0,
    "mass": 2.0,
    "sourcePages": [
      "LT57",
      "LT69"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "ezjgs0iC8JAk19X0Z": {
    "modelId": "lt:javelin-w-thong",
    "name": "Javelin w. Thong",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 35.0,
    "mass": 2.0,
    "sourcePages": [
      "LT57",
      "LT77",
      "LT69"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "evVFy7uca9O8D1KNp": {
    "modelId": "lt:jian",
    "name": "Jian",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 700.0,
    "mass": 3.0,
    "sourcePages": [
      "LT57",
      "LT66"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "etp2byFFRfqZTt7r-": {
    "modelId": "lt:jo",
    "name": "Jo",
    "qualityClass": "crushing",
    "construction": "wood",
    "cost": 10.0,
    "mass": 2.0,
    "sourcePages": [
      "LT57",
      "LT65",
      "LT69",
      "LT70"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "e-oPpoFdQIShtYaTT": {
    "modelId": "lt:jutte",
    "name": "Jutte",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 40.0,
    "mass": 1.0,
    "sourcePages": [
      "LT57",
      "LT66",
      "LT67"
    ],
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "eSH8jtUi7O-Eztex1": {
    "modelId": "lt:katana",
    "name": "Katana",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 650.0,
    "mass": 5.0,
    "sourcePages": [
      "LT57",
      "LT66",
      "LT70"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eR5Uz8oeA0ZD2Y6_O": {
    "modelId": "lt:katar",
    "name": "Katar",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 50.0,
    "mass": 1.0,
    "sourcePages": [
      "LT57",
      "LT67"
    ],
    "shortBlade": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eWVF0CbipL6RQ2sB0": {
    "modelId": "lt:khopesh",
    "name": "Khopesh",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 450.0,
    "mass": 3.0,
    "sourcePages": [
      "LT57",
      "LT65"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "eIaazNsUpfy_GnUhj": {
    "modelId": "lt:knife-wheel",
    "name": "Knife-Wheel",
    "qualityClass": "sword",
    "construction": "fixed",
    "cost": 75.0,
    "mass": 1.5,
    "sourcePages": [
      "LT58",
      "LT67"
    ],
    "metal": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "ehU1DG5wUKyG5_0ih": {
    "modelId": "lt:knobbed-club",
    "name": "Knobbed Club",
    "qualityClass": "crushing",
    "construction": "wood",
    "cost": 20.0,
    "mass": 2.0,
    "sourcePages": [
      "LT58",
      "LT65"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "e0tmeOQw5QoeJJL-Y": {
    "modelId": "lt:kukri",
    "name": "Kukri",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 50.0,
    "mass": 1.5,
    "sourcePages": [
      "LT58",
      "LT67"
    ],
    "shortBlade": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "etg5QuRzyvC5hZ-8V": {
    "modelId": "lt:kusari",
    "name": "Kusari",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 70.0,
    "mass": 5.0,
    "sourcePages": [
      "LT58",
      "LT67"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "e5TV58hSxObscMb41": {
    "modelId": "lt:kusarigama",
    "name": "Kusarigama",
    "qualityClass": "cutting",
    "construction": "fixed",
    "cost": 80.0,
    "mass": 4.5,
    "sourcePages": [
      "LT58",
      "LT67"
    ],
    "metal": true,
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "e78rtoPS0riG8Nqfg": {
    "modelId": "lt:kusarijutte",
    "name": "Kusarijutte",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 80.0,
    "mass": 3.5,
    "sourcePages": [
      "LT58",
      "LT67"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "ei4EXAkpdfA2GCpdC": {
    "modelId": "lt:lajatang",
    "name": "Lajatang",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 100.0,
    "mass": 7.0,
    "sourcePages": [
      "LT58",
      "LT68"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "et5VY28qv31Ge64za": {
    "modelId": "lt:lance",
    "name": "Lance",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 60.0,
    "mass": 6.0,
    "sourcePages": [
      "LT58",
      "LT67"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "eK17o5feHeURAy5d9": {
    "modelId": "lt:large-falchion",
    "name": "Large Falchion",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 625.0,
    "mass": 4.5,
    "sourcePages": [
      "LT56",
      "LT65"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "exm4FaVMtZYJ0xJMN": {
    "modelId": "lt:large-hungamunga",
    "name": "Large Hungamunga",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 60.0,
    "mass": 4.0,
    "sourcePages": [
      "LT72",
      "LT78"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "eBvYYD-dieC5iol_L": {
    "modelId": "lt:large-katar",
    "name": "Large Katar",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 400.0,
    "mass": 2.0,
    "sourcePages": [
      "LT57",
      "LT69"
    ],
    "shortBlade": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "e4Cqh4R-bWl7CS7dQ": {
    "modelId": "lt:large-knife",
    "name": "Large Knife",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 40.0,
    "mass": 1.0,
    "sourcePages": [
      "LT58",
      "LT67"
    ],
    "shortBlade": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eTiogcRMS0hlc0Ypk": {
    "modelId": "lt:large-quadrens",
    "name": "Large Quadrens",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 400.0,
    "mass": 3.0,
    "sourcePages": [
      "LT60",
      "LT69"
    ],
    "damageTypes": [
      "imp"
    ],
    "shortBlade": true
  },
  "eE8_Dy15zRaLiEs45": {
    "modelId": "lt:large-throwing-knife",
    "name": "Large Throwing Knife",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 40.0,
    "mass": 1.0,
    "sourcePages": [
      "LT75",
      "LT78",
      "B272"
    ],
    "shortBlade": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "ezTmezdXy1DpJpNW1": {
    "modelId": "lt:late-katana",
    "name": "Late Katana",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 550.0,
    "mass": 3.0,
    "sourcePages": [
      "LT57",
      "LT66",
      "LT70"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eZe9VUPLkzHhS8G_J": {
    "modelId": "lt:light-club",
    "name": "Light Club",
    "qualityClass": "crushing",
    "construction": "wood",
    "cost": 5.0,
    "mass": 3.0,
    "sourcePages": [
      "LT58",
      "LT65"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "ewpF8TAvUV_1xpjXO": {
    "modelId": "lt:light-edged-rapier",
    "name": "Light Edged Rapier",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 700.0,
    "mass": 2.25,
    "sourcePages": [
      "LT61",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "ej7cFR0hzK5VZ3O4t": {
    "modelId": "lt:light-horse-cutter",
    "name": "Light Horse-Cutter",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 120.0,
    "mass": 8.0,
    "sourcePages": [
      "LT56",
      "LT71",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "e9lnfC0mIL30gEZH3": {
    "modelId": "lt:light-rapier",
    "name": "Light Rapier",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 400.0,
    "mass": 2.0,
    "sourcePages": [
      "LT61",
      "LT68"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "eNrmOi5QDBHZUsunh": {
    "modelId": "lt:light-whip",
    "name": "Light Whip, 1 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 20,
    "mass": 0.5,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 1,
    "pricePerYard": 20,
    "massPerYard": 0.5,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "e08Cgf-0P-8-cC4UE": {
    "modelId": "lt:light-whip",
    "name": "Light Whip, 2 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 40,
    "mass": 1.0,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 2,
    "pricePerYard": 20,
    "massPerYard": 0.5,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "e0AAc1qHwmjZC-9eH": {
    "modelId": "lt:light-whip",
    "name": "Light Whip, 3 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 60,
    "mass": 1.5,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 3,
    "pricePerYard": 20,
    "massPerYard": 0.5,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "ezFQOgWgjG18vT69i": {
    "modelId": "lt:light-whip",
    "name": "Light Whip, 4 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 80,
    "mass": 2.0,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 4,
    "pricePerYard": 20,
    "massPerYard": 0.5,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "eM8Hqr9kV7haxWSE4": {
    "modelId": "lt:light-whip",
    "name": "Light Whip, 5 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 100,
    "mass": 2.5,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 5,
    "pricePerYard": 20,
    "massPerYard": 0.5,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "eXX1QyRGIWQQVJgux": {
    "modelId": "lt:light-whip",
    "name": "Light Whip, 6 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 120,
    "mass": 3.0,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 6,
    "pricePerYard": 20,
    "massPerYard": 0.5,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "ewVgkwPVONpWiUqAM": {
    "modelId": "lt:light-whip",
    "name": "Light Whip, 7 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 140,
    "mass": 3.5,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 7,
    "pricePerYard": 20,
    "massPerYard": 0.5,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "ehGvmGqOMR06bLeCk": {
    "modelId": "lt:long-axe",
    "name": "Long Axe",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 75.0,
    "mass": 6.0,
    "sourcePages": [
      "LT58",
      "LT70"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "e2nWZSbk5ADtbp5FG": {
    "modelId": "lt:long-knife",
    "name": "Long Knife",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 120.0,
    "mass": 1.5,
    "sourcePages": [
      "LT56",
      "LT67",
      "LT69"
    ],
    "shortBlade": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "efr98pPwDlkxJX1fv": {
    "modelId": "lt:long-spear",
    "name": "Long Spear",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 60.0,
    "mass": 5.0,
    "sourcePages": [
      "LT62",
      "LT69"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "esV8iv4IW3nZ11GsD": {
    "modelId": "lt:long-staff",
    "name": "Long Staff",
    "qualityClass": "crushing",
    "construction": "wood",
    "cost": 15.0,
    "mass": 5.0,
    "sourcePages": [
      "LT61",
      "LT69"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "e140WNiazx7pJ3WTT": {
    "modelId": "lt:longsword",
    "name": "Longsword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 700.0,
    "mass": 4.0,
    "sourcePages": [
      "LT58",
      "LT66",
      "LT70"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "en-fdeTeZmFoFeRDl": {
    "modelId": "lt:mace",
    "name": "Mace",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 50.0,
    "mass": 5.0,
    "sourcePages": [
      "LT58",
      "LT65",
      "LT70"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "e5MufJotezd4kJRgV": {
    "modelId": "lt:macuahuilzoctli",
    "name": "Macuahuilzoctli",
    "qualityClass": "cutting",
    "construction": "obsidian-edge",
    "cost": 350.0,
    "mass": 2.0,
    "sourcePages": [
      "LT59",
      "LT69"
    ],
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "eeieywVt5JyxmHN-A": {
    "modelId": "lt:macuahuitl",
    "name": "Macuahuitl",
    "qualityClass": "cutting",
    "construction": "obsidian-edge",
    "cost": 500.0,
    "mass": 3.0,
    "sourcePages": [
      "LT59",
      "LT65"
    ],
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "ectaYaLbAkCo8RdZ-": {
    "modelId": "lt:main-gauche",
    "name": "Main-Gauche",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 50.0,
    "mass": 1.25,
    "sourcePages": [
      "LT59",
      "LT67"
    ],
    "shortBlade": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "ey_8MkQ9Fj9IUl8hf": {
    "modelId": "lt:maul",
    "name": "Maul",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 80.0,
    "mass": 12.0,
    "sourcePages": [
      "LT58",
      "LT70"
    ],
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "enRjgElZfQg12bu8s": {
    "modelId": "lt:monk-s-spade",
    "name": "Monk's Spade",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 100.0,
    "mass": 6.0,
    "sourcePages": [
      "LT59",
      "LT68"
    ],
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "e_cCkf4diFiNi3Zli": {
    "modelId": "lt:morningstar",
    "name": "Morningstar",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 80.0,
    "mass": 6.0,
    "sourcePages": [
      "LT59",
      "LT66"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "ejf-JHLsTLDXHwdtX": {
    "modelId": "lt:myrmex",
    "name": "Myrmex",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 20.0,
    "mass": 0.25,
    "sourcePages": [
      "LT59",
      "LT65"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "egKG0gxFsV8-qjuFY": {
    "modelId": "lt:naginata",
    "name": "Naginata",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 100.0,
    "mass": 6.0,
    "sourcePages": [
      "LT59",
      "LT71",
      "LT68",
      "LT70"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eC3_4mzO0O862pzLq": {
    "modelId": "lt:nunchaku",
    "name": "Nunchaku",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 20.0,
    "mass": 2.0,
    "sourcePages": [
      "LT60",
      "LT66"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "eVFFo97xJS4l_aVcY": {
    "modelId": "lt:pata",
    "name": "Pata",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 650.0,
    "mass": 3.75,
    "sourcePages": [
      "LT60",
      "LT65"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eKwMCDo2RNpVfe8g6": {
    "modelId": "lt:pick",
    "name": "Pick",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 70.0,
    "mass": 3.0,
    "sourcePages": [
      "LT60",
      "LT65"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "e68ynUhBIItsvRXGy": {
    "modelId": "lt:pike",
    "name": "Pike",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 80.0,
    "mass": 13.0,
    "sourcePages": [
      "LT60",
      "LT69"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "ehric7NRa13oOCpVe": {
    "modelId": "lt:poleaxe",
    "name": "Poleaxe",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 120.0,
    "mass": 10.0,
    "sourcePages": [
      "LT60",
      "LT68"
    ],
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "e1-kupYR57Dmtk-K1": {
    "modelId": "lt:pollaxe",
    "name": "Pollaxe",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 120.0,
    "mass": 10.0,
    "sourcePages": [
      "LT60",
      "LT71",
      "LT68"
    ],
    "damageTypes": [
      "cr",
      "imp"
    ]
  },
  "ewhgkn7b3TlISAntZ": {
    "modelId": "lt:qian-kun-ri-yue-dao",
    "name": "Qian Kun Ri Yue Dao",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 250.0,
    "mass": 3.0,
    "sourcePages": [
      "LT60",
      "LT65",
      "LT69"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "efP799eM0XsYMv65q": {
    "modelId": "lt:quadrens",
    "name": "Quadrens",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 200.0,
    "mass": 2.0,
    "sourcePages": [
      "LT60",
      "LT67",
      "LT66"
    ],
    "damageTypes": [
      "imp"
    ],
    "shortBlade": true
  },
  "eNAbv7FBdpbO8-1Ov": {
    "modelId": "lt:quarterstaff",
    "name": "Quarterstaff",
    "qualityClass": "crushing",
    "construction": "wood",
    "cost": 10.0,
    "mass": 4.0,
    "sourcePages": [
      "LT61",
      "LT69",
      "LT70"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "egIzYm2hrjhoVpPTN": {
    "modelId": "lt:rapier",
    "name": "Rapier",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 500.0,
    "mass": 2.75,
    "sourcePages": [
      "LT61",
      "LT68"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "eKw6vIzpzM-liA6SM": {
    "modelId": "lt:roman-scutum-large",
    "name": "Roman Scutum, Large",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 200.0,
    "mass": 22.0,
    "sourcePages": [
      "LT115",
      "LT68",
      "LT116"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "eDvyuVqXXIYxrK9O3": {
    "modelId": "lt:roman-scutum-medium",
    "name": "Roman Scutum, Medium",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 140.0,
    "mass": 16.0,
    "sourcePages": [
      "LT115",
      "LT68",
      "LT116"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "exp433xr3rkUj9Wuk": {
    "modelId": "lt:rondel-dagger",
    "name": "Rondel Dagger",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 40.0,
    "mass": 1.0,
    "sourcePages": [
      "LT56",
      "LT67"
    ],
    "shortBlade": true,
    "damageTypes": [
      "imp"
    ]
  },
  "e2zZXnRnVHk6dkkmc": {
    "modelId": "lt:rope-dart",
    "name": "Rope Dart",
    "qualityClass": "impaling",
    "construction": "fixed",
    "cost": 30.0,
    "mass": 0.5,
    "sourcePages": [
      "LT61",
      "LT67"
    ],
    "damageTypes": [
      "cr",
      "imp"
    ]
  },
  "eNROYfnjT1DYJkdkS": {
    "modelId": "lt:round-mace",
    "name": "Round Mace",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 35.0,
    "mass": 5.0,
    "sourcePages": [
      "LT58",
      "LT70"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "e2uQrabbceGyYIDmM": {
    "modelId": "lt:saber",
    "name": "Saber",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 700.0,
    "mass": 2.0,
    "sourcePages": [
      "LT61",
      "LT68"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "edWyoRhbknJaNvsTK": {
    "modelId": "lt:sai",
    "name": "Sai",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 60.0,
    "mass": 1.5,
    "sourcePages": [
      "LT61",
      "LT66",
      "LT67"
    ],
    "damageTypes": [
      "cr",
      "imp"
    ]
  },
  "e_lS2hphKAPenuN1w": {
    "modelId": "lt:scythe",
    "name": "Scythe",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 15.0,
    "mass": 5.0,
    "sourcePages": [
      "LT61",
      "LT70"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eUmoObBLpgPBL9Pef": {
    "modelId": "lt:short-baton",
    "name": "Short Baton",
    "qualityClass": "crushing",
    "construction": "wood",
    "cost": 10.0,
    "mass": 0.5,
    "sourcePages": [
      "LT54",
      "LT67",
      "LT69"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "ecKNdB9BdSK-c_FDO": {
    "modelId": "lt:short-spear",
    "name": "Short Spear",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 30.0,
    "mass": 2.0,
    "sourcePages": [
      "LT62",
      "LT69"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eujyRcBZwKblZxbKM": {
    "modelId": "lt:short-staff",
    "name": "Short Staff",
    "qualityClass": "sword",
    "construction": "wood",
    "cost": 20.0,
    "mass": 1.0,
    "sourcePages": [
      "LT61",
      "LT69"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "ez4ZjutUoKa4ORnkj": {
    "modelId": "lt:shortsword",
    "name": "Shortsword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 400.0,
    "mass": 2.0,
    "sourcePages": [
      "LT61",
      "LT69"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eFwe9c7n36mOngrR1": {
    "modelId": "lt:shotel",
    "name": "Shotel",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 200.0,
    "mass": 3.0,
    "sourcePages": [
      "LT62",
      "LT65"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "elh_eFb_-3ca-rEdE": {
    "modelId": "lt:sickle",
    "name": "Sickle",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 40.0,
    "mass": 2.0,
    "sourcePages": [
      "LT62",
      "LT65"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "egYV07BvI6PwY-DWv": {
    "modelId": "lt:slashing-wheel",
    "name": "Slashing Wheel",
    "qualityClass": "sword",
    "construction": "fixed",
    "cost": 60.0,
    "mass": 1.0,
    "sourcePages": [
      "LT62",
      "LT67"
    ],
    "metal": true,
    "damageTypes": [
      "cut"
    ]
  },
  "eugTcxhNAMzqvlt9K": {
    "modelId": "lt:small-axe",
    "name": "Small Axe",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 45.0,
    "mass": 3.0,
    "sourcePages": [
      "LT54",
      "LT65"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "edQFaHvX_nrGL4ra6": {
    "modelId": "lt:small-falchion",
    "name": "Small Falchion",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 200.0,
    "mass": 2.0,
    "sourcePages": [
      "LT56",
      "LT69"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "ee1kRIRXHzUdofj74": {
    "modelId": "lt:small-knife",
    "name": "Small Knife",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 30.0,
    "mass": 0.5,
    "sourcePages": [
      "LT58",
      "LT67"
    ],
    "shortBlade": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eOJFIXvUSkQk5KC2f": {
    "modelId": "lt:small-mace",
    "name": "Small Mace",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 35.0,
    "mass": 3.0,
    "sourcePages": [
      "LT54",
      "LT65"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "euFuvEaABw1ncQz2M": {
    "modelId": "lt:small-round-mace",
    "name": "Small Round Mace",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 25.0,
    "mass": 3.0,
    "sourcePages": [
      "LT58",
      "LT65"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "elbJwTmAPdiWFj-Mg": {
    "modelId": "lt:small-throwing-axe",
    "name": "Small Throwing Axe",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 50.0,
    "mass": 3.0,
    "sourcePages": [
      "LT64",
      "LT65"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "emViZt-5rQnxGAIVU": {
    "modelId": "lt:small-throwing-knife",
    "name": "Small Throwing Knife",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 30.0,
    "mass": 0.5,
    "sourcePages": [
      "LT75",
      "LT78",
      "B272"
    ],
    "shortBlade": true,
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eJdmG2XPlfFC_C8B9": {
    "modelId": "lt:smallsword",
    "name": "Smallsword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 400.0,
    "mass": 1.5,
    "sourcePages": [
      "LT61",
      "LT69"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "e38ON6vscOBSE2xbN": {
    "modelId": "lt:sodegarami",
    "name": "Sodegarami",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 100.0,
    "mass": 4.0,
    "sourcePages": [
      "LT62",
      "LT69"
    ],
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "eyvtiiimEqgyXYWaU": {
    "modelId": "lt:spear",
    "name": "Spear",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 40.0,
    "mass": 4.0,
    "sourcePages": [
      "LT62",
      "LT69"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "enjD63xIeaGU_03QB": {
    "modelId": "lt:spear-w-thong",
    "name": "Spear w. Thong",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 45.0,
    "mass": 4.0,
    "sourcePages": [
      "LT62",
      "LT77",
      "LT69"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "edBYbyqTMO4WubN7W": {
    "modelId": "lt:spike-shuriken",
    "name": "Spike Shuriken",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 3.0,
    "mass": 0.1,
    "sourcePages": [
      "LT73",
      "LT65"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "eWOkljQnuFOlvvblh": {
    "modelId": "lt:star-shuriken",
    "name": "Star Shuriken",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 3.0,
    "mass": 0.1,
    "sourcePages": [
      "LT73",
      "LT65"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "ehWLoxON1p8yydZwT": {
    "modelId": "lt:stiletto",
    "name": "Stiletto",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 20.0,
    "mass": 0.25,
    "sourcePages": [
      "LT62",
      "LT67"
    ],
    "shortBlade": true,
    "damageTypes": [
      "imp"
    ]
  },
  "eJ1aIpfPamQPxpY4l": {
    "modelId": "lt:tetsubo",
    "name": "Tetsubo",
    "qualityClass": "crushing",
    "construction": "metal-head",
    "cost": 100.0,
    "mass": 10.0,
    "sourcePages": [
      "LT62",
      "LT70"
    ],
    "metal": true,
    "damageTypes": [
      "cr"
    ]
  },
  "ecrmjCuxxcj0IhqrT": {
    "modelId": "lt:thonged-club",
    "name": "Thonged Club",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 5.0,
    "mass": 0.5,
    "sourcePages": [
      "LT62",
      "LT66"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "ekWVAX6giztAM6orY": {
    "modelId": "lt:three-part-staff",
    "name": "Three-Part Staff",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 60.0,
    "mass": 5.0,
    "sourcePages": [
      "LT62",
      "LT70"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "ek2DWesEupFg8hTVR": {
    "modelId": "lt:throwing-axe",
    "name": "Throwing Axe",
    "qualityClass": "cutting",
    "construction": "blade",
    "cost": 60.0,
    "mass": 4.0,
    "sourcePages": [
      "LT64",
      "LT65",
      "LT70"
    ],
    "damageTypes": [
      "cut"
    ]
  },
  "eZ5VeRUQ_ElV7L2cl": {
    "modelId": "lt:thrusting-bastard-sword",
    "name": "Thrusting Bastard Sword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 750.0,
    "mass": 5.0,
    "sourcePages": [
      "LT54",
      "LT66",
      "LT70"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eTZgf42cuj04t5Sej": {
    "modelId": "lt:thrusting-broadsword",
    "name": "Thrusting Broadsword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 600.0,
    "mass": 3.0,
    "sourcePages": [
      "LT55",
      "LT65"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "eKOnhuOmt2tBEfyeK": {
    "modelId": "lt:thrusting-greatsword",
    "name": "Thrusting Greatsword",
    "qualityClass": "sword",
    "construction": "blade",
    "cost": 900.0,
    "mass": 7.0,
    "sourcePages": [
      "LT56",
      "LT70"
    ],
    "damageTypes": [
      "cut",
      "imp"
    ]
  },
  "ecUULGohIZt65tziP": {
    "modelId": "lt:tonfa",
    "name": "Tonfa",
    "qualityClass": "crushing",
    "construction": "wood",
    "cost": 40.0,
    "mass": 1.5,
    "sourcePages": [
      "LT64",
      "LT65",
      "LT70"
    ],
    "damageTypes": [
      "cr"
    ]
  },
  "ezzOYj-J1IwXY-ERY": {
    "modelId": "lt:trident",
    "name": "Trident",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 80.0,
    "mass": 5.0,
    "sourcePages": [
      "LT64",
      "LT69"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "e9i4ODyXdgWFkDz6w": {
    "modelId": "lt:two-handed-macuahuitl",
    "name": "Two-Handed Macuahuitl",
    "qualityClass": "cutting",
    "construction": "obsidian-edge",
    "cost": 650.0,
    "mass": 5.0,
    "sourcePages": [
      "LT59",
      "LT70"
    ],
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "eV_KnEisbEgxWmZ4Z": {
    "modelId": "lt:urumi",
    "name": "Urumi",
    "qualityClass": "sword",
    "construction": "fixed",
    "cost": 400.0,
    "mass": 4.0,
    "sourcePages": [
      "LT64",
      "LT70"
    ],
    "metal": true,
    "damageTypes": [
      "cr",
      "cut"
    ]
  },
  "eAcLA_uoBCUNnhqZ6": {
    "modelId": "lt:warhammer",
    "name": "Warhammer",
    "qualityClass": "impaling",
    "construction": "blade",
    "cost": 100.0,
    "mass": 7.0,
    "sourcePages": [
      "LT64",
      "LT70"
    ],
    "damageTypes": [
      "imp"
    ]
  },
  "eDt1K-vyug027xpew": {
    "modelId": "lt:weighted-scarf",
    "name": "Weighted Scarf",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 10.0,
    "mass": 1.0,
    "sourcePages": [
      "LT64",
      "LT66"
    ],
    "damageTypes": [
      "None",
      "cr"
    ]
  },
  "eYxnZ_xy8bPmU5wjC": {
    "modelId": "lt:whip",
    "name": "Whip, 1 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 20,
    "mass": 2,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 1,
    "pricePerYard": 20,
    "massPerYard": 2,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "e3jL1AshtW8kJTRn-": {
    "modelId": "lt:whip",
    "name": "Whip, 2 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 40,
    "mass": 4,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 2,
    "pricePerYard": 20,
    "massPerYard": 2,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "eoeqiE3pD8ZHx9zAl": {
    "modelId": "lt:whip",
    "name": "Whip, 3 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 60,
    "mass": 6,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 3,
    "pricePerYard": 20,
    "massPerYard": 2,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "ewlNskuyH-3Rzk5HG": {
    "modelId": "lt:whip",
    "name": "Whip, 4 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 80,
    "mass": 8,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 4,
    "pricePerYard": 20,
    "massPerYard": 2,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "eoaV7DRtbeb3cW4Tw": {
    "modelId": "lt:whip",
    "name": "Whip, 5 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 100,
    "mass": 10,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 5,
    "pricePerYard": 20,
    "massPerYard": 2,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "eEiCiuNCI6IsOffu5": {
    "modelId": "lt:whip",
    "name": "Whip, 6 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 120,
    "mass": 12,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 6,
    "pricePerYard": 20,
    "massPerYard": 2,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "exN8oC2r2it8FyM9p": {
    "modelId": "lt:whip",
    "name": "Whip, 7 yd",
    "qualityClass": "crushing",
    "construction": "fixed",
    "cost": 140,
    "mass": 14,
    "sourcePages": [
      "LT64",
      "LT70",
      "LT71"
    ],
    "lengthYards": 7,
    "pricePerYard": 20,
    "massPerYard": 2,
    "metal": false,
    "damageTypes": [
      "cr"
    ]
  },
  "e3m2R0EN6occeIRSW": {
    "modelId": "lt:wooden-stake",
    "name": "Wooden Stake",
    "qualityClass": "impaling",
    "construction": "wooden-stake",
    "cost": 4.0,
    "mass": 0.5,
    "sourcePages": [
      "LT64",
      "LT67"
    ],
    "damageTypes": [
      "imp"
    ]
  }
};
