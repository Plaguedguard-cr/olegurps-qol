// Imported only for mapped devices. Markers are documents; canvas is optional here.
import {grenadeMarkerData,grenadeMapContext,grenadeMapPoint,measureGrenadeDistance} from './grenade-map.js';
import {readMines,mineAuthority,MINE_SCOPE} from './mine-service.js';
import {mineSector} from './mine-rules.js';
const queues=new WeakMap();
const markers=(event,scene)=>scene.drawings.filter(d=>d.getFlag(MINE_SCOPE,'mineEvent')===event.id);
export async function syncMineMarker(event,runtime=globalThis){
  if(event.theatre)return;
  if(mineAuthority(runtime)?.id!==runtime.game.user.id)throw Error('Отметки мин обрабатывает активный GM.');
  const scene=runtime.game.scenes.get(event.map?.sceneId);if(!scene)throw Error('Исходная сцена мины недоступна.');
  const old=queues.get(scene)??Promise.resolve(),next=old.catch(()=>{}).then(async()=>{
    const existing=markers(event,scene);if(existing.length)return;
    const base=grenadeMarkerData({...event,landing:event.map},scene,event.map.pixelsPerYard,event.userId,runtime);
    base.text='◆';base.locked=true;base.flags={[MINE_SCOPE]:{mineEvent:event.id,mineVisual:'cell',mineUser:event.userId}};
    const data=[base];
    if(event.profile.directed){
      const size=Math.max(20,Math.round(event.map.pixelsPerYard)),a=event.facing*Math.PI/180,x=event.map.x*event.map.pixelsPerYard,y=event.map.y*event.map.pixelsPerYard;
      const point=(radius,angle)=>({x:x+radius*Math.sin(angle),y:y-radius*Math.cos(angle)}),points=[point(size*.9,a),point(size*.25,a-2.2),point(size*.25,a+2.2)];
      const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y));
      data.push({...base,x:minX,y:minY,text:'',shape:{type:'p',width:Math.ceil(Math.max(...points.map(p=>p.x))-minX),height:Math.ceil(Math.max(...points.map(p=>p.y))-minY),points:points.flatMap(p=>[p.x-minX,p.y-minY])},fillAlpha:.7,
        flags:{[MINE_SCOPE]:{mineEvent:event.id,mineVisual:'direction',mineUser:event.userId,facing:event.facing,sector:event.profile.directed.sector}}});
    }
    await scene.createEmbeddedDocuments('Drawing',data);
  });queues.set(scene,next);return next;
}
export async function removeMineMarker(event,runtime=globalThis){
  if(event.theatre)return;
  if(mineAuthority(runtime)?.id!==runtime.game.user.id)throw Error('Отметки мин обрабатывает активный GM.');
  const scene=runtime.game.scenes.get(event.map?.sceneId);if(!scene)return;
  const old=queues.get(scene)??Promise.resolve(),next=old.catch(()=>{}).then(async()=>{const ids=markers(event,scene).map(d=>d.id);if(ids.length)await scene.deleteEmbeddedDocuments('Drawing',ids);});queues.set(scene,next);return next;
}
export async function reconcileMineMarkers(runtime=globalThis){
  if(mineAuthority(runtime)?.id!==runtime.game.user.id)return;
  for(const event of readMines(runtime).events){if(event.theatre)continue;if(event.state==='done')await removeMineMarker(event,runtime);else await syncMineMarker(event,runtime);}
}
export function mineMapTargets(event,runtime=globalThis){
  if(event.theatre)throw Error('Для театра разума цели задаются вручную.');
  const context=grenadeMapContext(runtime),scene=runtime.canvas?.scene;
  if(!context||scene?.id!==event.map.sceneId)throw Error('Откройте исходную сцену мины.');
  return scene.tokens.filter(t=>t.actor).map(t=>{
    const object=t.object,point=object?.center;if(!point)return null;
    const target=grenadeMapPoint(point,runtime),distance=measureGrenadeDistance(event.map,target,runtime),dx=target.x-event.map.x,dy=target.y-event.map.y;
    const bearing=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
    return {id:t.id,actorId:t.actor.id,name:t.name,distance,elevationFeet:Number(t.elevation)*context.yardsPerUnit*3-Number(event.map.groundElevationFeet??0),sm:0,postureModifier:0,coverChecked:false,
      inSector:event.profile.directed?mineSector(bearing,event.facing,event.profile.directed.sector):true,bearing,geometry:{sceneId:scene.id,tokenId:t.id,point:target},blastCoverDR:0,projectileCoverDR:0,dodged:0};
  }).filter(Boolean);
}
