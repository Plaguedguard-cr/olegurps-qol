// UT169/UT87 swarm identities inside the existing UT156 physical warhead.
// Reference text only; no attacks, resources, effects or Actor writes.
export const UT_SWARM_TYPES=Object.freeze(Object.fromEntries([
  ['cannibal','Cannibal Swarm',12,'Собирает заданное изделие из подходящего сырья: до 10 lb/yd², (масса lb / площадь yd²) минут; сырьё преобразуется.'],
  ['devourer','Devourer Swarm',10,'Внутри роя: 1d(2) cor/сек.; защищает только Sealed DR.'],
  ['disassembler','Disassembler Swarm',11,'Только nanobots: 1d−2(10) cor/сек.; защищает только Sealed DR. Стандартная длительность — 30 секунд.'],
  ['gremlin','Gremlin Swarm',10,'Негерметичная техника с мелкими подвижными частями: 1 HP/ход на yd² без DR; Malf17, ещё −1 за каждые потерянные 10% HP.'],
  ['sentry','Sentry',10,'Против других microbot swarms: 2d/ход на hex; тип урона не указан.'],
  ['stinger','Stinger Swarm',10,'Живые при контакте без Sealed: 1 FP/ход; одежда замедляет рой.'],
  ['terminator','Terminator Swarm',10,'Живые при контакте без Sealed: 1 tox/ход.'],
  ['defoliator','Defoliator Swarm',10,'Растительность: 1 yd²/10 с; бережная обрезка — 1 yd²/мин. Выбор растений и уход за газоном; без вреда животным и людям.','UT87',1000],
  ['pesticide','Pesticide Swarm',10,'Только реальные рои насекомых: 1d cor/ход. Без вреда людям; не применяется к машинам и microbot swarms.','UT87',1000]
].map(([id,name,tl,brief,source='UT169',costPerSquareYard])=>[id,Object.freeze({id,name,tl,brief,source,...(source==='UT87'?{versions:Object.freeze([10,11]),costPerSquareYard,priceSource:'UT37',lc:3,...(id==='defoliator'?{proseCostPerSquareYard:1500,priceConflict:'UT37 $1000; UT87 $1500. Table priority; warhead pricing unchanged.'}:{})}:{})})])));
export const utSwarmType=id=>typeof id==='string'&&Object.hasOwn(UT_SWARM_TYPES,id)?UT_SWARM_TYPES[id]:null;
