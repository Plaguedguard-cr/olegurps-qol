// Presentation only. Exact source profiles determine resources; zero never means absent.
import {resourceOnlyWeapon,weaponResourceProfile,readWeaponResource} from './weapon-resources.js';
import {ltFlameProfile} from '../lt-flame-source.js';
import {ltFlameCharge} from './lt-flame.js';
import {htPreGaussProfile} from '../ht-pre-gauss-profiles.js';
import {fluidProfile} from '../ut-fluid-source.js';
export function weaponResourcePresentation(weapon){
 const profile=weaponResourceProfile(weapon),saved=profile?readWeaponResource(weapon,profile):null;
 const only=!!resourceOnlyWeapon(weapon),flame=ltFlameProfile(weapon),ht=htPreGaussProfile(weapon?.standaloneModeId??weapon?.catalogModeId),fluid=fluidProfile(weapon?.standaloneModeId??weapon?.catalogModeId);
 const reservoir=['flame','squirt'].includes(ht?.kind)||!!fluid;
 const source=profile?{
  kind:profile.kind==='fuel'||profile.chemical?'fuel':'power',
  label:profile.kind==='fuel'?'Баллон LP':profile.oneShot?'Встроенный заряд':profile.label??(profile.cells>1?profile.cells+'×':'')+profile.cellSize+' cell',
  remaining:profile.kind==='fuel'?(saved?.remainingUnits??0)/4:(saved?.charge??0)/(profile.unitsPerStandardShot??1),
  capacity:profile.kind==='fuel'?(saved?.capacityUnits??profile.capacityUnits)/4:(saved?.capacity??profile.capacity)/(profile.unitsPerStandardShot??1),
  unit:profile.kind==='fuel'?'номинальных зарядов':profile.chemical?'выстр.':profile.sensorTime?'с':'зарядов'
 }:null;
 const prepared=flame?{label:flame.jet?'Топливный резервуар':'Подготовленный заряд',remaining:ltFlameCharge(weapon)?.flame?.remaining??0,capacity:flame.seconds,unit:flame.jet?'с':'заряд'}:null;
 const feed=!only&&!prepared?{label:reservoir?'Резервуар':'Магазин',remaining:weapon?.magazines?.[weapon.loadedIndex]??0,capacity:weapon?.capacity??0,
  unit:ht?.kind==='flame'?'подготовленных струй':ht?.kind==='squirt'?'пинт':fluid?'доз':'',total:weapon?.totalAmmo??0}:null;
 return {version:1,kind:only?source?.kind==='fuel'?'fuel-only':'power-only':source?'hybrid':prepared||reservoir?'reservoir':'cartridges',
  source,prepared,feed,physicalCartridges:!only&&!prepared&&!reservoir,showMagazines:!only,
  unmanaged:!only&&!prepared&&weapon?.ammoUnconfigured===true&&!weapon?.magazines?.length};
}
export const resourceLine=source=>source?source.label+': '+source.remaining+'/'+source.capacity+(source.unit?' '+source.unit:''):null;
export function weaponResourceStatLines(weapon,{includeSource=true}={}){
 const d=weaponResourcePresentation(weapon);return [includeSource?resourceLine(d.source):null,resourceLine(d.prepared),d.unmanaged?'Без учёта боезапаса':d.feed?
  d.feed.label.toLowerCase()+' '+d.feed.remaining+'/'+d.feed.capacity+(d.feed.unit?' '+d.feed.unit:''):null].filter(Boolean);
}
export function shotResourceLines(display,{loaded=true,total=true}={}){
 if(!display)return [];
 const lines=[resourceLine(display.source),resourceLine(display.prepared)];
 if(display.feed&&!display.unmanaged){
  if(loaded)lines.push('Установленный '+display.feed.label.toLowerCase()+': '+display.feed.remaining+'/'+display.feed.capacity+(display.feed.unit?' '+display.feed.unit:''));
  if(total)lines.push((display.physicalCartridges?'Общий боезапас':display.feed.unit?'Всего, '+display.feed.unit:'Всего ресурса')+': '+display.feed.total);
 }return lines.filter(Boolean);
}
