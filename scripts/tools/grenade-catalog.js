// Source profiles for hand delivery only. No launcher, mine or placed-charge modes.
import {resolveUTGrenade} from './grenade-ut.js';
export {UT_GRENADE_BODIES,UT_THROWABLE_PAYLOADS,utGrenadePayloads} from './grenade-ut.js';
const clone = value => structuredClone(value);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const stun = 'Радиус 10 ярдов; Vision/Hearing-Based HT-5. Protected Vision и Protected Hearing дают по +5. Провал: оглушение; восстановление HT-5 каждый ход. Также дым (B277; HT192).';
const molotov = 'B411: Malf12; DR3+ разбивает бутылку. При Dodge или отскоке от слабой брони падает у ног цели, без обычного scatter; Block разбивает о щит. Прямо 3d burn, затем 1d/с; по земле 1d-1/с, радиус 1 ярд, 10d секунд. DR /5; Sealed защищает полностью. Результат контакта и горение определяет ведущий.';
function profile(id,name,book,tl,weight,blast,fragments,delay,extra={}) {
  return { id,name,book,tl,weight,blast:blast ? { formula:blast, type:'cr', divisor:1 } : null,
    fragments:fragments ? {formula:fragments,type:'cut',divisor:1} : null, effects:[],
    fuse:{modes:delay === 'impact' ? ['impact'] : delay === null ? ['manual'] : ['time'], delays:Array.isArray(delay)?delay:[delay].filter(Number.isFinite), start:book==='BS'?'arm':'release'},
    ready:1, source:book==='BS'?'B277':book==='LT'?'LT85':'HT192', ...extra };
}
const rows = [
  profile('bs-black-powder','Black Powder (TL5)','BS',5,1,'3d','1d',[3,4,5],{fuse:{modes:['time'],delays:[3,4,5],start:'arm'},effects:['Ready зажечь запал; 5 Ready, если сначала вставить запал. B277.']}),
  profile('bs-concussion6','Concussion (TL6)','BS',6,1,'6d',null,4),
  profile('bs-fragmentation6','Fragmentation (TL6)','BS',6,1,'4d','2d',4),
  profile('bs-molotov','Molotov Cocktail','BS',6,1,null,null,'impact',{effects:[molotov],molotov:true}),
  profile('bs-chemical','Chemical (TL7)','BS',7,1,null,null,2,{effects:['Радиус 2 ярда, около 80 секунд. Вещество выбирается вручную: дым, слезоточивый газ или иное подтверждённое вещество (B277/B439).'],radius:2}),
  profile('bs-concussion7','Concussion (TL7)','BS',7,1,'5dx2',null,4),
  profile('bs-fragmentation7','Fragmentation (TL7)','BS',7,1,'8d','3d',4),
  profile('bs-stun','Stun (TL8)','BS',8,1,null,null,2,{effects:[stun],radius:10}),
  profile('bs-plasma','Plasma (TL^)','BS',null,1,'6dx4',null,2,{superscience:true,blast:{formula:'6dx4',type:'burn',divisor:1}}),
  profile('lt-paper','Paper Bomb','LT',3,5,'5d',null,null,{effects:['LT85: дым 5 ярдов, 60 секунд, Vision-10 и mild poison B439. Получивший cr: HT-5, провал оглушает; слух снижен на MoF на max(1,20-HT) минут; провал на 10+ или критический – глухота. Восстановление слуха по правилам crippling injury. Fright Check для неподготовленных ездовых животных; люди – решение GM. Длина запала не указана: срабатывание подтверждается вручную.'],radius:5}),
  profile('lt-iron','Iron Bomb','LT',3,30,'6dx4','2d',null,{effects:['LT85: длина запала не указана; момент срабатывания подтверждает ведущий.']}),
  profile('ht-main','Grenade à Main','HT',5,2.2,'3d','1d',[3,4,5],{source:'HT190/192',fuse:{modes:['time'],delays:[3,4,5],start:'arm'},effects:['Malf14. Ready зажечь; 5 Ready при вставке запала.']}),
  profile('ht-stiel','Stielhandgranate','HT',6,1.3,'5d',null,[4,5],{modeId:'WuSwudOPMn3FPi0hn',equipmentId:'eq3rPgvUuHz8OR9li',ready:2,fuse:{modes:['time'],delays:[4,5],start:'arm'}}),
  profile('ht-mills','Mills Number 36M Mk I','HT',6,1.7,'5d-1','2d',7,{modeId:'WPb05MGB5U22WhZjX',equipmentId:'eivw33277aF76kEQC'}),
  profile('ht-mk2','MK II','HT',6,1.3,'4d+1','2d',[4,5],{modeId:'WFWBO8gdeijkdufew',equipmentId:'e0T7qIN7Wz7vkE8j6'}),
  profile('ht-mk3','MK III','HT',6,1,'8d+2',null,[4,5],{modeId:'W1AXJetJOp1XY88oe',equipmentId:'euYbCeoJpL8mJA5Sy'}),
  profile('ht-eihand','Eihandgranate 39','HT',7,.6,'6d+1',null,[4,5],{modeId:'WaMoBp4cA8_-4mghl',equipmentId:'ecYAri5cGu3pbWIKT',fuse:{modes:['time'],delays:[4,5],start:'arm'}}),
  profile('ht-anm8','AN-M8','HT',7,1.8,null,null,[1,2],{modeId:'Wg_ZqowKk05rX-txE',equipmentId:'eMilBGHSUFTOsxGiM',radius:7,effects:['HT192: дым 7 ярдов. Генерация дыма 120 секунд; облако около 80 секунд в обычных условиях (примечание таблицы). Горячий корпус: 1d-2 burn при контакте, воспламеняет горючее. Длительность зависит от ветра.']}),
  profile('ht-anm14','AN-M14','HT',7,2,null,null,[1,2],{modeId:'WyF9StlgdU94SGHH3',equipmentId:'e5jUnAfO9P-sg74Hh',effects:['HT188/192: thermate 40 секунд; при контакте 3d burn/с и постоянная потеря DR1 за каждые 10 повреждений; воспламеняет горючее в 2 ярдах, горит под водой. Урон от контакта и потеря DR применяются вручную.']}),
  profile('ht-rpg43','RPG-43','HT',7,2.6,'6d',null,'impact',{modeId:'WpfYF3t2IuxldyO5N',equipmentId:'eK9DtdTtpyxsnOHyj',blast:{formula:'6d',type:'cr',divisor:10},unfamiliar:true,effects:['HT192: нужно прямое попадание головной частью. Незнакомая техника: Throwing-5; подтвердите знакомство. Бронеделитель (10) только для прямого попадания, не collateral.']}),
  profile('ht-m26','M26','HT',7,1,'8d+2','2d',[4,5],{modeId:'Wi4mo1qYiwfBkJvMo',equipmentId:'ePVocBUXwqthV_oW9'}),
  profile('ht-m34','M34 WP','HT',7,1.5,'2d','1d',[4,5],{modeId:'WwWcYlJpks2oLc-nv',equipmentId:'eZSB5a13HVV2Y2z3s',blast:{formula:'2d',type:'burn',divisor:1},fragments:{formula:'1d',type:'burn',divisor:.2},radius:5,effects:['HT172/192/193: горячий фосфорный осколок наносит 1d(0.2) burn каждые 10 секунд в течение минуты; DX позволяет стряхнуть осколок. Вода не гасит WP. Под водой осколки не рассеиваются должным образом, дым не образуется. Дым радиусом 5 ярдов около 60 секунд. Продолжающееся горение – вручную.']}),
  profile('ht-m67','M67','HT',7,.9,'9d','2d',[4,5],{modeId:'WBxhKpTfRkp7r7qfu',equipmentId:'e7o-PVLQdkJEIChRU'}),
  profile('ht-dm51','Diehl DM51 (с рубашкой)','HT',7,1,'3d+2','3d',[4,5],{modeId:'Wwn2lB4g_vAfkgYdn',equipmentId:'ejPn3cw2jooOJGUV4'}),
  profile('ht-dm51-bare','Diehl DM51 (без рубашки)','HT',7,.3,'5d',null,[4,5],{modeId:'Wwa6ZbUCJLT5-0avj',equipmentId:'ehBcVAOwmZ_PMey0q'}),
  profile('ht-stun','Schermuly Stun','HT',7,.5,null,null,[1,2],{modeId:'WMHOvmCZnNN2vFPME',equipmentId:'efH2YzMsseL65WNqs',radius:10,effects:[stun]}),
  profile('ht-arges','ARGES HG 86','HT',8,.4,'3d-1','2d',[4,5],{modeId:'W34TQ9RIZmzKB6TK1',equipmentId:'eb5gGaJTyH6t1J7fE'}),
  profile('ht-stingball','M452 Stingball','HT',8,.5,'1d+1','1d-1',[2,3],{modeId:'WXKbQfaTOJ0ADcUdk',equipmentId:'exPXPzu54jHibSH0_',fragments:{formula:'1d-1',type:'cr',divisor:1},fragmentRadius:7,effects:[stun,'HT193: резиновые поражающие элементы, радиус 7 ярдов.']}),
];
export const HAND_GRENADES = freeze(rows);
export function resolveHandGrenade(selection, catalogs) {
  if(typeof selection==='string')selection={id:selection};
  const fixed=HAND_GRENADES.find(p=>p.id===selection?.id);
  return fixed?clone(fixed):resolveUTGrenade(selection,catalogs);
}
