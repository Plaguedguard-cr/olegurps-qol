// M2.7. Printed HT24-31,47,52,56,93,196-200,220; B271-274; MA109-112.
// This overlay never writes GCS/GGA equipment or copies a ranged statistic into melee.
const defaults={
 'Axe/Mace':[['DX',-5],['Flail',-4],['Two-Handed Axe/Mace',-3]],
 'Two-Handed Axe/Mace':[['DX',-5],['Axe/Mace',-3],['Polearm',-4],['Two-Handed Flail',-4]],
 Knife:[['DX',-4],['Force Sword',-3],['Main-Gauche',-3],['Shortsword',-3]],
 Shortsword:[['DX',-5],['Broadsword',-2],['Force Sword',-4],['Jitte/Sai',-3],['Knife',-4],['Saber',-4],['Smallsword',-4],['Tonfa',-3]],
 Broadsword:[['DX',-5],['Force Sword',-4],['Rapier',-4],['Saber',-4],['Shortsword',-2],['Two-Handed Sword',-4]],
 Saber:[['DX',-5],['Broadsword',-4],['Main-Gauche',-3],['Rapier',-3],['Shortsword',-4],['Smallsword',-3]],
 Smallsword:[['DX',-5],['Main-Gauche',-3],['Rapier',-3],['Saber',-3],['Shortsword',-4]],
 Spear:[['DX',-5],['Polearm',-4],['Staff',-2]],Staff:[['DX',-5],['Polearm',-4],['Spear',-2]],
 Tonfa:[['DX',-5],['Shortsword',-3]],Brawling:[['DX',0]],Karate:[['DX',0]],Boxing:[['DX',0]],DX:[['DX',0]]
};
const option=skill=>({sourceHeader:skill,unmodifiedSkills:[skill],defaults:defaults[skill].map(([from,modifier])=>({from,modifier,type:from==='DX'?'attribute':'skill',recursive:false}))});
export const htMeleeSkillOptions=skills=>skills.map(option);
const profiles={},equipment=[],slug=s=>s.replace(/[^a-zA-Z0-9]/g,'');
function item(modelId,id,name,tl,cost,mass,pages,extra={}){
 const e={modelId:'ht:'+modelId,equipmentId:id,name,techLevel:tl,cost,mass,sourcePages:pages,baselineQuality:'Good',qualityClass:'crushing',construction:'fixed',...extra};equipment.push(e);return e;
}
function mode(e,id,usage,damage,reach,parry,st,skills,penalty=0,extra={}){
 const p={...e,book:'HT',modeId:id,usage,stats:{damage,reach,parry,st},primarySkills:skills,sourceOptions:skills.map(option),attackModifier:penalty,
  hands:/[†‡]/.test(st??'')?2:1,displayUsage:true,damagePart:'striking-part',martialGrips:[],balanceOptions:[],...extra};
 p.ltConstruction={domain:'HT',modelId:p.modelId,construction:p.construction,qualityClass:p.qualityClass,shortBlade:p.qualityClass==='knife',metal:p.construction!=='wood'&&p.construction!=='plastic',damageTypes:[damage.split(' ').at(-1)]};
 p.baselineMaterial='published';p.qualityOptions=htGrades(p);if(p.fixedPublishedQuality||['hilt','gun-body','fist-load','scabbard'].includes(p.damagePart))p.qualityOptions=p.qualityOptions.filter(q=>q.level===p.baselineQuality);profiles[id]=p;return p;
}
export function htGrades(p){
 const grades=[{level:'Good',damageBonus:0,breakage:0},{level:'Cheap',damageBonus:0,breakage:2},{level:'Fine',damageBonus:1,damageTypes:['cut','imp'],breakage:-1}];
 if(p.qualityClass==='sword')grades.push({level:'Very Fine',damageBonus:2,damageTypes:['cut','imp'],breakage:-2});return grades;
}
const great=(e,id,penalty=0)=>mode(e,id,'Swing – лезвие','sw+3 cut','1,2*','0U','12‡',['Two-Handed Axe/Mace'],penalty,{martialGrips:['defensive']});
const smallMace=(e,id,penalty=0)=>mode(e,id,'Swing','sw+2 cr','1','0U','10',['Axe/Mace'],penalty,{martialGrips:['defensive']});
const maul=(e,id,penalty=0,damage='sw+4 cr')=>mode(e,id,'Swing',damage,'1,2*','0U','13‡',['Two-Handed Axe/Mace'],penalty,{martialGrips:['defensive']});
const baton=(e,ids,extra={})=>{mode(e,ids[0],'Swing','sw cr','1','0','6',['Shortsword'],0,{martialGrips:['defensive','reversed'],...extra});mode(e,ids[1],'Thrust','thr cr','1','0','6',['Shortsword'],0,{martialGrips:['defensive','reversed'],...extra});};
const knife=(e,ids,sw='sw-3 cut',thr='thr-1 imp',st='5',parry='-1',extra={})=>{
 if(ids[0])mode(e,ids[0],'Swing – открытый клинок',sw,'C,1',parry,st,['Knife'],0,{damagePart:'blade',martialGrips:['defensive','reversed'],...extra});
 if(ids[1])mode(e,ids[1],'Thrust – открытый клинок',thr,'C',parry,st,['Knife'],0,{damagePart:'blade',martialGrips:['defensive','reversed'],...extra});
};
let e=item('broad-axe','ev6IWD4-uE0rGlA0e','Broad Axe',5,100,6,['HT24','B274'],{construction:'metal-head',qualityClass:'cutting'});great(e,'wFmnElv38Dl7vCHz8',-3);
e=item('felling-axe','eWPb7dZDtN1UCSHqd','Felling Axe',5,100,5,['HT24','B274'],{construction:'metal-head',qualityClass:'cutting'});great(e,'wfKR2M4gnXBEF9xnA');
e=item('double-bitted-axe','e7_bLwLBEgCjCHcJV','Double-Bitted Axe',6,100,5,['HT24','HT25','B274'],{construction:'metal-head',qualityClass:'cutting',hints:['Обе кромки используют Great Axe; различие заточки не создаёт новый Damage. HT25.']});great(e,'w2A5N1ScjaT1lLiWB');
e=item('spike-axe','en23jl_JtDFD07ZkT','Spike Axe',5,100,8,['HT24','HT25','B274'],{construction:'metal-head',qualityClass:'cutting',hints:['Ready для переворота лезвия/шипа; застревание и извлечение шипа – вручную. HT25; B405.']});great(e,'wtn5e3QgIZlvQbvqQ');mode(e,'wHTM27SpikeAxePick','Swing – шип','sw+3 imp','1,2*','0U','12‡',['Two-Handed Axe/Mace'],0,{martialGrips:['defensive']});
e=item('splitting-maul','ebtmPVWYqoPTurp35','Splitting Maul',7,100,8,['HT25','B274'],{construction:'metal-head',qualityClass:'cutting'});great(e,'wiVweCQycRfxLWw-S',-3);
e=item('multi-purpose-rescue-axe','e6t4Yw5hHaQR0vZoM','Multi-Purpose Rescue Axe',8,200,4.5,['HT25','B271'],{construction:'metal-head',qualityClass:'cutting',hints:['Выбор стороны головки и +1 Forced Entry – вручную. Рукоять как pry bar не получает выдуманный боевой профиль. HT25.']});
mode(e,'wNvMhJZvddcEoaCeq','Swing – лезвие','sw+2 cut','1','0U','11',['Axe/Mace'],0,{martialGrips:['defensive']});mode(e,'wHTM27RescuePick','Swing – кирка','sw+1 imp','1','0U','10',['Axe/Mace'],0,{martialGrips:['defensive'],hints:['Застревание Pick и извлечение – вручную. B405.']});
for(const [id,mid,tl,mass]of [['eNlOD0zWWikViisSd','wdTZZ7oKQZ7buTp0c',5,3],['eRx44Du6RbHftDjqV','wCPNzG9L3bnIX62at',7,1.5]]){e=item('hammer',id,'Hammer',tl,15,mass,['HT25','B271'],{construction:'metal-head'});smallMace(e,mid);}
e=item('sledgehammer','eWRfOAIsArr59NgHj','Sledgehammer',5,10,15,['HT25','B274'],{construction:'metal-head'});maul(e,'wTlBkPvUYs-6Rw3l4',-2);
e=item('go-bar','eGOxhmW2NAoeOReiY','Go-Bar',7,175,17,['HT29','B274']);maul(e,'w37bkrQ8qa2ehFHj-',-2);
e=item('iv-stand','eezdwLDGWE_YDI6K7','IV Stand',6,75,15,['HT220','B274'],{hints:['−3 Damage относительно Maul уже включено; −2 к навыку применяется отдельно один раз. HT220.']});maul(e,'wYaeKbdic5OYqbULN',-2,'sw+1 cr');
e=item('spanner-wrench','eajfEbEtM723JxHzZ','Spanner Wrench',6,15,3,['HT29','B271']);smallMace(e,'wrL7rskIEkSAtGcTC',-2);
e=item('crowbar-titanium','eHTM27TitaniumCrowbar','Crowbar, Titanium',8,50,2,['HT30','B271'],{construction:'fixed',hints:['Титановая конструкция уже включена в $50 и 2 lb. Не умножать повторно как материал клинка HT198.']});smallMace(e,'wHTM27TitaniumCrowbar',-1);
e=item('shovel','e_1UECwWT7jlR5Jrh','Shovel',5,15,6,['HT25','B274'],{construction:'metal-head',qualityClass:'cutting',baselineQuality:'Cheap',fixedPublishedQuality:true});great(e,'wp6bDROiNcRJwGzWh',-2);
e=item('shovel-folding','eW-cNpwCnVcCDwAjs','Shovel, Folding',6,10,3,['HT25','B271'],{construction:'metal-head',qualityClass:'cutting',hints:['Боевой профиль Axe относится к уже открытому инструменту; раскрытие и фиксация выполняются вручную. HT25. Числовой удар сложенным инструментом не опубликован.']});mode(e,'w8UxOYTiLBvz6mhoR','Swing – раскрыта и зафиксирована','sw+2 cut','1','0U','11',['Axe/Mace'],-2,{martialGrips:['defensive']});
e=item('ice-axe','eFf7OhZNT2TliecEw','Ice Axe',5,100,2,['HT56','B271'],{construction:'metal-head',qualityClass:'impaling',hints:['Как Pick; застревание и извлечение – вручную. Отдельные боевые Damage для тесла/острия рукояти не опубликованы. HT56; B405.']});mode(e,'wQ0bf_MmAgCn4fM1v','Swing – кирка','sw+1 imp','1','0U','10',['Axe/Mace'],0,{martialGrips:['defensive']});
e=item('utility-knife','e5nWOWZw-5nAJf2Op','Utility Knife',6,2,0.25,['HT25','B272'],{construction:'blade',qualityClass:'knife',hints:['Только режущий удар выдвинутым лезвием. Выдвижение и замена лезвия – вручную. HT25.']});knife(e,['w7amXfwCvbsp7yOU_',null],'sw-3 cut',null,'5','-1',{martialGrips:['defensive']});
e=item('pocketknife','eHTM27Pocketknife','Pocketknife',5,5,0,['HT31','B272'],{construction:'blade',qualityClass:'knife',hints:['Только самый крупный открытый клинок: Small Knife −1 Damage. Самые короткие клинки не являются боевым оружием. Открытие двумя руками требует Ready, если конструкция не задаёт исключение. HT31; HT198.']});knife(e,['wHTM27PocketknifeSwing','wHTM27PocketknifeThrust'],'sw-4 cut','thr-2 imp');
e=item('machete','earXz_vCKpjMT8AyY','Machete',5,50,1.5,['HT197','HT200'],{construction:'blade',qualityClass:'knife',baselineQuality:'Cheap',hints:['Обычно Cheap по HT197; опубликованный Damage не уменьшается повторно. Выбранное улучшение относится к этому экземпляру.']});knife(e,['wAjcSsvacJM_7Tzfr','wRXDd86Y4__OPZLRK'],'sw-1 cut','thr-1 imp','7','0');
e=item('push-knife','emJVhil2_lMm-hp5b','Push Knife',5,30,0.5,['HT197','HT200'],{construction:'blade',qualityClass:'knife'});knife(e,[null,'wtIG6nyrGeh8tD-zL'],null,'thr imp','5','-1',{martialGrips:['defensive'],betterHandParry:true});
e=item('survival-knife','esGXNt3LP9x5vK2tM','Survival Knife',5,45,1,['HT197','HT200'],{construction:'blade',qualityClass:'knife',hints:['Полая рукоять не подтверждает автоматически крепление древка. Makeshift spear требует отдельной проверенной конфигурации. HT197.']});knife(e,['wtMjcI58OCR7XMeMq','wrQR9Rgjti7MzzuO9'],'sw-2 cut','thr imp','6');
e=item('switchblade','eTeIQwzgAqpsxVYtD','Switchblade',5,30,0.5,['HT197','HT200'],{construction:'blade',qualityClass:'knife',hints:['Клинок должен быть открыт. При попытке парирования ломается на 1–4 на 1d; разрешение и последствия вручную. Табличный Parry No сохраняется. HT197; HT200.']});knife(e,['wkbjDVUL46CT6mIcC','wm46LzEuQ8BMOFZ2_'],'sw-3 cut','thr-1 imp','5','No');
e=item('tactical-folding-knife','e52sQF4g-RQhkba8a','Tactical Folding Knife',8,30,0.5,['HT198','HT200'],{construction:'blade',qualityClass:'knife',hints:['Открытие взмахом кисти – свободное действие; выбор боевого режима сам не меняет физическое состояние. HT198.']});knife(e,['wljw_rn5aQiy2VN6y','wxEqz2xFzN7mgJLei']);
e=item('trench-knife','ec-sdpLnIh2l6kLUW','Trench Knife',6,45,1.5,['HT198','HT200'],{construction:'blade',qualityClass:'knife',gcsEquipmentIds:['eqoNhm5MABJ3JUyJa']});knife(e,['wzamLAfFUhE_iRDHH','wT-pH9Zmco_kJOcvk'],'sw-2 cut','thr imp','6');mode(e,'wHTM27TrenchPunch','Punch – кастетная гарда','thr cr','C','0',null,['Brawling','DX'],0,{damagePart:'hilt',unarmedSkillBonus:true,handParry:true,construction:'fixed'});
e=item('katana','eC6lytQUMuXS9guYX','Katana',6,550,3.75,['HT197','HT200'],{construction:'blade',qualityClass:'sword',explicitGood:true,hints:['Современная короткая Katana использует именно HT200, а не двухручные ST/Reach традиционной Katana B271/B274. $550 и 3.75 lb включают ножны. HT197.']});mode(e,'w1E5tlALr61HNzATz','Swing','sw+1 cut','1','0','10',['Broadsword'],0,{damagePart:'blade',martialGrips:['defensive','reversed','tip']});mode(e,'wM0HTKatanaThrust','Thrust','thr+1 imp','1','0','10',['Broadsword'],0,{damagePart:'blade',martialGrips:['defensive','reversed','tip']});baton(e,['wHTM27KatanaSheathSwing','wHTM27KatanaSheathThrust'],{damagePart:'scabbard',fixedPublishedQuality:true,baselineQuality:'Cheap',hints:['Те же ножны 1.25 lb; выбрать только уже извлечённые жёсткие ножны. Hollow scabbard Cheap для поломки. HT197–198.']});
e=item('sword-cane','egixYjiSM8QfhH5S1','Sword Cane',5,600,1.5,['HT197','HT200'],{construction:'blade',qualityClass:'sword',hints:['Тонкий клинок: качество на ступень ниже оплаченного. Нет гарды: −2 Parry уже в −2F. Извлечение клинка и ножен – вручную. HT197.']});mode(e,'w0pG2m0oUOrqTGZIq','Thrust – извлечённый клинок','thr imp','C,1','-2F','5',['Smallsword'],0,{damagePart:'blade',martialGrips:['defensive','reversed','tip'],gradePriceShift:1});baton(e,['wHTM27SwordCaneSheathSwing','wHTM27SwordCaneSheathThrust'],{damagePart:'scabbard',fixedPublishedQuality:true,baselineQuality:'Cheap',hints:['Ножны 1 lb как Baton; полая конструкция Cheap для поломки. HT197–198.']});
for(const [id,name,skill,cost,mass,sw,thr,parry]of [['Saber','Saber','Saber',700,2,'sw-1 cut','thr+1 imp','0F'],['Cutlass','Cutlass','Shortsword',300,2,'sw cut','thr imp','0'],['Shortsword','Shortsword','Shortsword',400,2,'sw cut','thr imp','0']]){e=item(name.toLowerCase(),'eHTM27'+id,name,5,cost,mass,['HT196','B273','B274'],{construction:'blade',qualityClass:'sword'});mode(e,'wHTM27'+id+'Swing','Swing',sw,'1',parry,'8',[skill],0,{damagePart:'blade',martialGrips:['defensive','reversed','tip']});mode(e,'wHTM27'+id+'Thrust','Thrust',thr,'1',parry,'8',[skill],0,{damagePart:'blade',martialGrips:['defensive','reversed','tip']});if(id==='Cutlass')mode(e,'wHTM27CutlassPunch','Punch – гарда','thr cr','C','0',null,['Brawling','DX'],0,{damagePart:'hilt',unarmedSkillBonus:true,handParry:true,construction:'fixed',sourcePages:['HT196','B274[10]','B271']});}
for(const [key,name,tl,spike]of [['Tomahawk','Tomahawk',5,false],['SpikedTomahawk','Tomahawk, Spiked',7,true]]){e=item('tomahawk','eHTM27'+key,name,tl,40,2,['HT196','B271','B274'],{construction:'metal-head',qualityClass:'cutting'});mode(e,'wHTM27'+key+'Blade','Swing – лезвие','sw cut','1','0','8',['Axe/Mace'],0,{martialGrips:['defensive']});if(spike)mode(e,'wHTM27'+key+'Spike','Swing – шип','sw-1 imp','1','0','8',['Axe/Mace'],0,{martialGrips:['defensive'],hints:['Fine TL7 относится к обоим краям; −1 Damage шипа относительно режущего профиля уже включено. Застревание Pick – вручную. HT196; B405.']});}
e=item('expandable-baton','e0WSvhPoP9FfmXqSp','Expandable Baton',6,60,2,['HT198','HT200'],{hints:['Таблица относится к раскрытому Baton. Gravity: Ready или успешный Fast-Draw (Sword); складывание о твёрдую поверхность. Числовой профиль сложенного Baton не опубликован. Выбор режима не раскрывает предмет. HT198.']});baton(e,['w--xkYEbbEK1Rrg0A','wo4A8K1eQQs458_Xg']);
e=item('tonfa','eiGKXpvF-EAqxnqr_','Tonfa',7,40,1,['HT198','HT200'],{construction:'plastic',gcsEquipmentIds:['ezjXW2X8ZHOOOn8cN']});mode(e,'w0NSjdoiRcUc8KE8m','Swing – Tonfa','sw cr','1','0','7',['Tonfa'],0,{betterHandParry:true});mode(e,'w30EgsQ0EdR8Lhf04','Thrust – Tonfa','thr cr','C,1','0','7',['Tonfa'],0,{betterHandParry:true});mode(e,'wHTM27TonfaPunch','Punch – рукоять','thr cr','C','0',null,['Brawling','DX'],0,{unarmedSkillBonus:true,handParry:true,damagePart:'hilt'});
e=item('cane','eHTM27Cane','Cane',5,5,2.5,['HT31','B271'],{construction:'wood'});mode(e,'wHTM27CaneSwing','Swing – Light Club','sw+1 cr','1','0','10',['Broadsword'],0,{martialGrips:['defensive','reversed']});mode(e,'wHTM27CaneThrust','Thrust – Light Club','thr+1 cr','1','0','10',['Broadsword'],0,{martialGrips:['defensive','reversed']});
e=item('spyglass','eHTM27Spyglass','Spyglass',5,25,2,['HT47','B271'],{fixedPublishedQuality:true,hints:['Как хорошо сбалансированный Light Club, без штрафа навыка. После удара больше не пригоден как телескоп; состояние меняет игрок вручную. HT47.']});mode(e,'wHTM27SpyglassSwing','Swing','sw+1 cr','1','0','10',['Broadsword']);mode(e,'wHTM27SpyglassThrust','Thrust','thr+1 cr','1','0','10',['Broadsword']);
e=item('rigid-scabbard','eHTM27RigidScabbard','Rigid Scabbard (1 lb+)',5,null,1,['HT198','B273'],{fixedPublishedQuality:true,baselineQuality:'Cheap',hints:['Только фактические жёсткие ножны массой не менее 1 lb. Гибкие ножны не получают атаки. Hollow scabbard Cheap для поломки; специально усиленные – Good вручную. Цена зависит от исходного клинка. HT198.']});baton(e,['wHTM27ScabbardSwing','wHTM27ScabbardThrust']);
for(const [id,mids,tl,mass]of [['eJMrkuiaXNnra_maA',['wZXqbIUQSr3ohAwKB','wfEKsoFrfsGkWtKO_'],7,2],['exKEib5EKFTfuiP89',['w-l1Jk0-db1LbK5tg','w7pREBk8-2BnGHseL'],8,0.5]]){e=item('large-tactical-light',id,'Large Tactical Light',tl,200,mass,['HT52','B273'],{fixedPublishedQuality:true,hints:['Только физический удар как Baton. Свет, батареи и ослепление не расходуются и не автоматизируются. HT52.']});baton(e,mids);}
for(const [id,mid,tl,mass]of [['eTGYRiOPWA63QwFPV','wPvpPmA7zMWFG2nEE',7,1],['etEMrb0nJU4ZJkJeY','wGYwjQk5pg_UNgXN9',8,0.25]]){e=item('small-tactical-light',id,'Small Tactical Light',tl,100,mass,['HT52','B271'],{fixedPublishedQuality:true});mode(e,mid,'Punch – фонарь в кулаке','thr cr','C','0',null,['Boxing','Brawling','Karate','DX'],0,{unarmedSkillBonus:true,handParry:true,damagePart:'fist-load'});}
for(const [key,cost,gcs]of [['HandRam',150,'eOniA13QVZWCNUAwq'],['HandRamNonSparking',300,'e9skt2Gli5Qld1AEW']]){e=item('hand-ram','eHTM27'+key,key==='HandRam'?'Hand Ram':'Hand Ram, Non-Sparking',6,cost,35,['HT29','B274'],{gcsEquipmentIds:[gcs],hints:['Только боевое применение как clumsy Maul, −3 к Two-Handed Axe/Mace. Специальные sw+3d+1 cr, ST20† и Forced Entry по неподвижной двери относятся к рабочей операции, не к этой атаке. HT29.']});maul(e,'wHTM27'+key,-3);}
e=item('shovel-titanium','eHTM27TitaniumShovel','Shovel, Titanium',8,40,4,['HT25','HT26','B274'],{construction:'metal-head',qualityClass:'cutting',baselineQuality:'Cheap',fixedPublishedQuality:true,hints:['Otherwise normal shovel: тот же Cheap Great Axe −2; $40 и 4 lb уже учитывают материал. HT25–26.']});great(e,'wHTM27TitaniumShovel',-2);
e=item('saber','eHTM27CavalrySaber','Cavalry Saber',5,500,3,['HT196','B271'],{construction:'blade',qualityClass:'sword'});mode(e,'wHTM27CavalrySaberSwing','Swing – Cavalry Saber','sw+1 cut','1','0','10',['Broadsword'],0,{damagePart:'blade',martialGrips:['defensive','reversed','tip']});mode(e,'wHTM27CavalrySaberThrust','Thrust – Cavalry Saber','thr+1 imp','1','0','10',['Broadsword'],0,{damagePart:'blade',martialGrips:['defensive','reversed','tip']});

