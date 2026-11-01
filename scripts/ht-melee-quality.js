// HT198 blade materials and B274 grades. Same editor/flags, no world TL fallback.
export const HT_MATERIALS={
 published:{label:'Исходный материал конструкции',tl:null},
 steel:{label:'Углеродистая сталь',tl:3,metal:true},
 stainless:{label:'Stainless Steel (ТУ6)',tl:6,metal:true},
 ceramic:{label:'Ceramic (ТУ7)',tl:7,scale:3,massMultiplier:0.5,breakageQuality:'Cheap'},
 titanium:{label:'Titanium (ТУ7)',tl:7,metal:true,scale:2,massMultiplier:0.75,breakageQuality:'Very Fine'}
};
const grades=['Cheap','Good','Fine','Very Fine'];
const tl=s=>s.weaponTL==null||s.weaponTL===''?null:Number(s.weaponTL);
export const htMaterialChoices=p=>p.fixedPublishedQuality||['hilt','gun-body','fist-load','scabbard'].includes(p.damagePart)?['published']:
 p.construction==='blade'?['published','steel','stainless','ceramic','titanium']:
 p.construction==='metal-head'&&['cutting','impaling'].includes(p.qualityClass)?['published','steel','stainless']:['published'];
export function htMaterialEffect(p,id){
 if(!htMaterialChoices(p).includes(id))throw Error('Материал не подтверждён для этой конструкции HT.');
 return {...HT_MATERIALS[id],metal:HT_MATERIALS[id].metal||id==='published'&&p.ltConstruction?.metal===true,id,type:p.stats.damage.split(' ').at(-1),scale:HT_MATERIALS[id].scale??1};
}
export function htQualityGrades(p,s={}){
 const high=tl(s)!==null&&tl(s)>=7;
 const material=s.material||s.baselineMaterial||'published';
 return p.qualityOptions.map(q=>({...q,costMultiplier:high?{Cheap:0.2,Good:0.4,Fine:1,'Very Fine':4}[q.level]:
  q.level==='Cheap'?0.4:q.level==='Good'?1:q.level==='Very Fine'?20:p.qualityClass==='sword'?4:p.qualityClass==='cutting'||p.qualityClass==='knife'?10:3,
  ...(material==='stainless'&&p.qualityClass==='sword'?{costMultiplier:high?{Cheap:0.4,Good:1,Fine:8,'Very Fine':40}[q.level]:{Cheap:1,Good:8,Fine:40,'Very Fine':null}[q.level]}:{})})).filter(q=>q.costMultiplier!=null);
}
export const htSuperfineAllowed=(p,material)=>p.construction==='blade'&&p.damagePart==='blade'&&['published','steel'].includes(material)&&/\s(?:cut|imp)$/.test(p.stats.damage);
export function resolveHTMeleeQuality(p,s={}, {imported=false,manualDamage=false,publishedInput=false}={}){
 const weaponTL=tl(s),high=weaponTL!==null&&weaponTL>=7,fixed=p.fixedPublishedQuality||['hilt','gun-body','fist-load','scabbard'].includes(p.damagePart);
 const declared=s.baselineQuality||(imported?null:p.baselineQuality),baseline=publishedInput?p.baselineQuality:declared;
 const from=publishedInput?'published':s.baselineMaterial||'published',material=s.material||s.baselineMaterial||'published';
 const fm=htMaterialEffect(p,from),to=htMaterialEffect(p,material);
 const paidStandard=material==='stainless'?(high?'Good':'Cheap'):(high?'Fine':'Good');
 const standard=p.gradePriceShift?grades[Math.max(0,grades.indexOf(paidStandard)-1)]:material==='stainless'&&p.qualityClass==='sword'?(high?'Good':'Cheap'):high&&!p.explicitGood&&p.baselineQuality==='Good'?'Fine':p.baselineQuality;
 const level=s.quality||declared||(publishedInput?p.baselineQuality:null);
 const target=s.quality||(imported?level:fixed?p.baselineQuality:standard),options=htQualityGrades(p,s),quality=options.find(q=>q.level===target),original=p.qualityOptions.find(q=>q.level===baseline);
 if(s.balance||s.baselineBalance)throw Error('Покупная балансировка HT для этой модели не подтверждена.');
 if(s.quality&&!quality||baseline&&!original)throw Error('Качество не подтверждено для этой конструкции HT.');
 if(fixed&&(s.quality&&s.quality!==p.baselineQuality||s.material&&s.material!=='published'||s.blade&&s.blade!=='standard'||s.coating))throw Error('Fine, материал клинка и Superfine не применяются к этой ударной части.');
 if(imported&&!publishedInput&&(s.quality||s.material||s.blade||s.coating)&&(!baseline||!s.baselineMaterial))throw Error('Сначала укажите уже включённые качество и материал импорта GGA.');
 if(manualDamage&&(s.quality||s.material||s.blade||s.coating))throw Error('Нельзя пересчитать качество поверх ручного Damage.');
 const blade=s.blade||s.baselineBlade||'standard',baselineBlade=publishedInput?'standard':s.baselineBlade||'standard';
 if(!['standard','superfine'].includes(blade)||!['standard','superfine'].includes(baselineBlade))throw Error('Кромка не подтверждена.');
 if(blade==='superfine'&&(weaponTL===null||weaponTL<9||!htSuperfineAllowed(p,material)||target==='Very Fine'||s.coating))throw Error('Superfine требует ТУ9+ и подходящий стальной клинок, без Very Fine/серебрения.');
 if(imported&&!publishedInput&&s.blade&&!s.baselineBlade)throw Error('Укажите уже включённую кромку импорта.');
 if(s.coating&&s.coating!=='silver'||s.coating&&!to.metal&&material!=='published')throw Error('Покрытие не подтверждено для материала.');
 const bladePart=['blade','bayonet','striking-part'].includes(p.damagePart),damageType=p.stats.damage.split(' ').at(-1),cutting=bladePart&&['cut','imp'].includes(damageType);
 const bonus=(q,edge)=>cutting?(edge==='superfine'?2:q?.damageBonus??0):0;
 const damageBonus=fixed?0:bonus(quality,blade)-bonus(original,baselineBlade);
 const grade=quality?.level??(imported?'imported':p.baselineQuality);
 const unknown=imported&&!publishedInput&&(!baseline||!s.baselineMaterial);
 // Sword cane: effective quality is one step below paid quality (HT197).
 if(p.gradePriceShift&&grade==='Very Fine')throw Error('Sword Cane не достигает Very Fine: качество на ступень ниже оплаченного. HT197.');
 const paid=p.gradePriceShift?(s.quality?grades[Math.min(grades.length-1,grades.indexOf(grade)+p.gradePriceShift)]:paidStandard):grade;
 const pricingSelection=weaponTL===null&&p.publishedQualityTL!=null?{...s,weaponTL:p.publishedQualityTL}:s;
 const paidGrade=htQualityGrades({...p,qualityOptions:[{level:paid}]},pricingSelection)[0],edgeMultiplier=blade==='superfine'?6:1;
 const compoundUnknown=p.gradePriceShift&&material==='stainless'&&!high&&!s.quality;
 const combinedBladeCostUnknown=p.combined&&p.damagePart==='blade'&&(grade!==p.baselineQuality||!['published','steel'].includes(material)||blade==='superfine'||s.coating);
 const price=p.cost==null||unknown||compoundUnknown||combinedBladeCostUnknown?null:p.cost*(fixed?1:(to.scale??1)*edgeMultiplier*((paidGrade?.costMultiplier??1)+(s.coating?2:0)));
 const hints=[...(p.hints??[]),...(material==='stainless'?['Stainless Steel: для sword стандарт Cheap до ТУ6 и Good с ТУ7; улучшения ×8/×40. Отдельный −1 cut не задан. HT198.']:[]),
  ...(to.breakageQuality?['Материал: поломка как '+to.breakageQuality+'; обычный Damage без отдельной поправки. HT198.']:[]),
  ...(blade==='superfine'?['Superfine: итоговые +2 cut/imp и AD(2), без дополнительного Fine; согласованное консервативное правило модуля. UT163.']:[]),
  ...(weaponTL===null?['ТУ изготовления не задан: опубликованный профиль сохранён. ТУ кампании не подставляется.']:[]),
  ...(compoundUnknown?['Sword Cane + Stainless до ТУ7: снижение ниже Cheap не определено HT197–198. Цена и окончательное качество поломки требуют ручного решения; опубликованный Damage сохранён.']:[]),
  ...(combinedBladeCostUnknown?['Цена отдельного улучшения клинка комбинированного устройства не опубликована; стоимость всего пистолета не умножается как цена ножа.']:[]),
  'Качество относится только к выбранной ударной части. Поломка, коррозия и Ready – вручную. HT196–198; B274.'];
 return {level:grade,baseline:baseline??'unknown',weaponTL,material:unknown?'imported-unknown':material,balance:'published',blade,baselineBlade,damageBonus,damageTypes:['cut','imp'],skillBonus:0,
  armorDivisor:blade==='superfine'&&cutting?2:null,materialTransform:cutting&&(blade==='superfine'||baselineBlade==='superfine')?{type:damageType,divisor:blade==='superfine'?2:null,replaceDivisor:true}:null,
  price,mass:p.mass==null||unknown?null:(p.mass-(p.sheathMass??0))*(to.massMultiplier??1)+(p.sheathMass??0),hints,breakageQuality:compoundUnknown?'manual':to.breakageQuality??grade,sourcePages:p.sourcePages,
  inputSource:publishedInput?'published-selected-mode':imported?'gga-import':'published',
  cost:{regime:'ht-multipliers',publishedBase:p.cost,materialBase:p.cost,grade:grade,paidGrade:paid,gradeMultiplier:paidGrade?.costMultiplier??1,materialMultiplier:to.scale??1,bladeMultiplier:edgeMultiplier,final:price}};
}
