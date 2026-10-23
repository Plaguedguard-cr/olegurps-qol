import {CHEMICAL_SUBSTANCES,chemicalAllowed,chemicalProfile} from './biochemical-catalog.js';
export const HT_TEAR_SPRAY_MODE='w6R_sr11lEsrygm0K';
export const htTearSprayType=type=>type?.source==='catalog'&&type.book==='ht'&&type.kind==='chemical-dose'&&type.ammoId==='tear'&&!type.recipe;
export function htTearSprayDamage(raw,type){
 const nativeSafe=htTearSprayType(type),rules=chemicalProfile(CHEMICAL_SUBSTANCES.tear,{delivery:'spray',doses:1});
 rules.chemical={...rules.chemical,source:'HT180',duration:{minutesPerMoF:1},brief:'Два HT−2: отдельно кашель и слепота, MoF минут. HT180.'};
 rules.resistanceEffect={...rules.resistanceEffect,source:'HT180',brief:rules.chemical.brief,chemical:rules.chemical};
 return {status:nativeSafe?'resolved':'unresolved',nativeSafe,reason:nativeSafe?null:'Требуется готовый заряд Tear Gas Spray (HT180).',rawFormula:raw.damage,formula:'spec.',transformations:[],components:[],rules:{...rules,instructionOnly:true,htTearSpray:true,ammunitionSource:'HT180'},support:{manual:[{id:'Biochemical',text:rules.chemical.brief}]}};
}
export const biochemicalDelivery=(type,variantId=type?.recipe?.variantId)=>{
 const id=variantId==='ut_homing'?type?.recipe?.parameters?.warheadVariant:variantId;
 if(['ut_drugged_dart','ut_drugged_ice'].includes(id))return 'injection';
 if(id==='ut_biochemical_aerosol')return 'aerosol';
 if(id==='ut_biochemical_liquid')return 'liquid';
 // HT carriers keep their own already verified construction. No bore-based UT join.
 const definition=type?.recipe?.autoProfile?.definition;
 if(type?.book==='ht'&&definition?.verified&&definition?.filler?.effect?.verified){
  if(id==='ht_poison')return definition.filler.route==='blood'?'injection':'contact-application';
  if(['ht_poison_gas','ht_tear_gas','ht_tear_gas_vomit'].includes(id))return 'aerosol';
  if(id==='ht_liquid')return 'liquid';
 }
 return null;
};
export function chemicalOptions(type){
 const delivery=biochemicalDelivery(type);if(!delivery)return [];
 return Object.values(CHEMICAL_SUBSTANCES).filter(f=>chemicalAllowed(f,delivery));
}
export function attachBiochemicalEffect(damage,type){
 const id=type?.recipe?.parameters?.chemicalId;
 const defaultId={ht_tear_gas:'tear',ht_tear_gas_vomit:'tear_vomit'}[type?.recipe?.variantId];
 if(!id&&!defaultId)return damage;
 const f=CHEMICAL_SUBSTANCES[id??defaultId],delivery=biochemicalDelivery(type);
 if(!chemicalAllowed(f,delivery))return {...damage,nativeSafe:false,status:'unresolved',reason:'Состав несовместим со способом доставки.'};
 const payload=type.recipe.parameters??{},facts=type.recipe.autoProfile?.facts??{};
 const radius=damage.rules?.payload?.radius?.yards??payload.radius?.yards??facts.radius?.yards??null,doses=damage.rules?.doses??facts.doses??1;
 const cost=f.cost==null?null:f.cost*doses;
 const chemicalRadius=f.phase==='slime'&&radius!=null&&payload.radius?.origin!=='manual'?radius/2:radius;
 const rules={...damage.rules,...chemicalProfile(f,{delivery,radius:chemicalRadius,doses}),
  fillerCost:cost,fillerCostUnknown:cost==null,...(Number.isFinite(facts.baseCostPerShot)?{costPerShot:cost==null?null:facts.baseCostPerShot+cost}:{})};
 if(facts.missileEconomics){const e=facts.missileEconomics;rules.missileWarheadCost=cost==null?null:e.warhead+cost;rules.costPerShot=cost==null?null:e.body*(1+(rules.manualHoming?.guidanceSurcharge??rules.manualSEFOP?.guidanceSurcharge??facts.homing?.guidanceSurcharge??0))*((rules.reactionless??payload.reactionless)?2:1)+e.warhead+cost;}
 if(f.phase==='slime'&&payload.radius?.origin!=='manual'&&radius!=null)rules.chemical.directHitOnly=radius/2<1;
 return {...damage,rules,support:{...damage.support,manual:[{id:'Biochemical',text:f.brief}]} };
}
export function chemicalEditorHTML(type,parameters,escape,{campaignTL=null}={}){
 const options=chemicalOptions(type);if(!options.length)return '';
 const selected=parameters?.chemicalId??type.recipe.parameters?.chemicalId??'';
 return `<label>Источниковый состав<select name="ut-chemicalId"><option value="">Произвольный текст — без автоматического эффекта</option>${options.filter(f=>campaignTL==null||f.tl<=campaignTL||f.id===selected).map(f=>`<option value="${escape(f.id)}"${f.id===selected?' selected':''}>${escape(f.name)} (TL${f.tl}${f.superscience?'^':''})</option>`).join('')}</select></label>`;
}