// Exact reviewed firearm hosts are kept in a compact table; no family/name inference.
import {HT_M27_HOSTS,HT_M27_PISTOLS,HT_M27_ORIGINAL_FIELDS,HT_M27_MANUAL_MODES} from './ht-ordinary-host-data.js';
for(const h of HT_M27_HOSTS){e=item(h.modelId.replace(/^ht:/,''),h.equipmentId,h.name,h.tl,null,null,h.sourcePages,{hostRule:'HT198',fixedPublishedQuality:true});
 mode(e,'wHTM27Butt'+slug(h.equipmentId),'Thrust – торец приклада','thr+2 cr',h.buttReach,null,null,['Staff'],0,{hands:2,requiresTwoHands:true,damagePart:'gun-body',hints:['Тот же физический экземпляр. Приклад должен быть пригоден для удара и находиться в нужном положении. Melee ST/Parry не опубликованы; ranged ST не подставляется. HT198.']});
 mode(e,'wHTM27Barrel'+slug(h.equipmentId),'Swing – удержание за ствол','sw+3 cr',h.buttReach,null,null,['Two-Handed Axe/Mace'],0,{hands:2,requiresTwoHands:true,damagePart:'gun-body',hints:[h.barrelSafe?'TL4–5 single-shot musket/rifle рассчитан на такой удар. HT198.':'Для этой конструкции ГМ может потребовать HT против поломки; риск, удержание за ствол и последствия – вручную. HT198.']});
 if(h.bayonet)mode(e,'wHTM27Bayonet'+slug(h.equipmentId),'Thrust – подходящий установленный штык','thr+3 imp',h.bayonet.reach,null,null,['Spear'],h.bayonet.penalty,{hands:2,requiresTwoHands:true,damagePart:'bayonet',construction:'blade',qualityClass:'impaling',fixedPublishedQuality:false,baselineQuality:h.bayonet.cheap?'Cheap':'Good',hostBayonet:true,hints:[h.bayonet.condition,'Только фактически подходящий и установленный штык этого экземпляра. Установка 4 Ready, с Fast-Draw (Knife) 3; складной штык и состояние приклада – вручную. Familiarity −2 только при фактической незнакомой комбинации. −1 Guns и влияние на заряжание/вес учитываются вручную; ranged-профиль не изменяется. HT197.']});
}
const garand=profiles.wHTM27Bayonetee3UomNhA2E12tsUp;
mode(garand,'wHTM27GarandKnife1943','Thrust – установленный ножевой штык с 1943','thr+3 imp','1',null,null,['Spear'],0,{hands:2,requiresTwoHands:true,damagePart:'bayonet',hostBayonet:true,sourcePages:['HT113','HT197'],hints:['Garand: с 1943 возможен ножевой штык 0.8 lb, Reach 1. Старый sword bayonet 1.1 lb имеет Reach 1,2*. Выбирается фактически установленный вариант; подмена или установка не автоматизируются. HT113; HT197.']});
for(const h of HT_M27_PISTOLS){e=item(h.modelId.replace(/^ht:/,''),h.equipmentId,h.name,h.tl,null,null,h.sourcePages,{hostRule:'HT93',fixedPublishedQuality:true});mode(e,h.modeId,h.designed?'Swing – пистолетная рукоять':'Punch – корпус пистолета',h.damage,null,null,null,h.designed?['Axe/Mace']:['Brawling','DX'],0,{damagePart:'gun-body',hints:['Тот же физический пистолет. HT93 прямо задаёт sw+1 для специальных тяжёлых пистолетов; для обычного пистолета используется thr−1+|Bulk| только по HT93. Melee ST/Reach/Parry не опубликованы; состояние и риск поломки – вручную.']});}
export const HT_ORDINARY_PROFILES=profiles,HT_ORDINARY_EQUIPMENT=equipment;
// Exact equipment-only library identities and legacy split skill records.
const gcsIdentities={eHTM27Cane:['eXRZeFJIi5cbXoZ7l'],eHTM27Pocketknife:['eLzYZKBC1jJPj3SAB'],eHTM27Spyglass:['eIaxmGHpwv7I4xsAs'],eHTM27TitaniumCrowbar:['eG2bDoPwVQGHLmZRE'],eHTM27TitaniumShovel:['eHcsU1b3Tg87vv_uw']};
for(const p of Object.values(profiles))if(gcsIdentities[p.equipmentId])p.gcsEquipmentIds=gcsIdentities[p.equipmentId];
profiles.wHTM27TrenchPunch.gcsModeIds=['wVJHviRFdF9HsPock'];profiles.wHTM27TonfaPunch.gcsModeIds=['wUiL6pRkKH21K5hQ-'];
for(const p of Object.values(profiles)){
 if(HT_M27_ORIGINAL_FIELDS[p.modeId])p.sourceFieldsBefore=HT_M27_ORIGINAL_FIELDS[p.modeId];
 if(p.equipmentId==='eHTM27SpikedTomahawk'){
  p.baselineQuality='Fine';p.publishedQualityTL=7;p.stats={...p.stats,damage:p.stats.damage==='sw cut'?'sw+1 cut':'sw imp'};
  p.hints=[...(p.hints??[]),'Опубликованный fine hatchet TL7: +1 Damage Fine уже включён в оба режима. HT196.'];
 }
 if(p.modelId==='ht:cane')p.sourcePages=[...p.sourcePages,'MA214'];
 if(p.modelId==='ht:spyglass'||p.modelId==='ht:tonfa'&&!p.unarmedSkillBonus)p.martialGrips=['defensive','reversed'];
 if(['wHTM27TrenchPunch','wHTM27TonfaPunch','wHTM27CutlassPunch'].includes(p.modeId)){
  p.primarySkills=['Brawling','Boxing','Karate','DX'];p.sourceOptions=p.primarySkills.map(option);p.sourcePages=[...new Set([...p.sourcePages,'MA111','B182','B203'])];
 }
 if(p.modelId==='ht:tonfa')p.hints=[...(p.hints??[]),'В Reversed Grip специальный Brawling/Karate Parry без дополнительного штрафа; неудачное парирование и последствия – вручную. MA111.'];
 if(p.modelId==='ht:rigid-scabbard'){p.mass=null;p.minimumMassLb=1;}
 if(p.modelId==='ht:katana'&&p.damagePart==='blade')p.sheathMass=1.25;
 if(p.modelId==='ht:sword-cane'&&p.damagePart==='blade')p.sheathMass=1;
 if(p.gradePriceShift)p.baselineQuality='Cheap';
 if(p.gradePriceShift)p.qualityOptions=p.qualityOptions.filter(q=>q.level!=='Very Fine');
}
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};freeze(profiles);freeze(equipment);
export const htOrdinarySource=id=>profiles[id]??null;
export const htOrdinaryGripPolicy=p=>profiles[p?.modeId]?{grips:p.martialGrips??[],twoHanded:p.hands===2}:null;
export const htOrdinaryTipDamage=p=>{if(!p.martialGrips.includes('tip'))throw Error('Хват за остриё не подтверждён.');return 'thr imp';};
export const htOrdinaryHints=p=>[...(p.hints??[]),'Reach, смена хвата/Ready, U/F/No и поломка являются справочными условиями. Защиты и физические состояния меняет игрок вручную. '+p.sourcePages.join('; ')+'.'];
export function applyHTOrdinaryMode(m,e,{snapshot=false}={}){
 const p=profiles[m?.weapon_mode_id];if(!p||e.source!=='HT'||e.equipment_id!==p.equipmentId)return m;
 const before=p.sourceFieldsBefore,accept=(field,current,value)=>!snapshot||before&&[before[field],value].some(v=>JSON.stringify(v)===JSON.stringify(current));
 const sourceHands=accept('st',m.stats.strength,p.stats.st);
 if(accept('damage',m.raw_calc?.damage,p.stats.damage)){const d=/^(sw|thr)([+-]\d+)?(?:\(([\d.]+)\))? (\S+)$/.exec(p.stats.damage);m.stats={...m.stats,damage:{st:d[1],...(d[2]?{base:String(Number(d[2]))}:{}),type:d[4]}};m.raw_calc={...m.raw_calc,damage:p.stats.damage};}
 for(const [key,field]of [['reach','reach'],['parry','parry'],['strength','st']])if(accept(field,m.stats[key],p.stats[field]))m.stats[key]=p.stats[field];
 if(accept('usage',m.usage,p.usage))m.usage=p.usage;
 if(sourceHands)m.hand_use={...m.hand_use,value:p.hands===2?'two-handed':'one-handed',basis:'printed-source'};
 m.ht_ordinary_contract={modelId:p.modelId,sourcePages:p.sourcePages,damagePart:p.damagePart};return m;
}
export function projectHTOrdinaryData(book,data){
 if(book!=='weapons')return data;
 for(const spec of equipment){let e=data.equipment.find(e=>e.equipment_id===spec.equipmentId);if(!e){e={source:'HT',book:'High-Tech',equipment_id:spec.equipmentId,name:spec.name,reference:spec.sourcePages[0],tech_level:String(spec.techLevel),tags:['Melee Weapon'],local_notes:null,modes:[],ht_ordinary_origin:'module-printed-source-overlay'};data.equipment.push(e);}
  for(const p of Object.values(profiles).filter(p=>p.equipmentId===e.equipment_id)){let m=e.modes.find(m=>m.weapon_mode_id===p.modeId);if(!m){m={weapon_mode_id:p.modeId,index:e.modes.length,usage:p.usage,usage_notes:null,hidden:false,combat_type:'melee',role:'attack',stats:{},raw_calc:{},defaults:[],weapon_family:'melee',hand_use:{value:p.hands===2?'two-handed':'one-handed',basis:'printed-source'},action_hints:[],resolution_flags:[]};e.modes.push(m);}applyHTOrdinaryMode(m,e);}
 }
 // GCS splits the same physical Tonfa/Trench Knife into separate skill records. Keep legacy
 // IDs readable, but offer the complete physical definition once in new catalog searches.
 for(const id of ['ezjXW2X8ZHOOOn8cN','eqoNhm5MABJ3JUyJa'])for(const m of data.equipment.find(e=>e.equipment_id===id)?.modes??[])m.hidden=true;
 for(const e of data.equipment.filter(e=>e.source==='HT'))for(const m of e.modes)if(HT_M27_MANUAL_MODES[m.weapon_mode_id])m.ht_tool_manual=HT_M27_MANUAL_MODES[m.weapon_mode_id];
 return data;
}
