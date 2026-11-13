// Loaded only outside theatre mode. Persisted points stay in yards for P1 compatibility.
import {withActorResourceWrite} from './actor-resource-writes.js';
import {generateId} from '../random-id.js';
const markerScope='olegurps-qol',markerQueue='grenadeMarkerRequests';
let mapSuspended=false;
export const setGrenadeMapSuspended=value=>{mapSuspended=!!value;};
export async function ensureGrenadeScene(event,{runtime=globalThis,active=()=>true}={}){
  if(event.theatre||!active())return false;
  const scene=runtime.game.scenes.get(event.map?.sceneId);
  if(!scene)throw Error('Исходная сцена гранаты недоступна.');
  if(runtime.canvas.scene?.id!==scene.id){await scene.view();if(!active())return false;}
  if(runtime.canvas.scene?.id!==scene.id||!runtime.canvas.ready)throw Error('Не удалось открыть исходную сцену гранаты.');
  return true;
}
function markerAuthority(runtime){return [...runtime.game.users??[]].filter(u=>u.active&&u.isGM&&u.getFlag(markerScope,'grenadePreferences')?.theatre===false).sort((a,b)=>a.id.localeCompare(b.id))[0];}
async function requestMarker(event,operation,runtime){
  const actor=runtime.game.actors.get(event.actorId),user=runtime.game.user;
  if(!actor?.isOwner)throw Error('Нужны права владельца персонажа.');
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(event.id)||!actor.getFlag(markerScope,'handGrenades')?.events?.some(e=>e.id===event.id))throw Error('Сохранённое событие гранаты не найдено.');
  const requestId=generateId(runtime,{preferFoundry:true});
  await withActorResourceWrite(actor,()=>actor.update({['flags.'+markerScope+'.'+markerQueue+'.'+event.id]:{requestId,userId:user.id,eventId:event.id,operation,state:'pending'}}));
  if(!markerAuthority(runtime)){runtime.ui.notifications.warn('Отметка ожидает активного GM в режиме карты. Бросок сохранён.');return null;}
  return new Promise((resolve,reject)=>{
    let hook,timer;const finish=(value,error)=>{runtime.Hooks.off('updateActor',hook);clearTimeout(timer);error?reject(error):resolve(value);};
    const check=()=>{const request=actor.getFlag(markerScope,markerQueue)?.[event.id];if(request?.requestId!==requestId)return;
      if(request.state==='done')finish(request.markerId??true);if(request.state==='error')finish(null,Error(request.error));};
    hook=runtime.Hooks.on('updateActor',a=>{if(a.id===actor.id)check();});
    timer=setTimeout(()=>finish(null,Error('Запрос отметки сохранён; активный GM ещё не завершил операцию.')),30000);check();
  });
}
export async function processGrenadeMarkerRequests(actor,runtime=globalThis){
  if(mapSuspended)return;
  if(markerAuthority(runtime)?.id!==runtime.game.user.id)return;
  return withActorResourceWrite(actor,async()=>{
    const requests=structuredClone(actor.getFlag(markerScope,markerQueue)??{});let changed=false;
    for(const request of Object.values(requests)){
      if(request.state!=='pending')continue;
      const user=runtime.game.users.get(request.userId),event=actor.getFlag(markerScope,'handGrenades')?.events?.find(e=>e.id===request.eventId);
      if(!user||!event||event.theatre||event.actorId!==actor.id||!actor.testUserPermission(user,'OWNER')){request.state='error';request.error='Нет прав на событие гранаты.';changed=true;continue;}
      if(user.getFlag(markerScope,'grenadePreferences')?.theatre!==false)continue;
      try{
        // Scene documents work without activating the scene or touching canvas.
        const scene=runtime.game.scenes.get(event.map?.sceneId);if(!scene)throw Error('Исходная сцена недоступна.');
        const existing=scene.drawings.filter(d=>d.getFlag(markerScope,'grenadeEvent')===event.id&&d.getFlag(markerScope,'grenadeActor')===actor.id&&(d.author?.id??d.author)===user.id);
        if(request.operation==='remove'){
          if(existing.length)await scene.deleteEmbeddedDocuments('Drawing',existing.map(d=>d.id));request.markerId=null;
        }else if(['area-show','area-remove'].includes(request.operation)){
          const marker=existing.find(d=>d.getFlag(markerScope,'grenadeVisual')!=='effect-area-v1');
          if(!marker)throw Error('Для области нужна действующая отметка взрыва.');
          await syncGrenadeEffectArea(event,scene,event.map.pixelsPerYard,user.id,runtime);
          request.markerId=marker.id;
        }else if(request.operation==='show'){
          const point=actualPoint(event);if(!point)throw Error('Место гранаты ещё не определено.');
          const scale=event.map.pixelsPerYard;if(!Number.isFinite(scale)||scale<=0)throw Error('Масштаб исходной сцены неизвестен.');
          const data=grenadeMarkerData(event,scene,scale,user.id,runtime);
          const marker=existing.find(d=>d.getFlag(markerScope,'grenadeVisual')!=='effect-area-v1');
          if(marker){await marker.update(data);request.markerId=marker.id;}
          else request.markerId=(await scene.createEmbeddedDocuments('Drawing',[data]))[0].id;
          await syncGrenadeEffectArea(event,scene,scale,user.id,runtime);
        }else throw Error('Неизвестная операция отметки.');
        request.state='done';
      }catch(error){request.state='error';request.error=String(error.message);}
      changed=true;
    }
    if(changed){const changes={};for(const request of Object.values(requests)){
      const latest=actor.getFlag(markerScope,markerQueue)?.[request.eventId];
      if(request.state!=='pending'&&latest?.requestId===request.requestId)changes['flags.'+markerScope+'.'+markerQueue+'.'+request.eventId]=request;
    }if(Object.keys(changes).length)await actor.update(changes);}
    for(const event of actor.getFlag(markerScope,'handGrenades')?.events??[]){
      if(event.theatre||!event.detonation?.profile?.payloadEffect||!event.map?.sceneId)continue;
      const scene=runtime.game.scenes.get(event.map.sceneId);if(!scene)continue;
      const markers=scene.drawings.filter(d=>d.getFlag(markerScope,'grenadeActor')===actor.id&&d.getFlag(markerScope,'grenadeEvent')===event.id&&d.getFlag(markerScope,'grenadeVisual')!=='effect-area-v1');
      for(const marker of markers){const author=marker.author?.id??marker.author,user=runtime.game.users.get(author);if(user&&user.getFlag(markerScope,'grenadePreferences')?.theatre===false)await syncGrenadeEffectArea(event,scene,event.map.pixelsPerYard,author,runtime);}
    }
  });
}
export function grenadeMapContext(runtime=globalThis) {
  const canvas=runtime.canvas;
  if(!canvas?.ready||!canvas.scene||!Number.isFinite(canvas.dimensions?.size)||!Number.isFinite(canvas.scene.grid?.distance))return null;
  const unit=String(canvas.scene.grid.units??'').trim().toLowerCase();
  const yards=['yd','yds','yard','yards','ярд','ярды','ярдов'].includes(unit)?1:['m','meter','meters','метр','метры','м'].includes(unit)?1/.9144:['ft','feet','foot'].includes(unit)?1/3:null;
  if(yards===null)return null;
  return {sceneId:canvas.scene.id,pixelsPerYard:canvas.dimensions.size/(canvas.scene.grid.distance*yards),yardsPerUnit:yards};
}
export function grenadeMapPoint(point,runtime=globalThis) {
  const context=grenadeMapContext(runtime);if(!context)throw Error('Карта с подтверждёнными единицами недоступна.');
  const grid=runtime.canvas.grid;
  const center=grid.type===0?point:grid.getCenterPoint(grid.getOffset(point));
  return {...context,x:center.x/context.pixelsPerYard,y:center.y/context.pixelsPerYard};
}
export function measureGrenadeDistance(origin,target,runtime=globalThis) {
  const context=grenadeMapContext(runtime);
  if(!context||origin?.sceneId!==context.sceneId||target?.sceneId!==context.sceneId)throw Error('Положение бросающего и цель должны находиться на текущей сцене.');
  const grid=runtime.canvas.grid,scale=context.pixelsPerYard;
  const points=[origin,target].map(p=>{const point={x:p.x*scale,y:p.y*scale};return grid.type===0?point:grid.getCenterPoint(grid.getOffset(point));});
  const distance=grid.measurePath(points).distance*context.yardsPerUnit;
  if(!Number.isFinite(distance)||distance<0)throw Error('Foundry не вернул игровую дистанцию.');
  return Number(distance.toFixed(2));
}
export function grenadeTokenOrigin(token,runtime=globalThis) {
  const context=grenadeMapContext(runtime),document=token?.document??token;
  if(!context||!document?.actor||document.parent?.id!==context.sceneId)return null;
  const center=token.center??document.object?.center;if(!center)return null;
  return {actorId:document.actor.id,tokenId:document.id,...context,x:center.x/context.pixelsPerYard,y:center.y/context.pixelsPerYard,
    // Foundry rotation zero faces south; B414 bearings start north.
    facing:((Number(document.rotation??0)+180)%360+360)%360};
}
export function highlightGrenadePoint(point,{runtime=globalThis,name='olegurps-grenade-target'}={}) {
  const context=grenadeMapContext(runtime),canvas=runtime.canvas,layer=canvas.interface?.grid;
  if(!context||!layer||point?.sceneId!==context.sceneId)return ()=>{};
  const graphic=layer.addHighlightLayer(name);layer.clearHighlightLayer(name);
  const p={x:point.x*context.pixelsPerYard,y:point.y*context.pixelsPerYard};
  const color=Number.parseInt(grenadeUserColor({userId:runtime.game?.user?.id},runtime).slice(1),16);
  if(canvas.grid.type===0)layer.highlightPosition(name,{shape:new runtime.PIXI.Circle(p.x,p.y,10),color,alpha:.12});
  else layer.highlightPosition(name,{...canvas.grid.getTopLeftPoint(canvas.grid.getOffset(p)),color,border:color,alpha:.12});
  return ()=>{if(layer.getHighlightLayer(name)!==graphic)return;layer.destroyHighlightLayer(name);
    if(layer.highlightLayers[name]===graphic)delete layer.highlightLayers[name];};
}
export async function pickGrenadePoint({runtime=globalThis,signal=null,onHover=null}={}) {
  if(signal?.aborted)return null;
  if(!grenadeMapContext(runtime))throw Error('Карта с подтверждёнными единицами недоступна.');
  const canvas=runtime.canvas,view=canvas.app.view??canvas.app.canvas,keyboard=runtime.window??globalThis;
  // Capture before Foundry's tool; palette and active layer remain unchanged.
  const previousCursor=view.style.cursor;view.style.cursor='crosshair';let clearHover=()=>{};
  return new Promise(resolve=>{
    let finished=false;
    const finish=value=>{if(finished)return;finished=true;
      view.removeEventListener('pointerdown',pick,{capture:true});view.removeEventListener('pointermove',hover,{capture:true});
      keyboard.removeEventListener('keydown',cancel,{capture:true});signal?.removeEventListener('abort',abort);
      view.style.cursor=previousCursor;clearHover();resolve(value);};
    const abort=()=>finish(null);
    const cancel=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(null);}};
    const point=e=>{const screen=new runtime.PIXI.Point();canvas.app.renderer.events.mapPositionToPoint(screen,e.clientX,e.clientY);return grenadeMapPoint(canvas.stage.toLocal(screen),runtime);};
    const hover=e=>{e.stopImmediatePropagation();clearHover();const p=point(e);clearHover=highlightGrenadePoint(p,{runtime,name:'olegurps-grenade-hover'});onHover?.(p);};
    const pick=e=>{if(e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();finish(point(e));};
    view.addEventListener('pointerdown',pick,true);view.addEventListener('pointermove',hover,true);
    keyboard.addEventListener('keydown',cancel,true);signal?.addEventListener('abort',abort,{once:true});
  });
}
const actualPoint=event=>event.calculationLocation?.landing??event.detonation?.landing??(event.correction?event.correction.landing:event.defense?event.defense.landing:event.landing);
const ownMarkers=(event,runtime)=>runtime.canvas.scene.drawings.filter(d=>d.getFlag('olegurps-qol','grenadeEvent')===event.id&&d.getFlag('olegurps-qol','grenadeActor')===event.actorId);
export function grenadeThrowerId(event,runtime=globalThis){
  return event.outcome?.userId??runtime.game?.messages?.get(event.outcome?.messageId)?.author?.id??event.userId??null;
}
export function grenadeUserColor(event,runtime=globalThis){
  const color=runtime.game?.users?.get(grenadeThrowerId(event,runtime))?.color;
  const text=String(color??'');return /^#[0-9a-f]{6}$/i.test(text)?text:'#9aa3ad';
}
export function grenadeMarkerPosition(event,scene,scale){
  const point=actualPoint(event);if(!point)return null;
  const pixel={x:point.x*scale,y:point.y*scale},grid=scene.grid;
  if(grid?.type!==0&&typeof grid?.getVertices==='function'&&typeof grid?.getCenterPoint==='function'){
    const offset=grid.getOffset(pixel);return {center:grid.getCenterPoint(offset),vertices:grid.getVertices(offset),offset};
  }
  return {center:pixel,vertices:[],offset:null};
}
export function grenadeMarkerData(event,scene,scale,author,runtime=globalThis){
  const position=grenadeMarkerPosition(event,scene,scale);if(!position)throw Error('Место гранаты ещё не определено.');
  const color=grenadeUserColor(event,runtime),{center,vertices,offset}=position;
  let x=center.x-6,y=center.y-6,shape={type:'e',width:12,height:12},text='';
  if(vertices.length>=3){
    // Drawing width/height are integer fields. Center their enclosing box on the
    // native cell center while retaining the exact fractional hex vertices.
    const width=Math.ceil(Math.max(...vertices.map(p=>p.x))-Math.min(...vertices.map(p=>p.x))),height=Math.ceil(Math.max(...vertices.map(p=>p.y))-Math.min(...vertices.map(p=>p.y)));
    x=center.x-width/2;y=center.y-height/2;
    shape={type:'p',width,height,points:vertices.flatMap(p=>[p.x-x,p.y-y])};text='●';
  }
  // One owned Drawing contains both the cell and its centered marker. Native deletion/F5
  // handles their complete lifecycle together; aiming uses a separate temporary layer.
  return {author,x,y,shape,text,bezierFactor:0,strokeColor:color,strokeAlpha:1,strokeWidth:2,
    fillType:1,fillColor:color,fillAlpha:text.length ? .16 : 1,textColor:color,textAlpha:1,fontFamily:'Arial',fontSize:20,
    flags:{'olegurps-qol':{grenadeEvent:event.id,grenadeActor:event.actorId,grenadeVisual:'cell-marker-v2',grenadeThrower:grenadeThrowerId(event,runtime),grenadeCell:offset}}};
}
export function grenadeEffectAreaData(event,scene,scale,author,runtime=globalThis){
  const visible=runtime.game?.actors?.get(event.actorId)?.getFlag(markerScope,'grenadeAreaVisibility')?.[event.id];
  if(event.theatre||!event.detonation||visible===false||visible!==true&&event.effectAreaEnded)return null;
  if(event.detonation.profile.payloadId==='vortex'&&!event.effectResults?.some(r=>r.state==='done'&&r.result?.family==='vortex'&&r.result.applies===true))return null;
  const radius=event.detonation.profile?.payloadEffect?.radius;if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(scale)||scale<=0)return null;
  const position=grenadeMarkerPosition(event,scene,scale);if(!position)return null;
  const size=Math.ceil(radius*scale*2),color=grenadeUserColor(event,runtime);
  return {author,x:position.center.x-size/2,y:position.center.y-size/2,shape:{type:'e',width:size,height:size},text:'',strokeColor:color,strokeAlpha:.8,strokeWidth:1,fillType:1,fillColor:color,fillAlpha:.055,
    flags:{[markerScope]:{grenadeActor:event.actorId,grenadeEvent:event.id,grenadeVisual:'effect-area-v1',grenadeThrower:grenadeThrowerId(event,runtime),radiusYards:radius,payloadId:event.detonation.profile.payloadId}}};
}
const areaWrites=new WeakMap();
function syncGrenadeEffectArea(event,scene,scale,author,runtime){
  let writes=areaWrites.get(scene);if(!writes){writes=new Map();areaWrites.set(scene,writes);}
  const key=event.actorId+':'+event.id+':'+author;
  const next=(writes.get(key)??Promise.resolve()).catch(()=>{}).then(()=>writeGrenadeEffectArea(event,scene,scale,author,runtime));
  writes.set(key,next);next.finally(()=>{if(writes.get(key)===next)writes.delete(key);}).catch(()=>{});return next;
}
async function writeGrenadeEffectArea(event,scene,scale,author,runtime){
  const areas=scene.drawings.filter(d=>d.getFlag(markerScope,'grenadeActor')===event.actorId&&d.getFlag(markerScope,'grenadeEvent')===event.id&&d.getFlag(markerScope,'grenadeVisual')==='effect-area-v1'&&(d.author?.id??d.author)===author);
  const marker=scene.drawings.find(d=>d.getFlag(markerScope,'grenadeActor')===event.actorId&&d.getFlag(markerScope,'grenadeEvent')===event.id&&d.getFlag(markerScope,'grenadeVisual')!=='effect-area-v1'&&(d.author?.id??d.author)===author);
  const data=marker?grenadeEffectAreaData(event,scene,scale,author,runtime):null;
  if(!data){if(areas.length)await scene.deleteEmbeddedDocuments('Drawing',areas.map(d=>d.id));return;}
  data.x=marker.x+marker.shape.width/2-data.shape.width/2;data.y=marker.y+marker.shape.height/2-data.shape.height/2;
  data.flags[markerScope].grenadeMarkerId=marker.id;
  if(areas.length){const old=areas[0];if(old.x!==data.x||old.y!==data.y||old.shape.width!==data.shape.width||old.shape.height!==data.shape.height||String(old.strokeColor)!==data.strokeColor||old.getFlag(markerScope,'radiusYards')!==data.flags[markerScope].radiusYards||old.getFlag(markerScope,'grenadeMarkerId')!==marker.id)await old.update(data);if(areas.length>1)await scene.deleteEmbeddedDocuments('Drawing',areas.slice(1).map(d=>d.id));}
  else await scene.createEmbeddedDocuments('Drawing',[data]);
}
export async function markGrenade(event,runtime=globalThis) {
  if(event.theatre)return null;
  installGrenadeMapHooks(runtime);
  if(runtime.game.actors&&!runtime.game.actors.get(event.actorId)?.isOwner)return null;
  const context=grenadeMapContext(runtime),point=actualPoint(event);
  if(!point||!context||context.sceneId!==event.map?.sceneId)return null;
  const old=ownMarkers(event,runtime).find(d=>(d.author?.id??d.author)===runtime.game.user.id&&d.getFlag(markerScope,'grenadeVisual')!=='effect-area-v1');
  const data=grenadeMarkerData(event,runtime.canvas.scene,context.pixelsPerYard,runtime.game.user.id,runtime);
  if(old&&!runtime.game.user.can('DRAWING_CREATE')&&grenadeEffectAreaData(event,runtime.canvas.scene,context.pixelsPerYard,runtime.game.user.id,runtime)&&!ownMarkers(event,runtime).some(d=>d.getFlag(markerScope,'grenadeVisual')==='effect-area-v1'&&(d.author?.id??d.author)===runtime.game.user.id))return requestMarker(event,'show',runtime);
  if(old){if((old.author?.id??old.author)!==runtime.game.user.id)return null;
    if(!old.canUserModify(runtime.game.user,'update'))return requestMarker(event,'show',runtime);
    await old.update(data);await syncGrenadeEffectArea(event,runtime.canvas.scene,context.pixelsPerYard,runtime.game.user.id,runtime);return old.id;}
  if(!runtime.game.user.can('DRAWING_CREATE'))return runtime.game.actors?requestMarker(event,'show',runtime):null;
  const [drawing]=await runtime.canvas.scene.createEmbeddedDocuments('Drawing',[data]);await syncGrenadeEffectArea(event,runtime.canvas.scene,context.pixelsPerYard,runtime.game.user.id,runtime);return drawing.id;
}
export async function removeGrenadeMarker(event,runtime=globalThis) {
  if(event.theatre)return false;
  const context=grenadeMapContext(runtime);if(!context||context.sceneId!==event.map?.sceneId)return false;
  const owned=ownMarkers(event,runtime).filter(d=>(d.author?.id??d.author)===runtime.game.user.id);
  if(!owned.length){const pending=runtime.game.actors?.get(event.actorId)?.getFlag(markerScope,markerQueue)?.[event.id];
    return pending?.state==='pending'&&pending.userId===runtime.game.user.id?requestMarker(event,'remove',runtime):false;}
  if(owned.some(d=>!d.canUserModify(runtime.game.user,'delete')))return requestMarker(event,'remove',runtime);
  await runtime.canvas.scene.deleteEmbeddedDocuments('Drawing',owned.map(d=>d.id));return true;
}
export function focusGrenade(event,runtime=globalThis) {
  if(event.theatre)return;
  const context=grenadeMapContext(runtime);
  if(context&&context.sceneId===event.map?.sceneId){const point=grenadeMarkerPosition(event,runtime.canvas.scene,context.pixelsPerYard);if(point)return runtime.canvas.animatePan(point.center);}
}
export function grenadeAreaControl(event,runtime=globalThis){
  if(!event||event.theatre||runtime.game?.user?.getFlag(markerScope,'grenadePreferences')?.theatre!==false)return {available:false,visible:false};
  const context=grenadeMapContext(runtime),scene=runtime.canvas?.scene;
  if(!context||context.sceneId!==event.map?.sceneId||!runtime.game.actors.get(event.actorId)?.isOwner)return {available:false,visible:false};
  const marker=scene.drawings.find(d=>d.getFlag(markerScope,'grenadeActor')===event.actorId&&d.getFlag(markerScope,'grenadeEvent')===event.id&&d.getFlag(markerScope,'grenadeVisual')!=='effect-area-v1'&&(d.author?.id??d.author)===runtime.game.user.id);
  const area=marker&&scene.drawings.find(d=>d.getFlag(markerScope,'grenadeActor')===event.actorId&&d.getFlag(markerScope,'grenadeEvent')===event.id&&d.getFlag(markerScope,'grenadeVisual')==='effect-area-v1'&&(d.author?.id??d.author)===runtime.game.user.id);
  const radius=event.detonation?.profile?.payloadEffect?.radius;
  const eligible=Number.isFinite(radius)&&radius>0&&(event.detonation.profile.payloadId!=='vortex'||event.effectResults?.some(r=>r.state==='done'&&r.result?.family==='vortex'&&r.result.applies===true));
  return {available:!!marker&&eligible,visible:!!area};
}
export async function setGrenadeEffectArea(event,visible,runtime=globalThis){
  if(event.theatre)return false;
  installGrenadeMapHooks(runtime);
  const actor=runtime.game.actors.get(event.actorId);if(!actor?.isOwner)throw Error('Нужны права владельца персонажа.');
  if(!grenadeAreaControl(event,runtime).available)throw Error('Для области нужна действующая отметка взрыва.');
  await withActorResourceWrite(actor,()=>actor.update({['flags.'+markerScope+'.grenadeAreaVisibility.'+event.id]:!!visible}));
  if(!runtime.game.user.can('DRAWING_CREATE'))return requestMarker(event,visible?'area-show':'area-remove',runtime);
  const scene=runtime.canvas.scene;await syncGrenadeEffectArea(event,scene,event.map.pixelsPerYard,runtime.game.user.id,runtime);return true;
}
const mapInstallations=new WeakSet();
export function installGrenadeMapHooks(runtime=globalThis){
  if(!runtime.Hooks?.on||mapInstallations.has(runtime.Hooks))return;mapInstallations.add(runtime.Hooks);
  const changed=async(drawing,changesOrOptions,optionsOrUserId,userId)=>{
    if(drawing.getFlag(markerScope,'grenadeVisual')==='effect-area-v1')return;
    const actorId=drawing.getFlag(markerScope,'grenadeActor'),id=drawing.getFlag(markerScope,'grenadeEvent');if(!actorId||!id)return;
    const author=drawing.author?.id??drawing.author;
    const initiatingUser=typeof optionsOrUserId==='string'?optionsOrUserId:userId;
    const authority=initiatingUser??markerAuthority(runtime)?.id??author;if(authority!==runtime.game.user.id)return;
    const event=runtime.game.actors.get(actorId)?.getFlag(markerScope,'handGrenades')?.events?.find(e=>e.id===id);
    if(!event||event.theatre||runtime.game.user.getFlag(markerScope,'grenadePreferences')?.theatre!==false)return;
    try{await syncGrenadeEffectArea(event,drawing.parent,event.map.pixelsPerYard,author,runtime);}catch(error){runtime.console?.error?.('OleGURPS | Grenade area',error);}
  };
  for(const hook of ['updateDrawing','deleteDrawing'])runtime.Hooks.on(hook,changed);
  const recover=async scene=>{
    if(runtime.game.user.getFlag(markerScope,'grenadePreferences')?.theatre!==false)return;
    const orphaned=scene.drawings.filter(d=>d.getFlag(markerScope,'grenadeVisual')==='effect-area-v1'&&d.getFlag(markerScope,'grenadeActor')&&d.getFlag(markerScope,'grenadeEvent')&&
      !scene.drawings.some(m=>m.getFlag(markerScope,'grenadeVisual')!=='effect-area-v1'&&m.getFlag(markerScope,'grenadeActor')===d.getFlag(markerScope,'grenadeActor')&&m.getFlag(markerScope,'grenadeEvent')===d.getFlag(markerScope,'grenadeEvent')&&(m.author?.id??m.author)===(d.author?.id??d.author))&&
      ((d.author?.id??d.author)===runtime.game.user.id||runtime.game.user.isGM&&markerAuthority(runtime)?.id===runtime.game.user.id)&&d.canUserModify(runtime.game.user,'delete'));
    if(orphaned.length)await scene.deleteEmbeddedDocuments('Drawing',orphaned.map(d=>d.id));
  };
  runtime.Hooks.on('canvasReady',canvas=>{if(runtime.game.user.getFlag(markerScope,'grenadePreferences')?.theatre!==false)return;recover(canvas.scene).catch(error=>runtime.console?.error?.('OleGURPS | Grenade area recovery',error));});
  for(const scene of runtime.game.scenes??[])recover(scene).catch(error=>runtime.console?.error?.('OleGURPS | Grenade area recovery',error));
}
