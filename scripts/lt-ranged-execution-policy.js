// Explicit project boundary, independent of source field repairs and physical fit.
export const LT_DEFERRED_RANGED=Object.freeze({WAd5_TDslv9AXFyLs:Object.freeze({source:'LT87',status:'DEFERRED',reason:'LT87: исполнение Rocket отложено до ракетного этапа; траектория, предел навыка и процедура попадания ещё не реализованы.'})});
export const ltDeferredExecutionReason=modeId=>LT_DEFERRED_RANGED[modeId]?.reason??null;
export function projectLTRangedExecutionPolicy(book,data){
 if(book!=='lt')return data;
 const notes={crossbow_alternate_tip:'LT73 определяет наконечники стрел луков; отдельные численные профили иных наконечников арбалетных болтов источником не установлены.',panjagan_10:'Кинематографический Panjagan: десять стрел, −4 к попаданию и Damage, Range /2. Выбирается владельцем в настройках лука; нужен физический крепёж и полный комплект стрел одной партии. LT78.',sling_harsh_realism:'Опциональные правила LT75 выбираются явно: пониженное пробитие пращей, отказы дешёвого оружия и уменьшенный Acc; по умолчанию выключены.'};
 for(const r of data.projectile_options??[])if(notes[r.id]){r.status='SOURCE_CONFIGURATION_REQUIRED';r.notes_ru=notes[r.id];}
 return data;
}
