// Foundry 14 uses messageMode/applyMode. Older integrations keep their native API.
export function applyMessageMode(ChatMessage,data,game){
  if(typeof ChatMessage.applyMode==='function')ChatMessage.applyMode(data,game.settings?.get?.('core','messageMode'));
  else {const mode=game.settings?.get?.('core','rollMode');if(mode)ChatMessage.applyRollMode?.(data,mode);}
  return data;
}
