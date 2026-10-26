import { projectLTBowSourceData } from './lt-bow-source.js';
import { projectLTPersonalSourceData } from './lt-personal-source.js';
import {projectLTEarlyFirearmsSource} from './lt-early-firearms-source.js';
import {projectLTArtillerySource} from './lt-artillery-source.js';
import {projectLTFlameSource,ltFlameProfile} from './lt-flame-source.js';
import {projectLTCrossbowUtility} from './lt-crossbow-utility-source.js';
import {projectLTRangedExecutionPolicy} from './lt-ranged-execution-policy.js';
// Low-Tech source projection for LT-P1b/P2. Original JSON/GCS and historical shot profiles remain unchanged.
// Exact mode/equipment identities; values checked against LT76-77,81-82,87-89. No ST mechanics.
export const LT_RANGED_BASELINES = Object.freeze([
  {"modeId":"WiQNALmY3-6VRXnXY","equipmentId":"ehbq3XMkJxIU60wS8","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WJu2Z4zwQ9NFqc5Km","equipmentId":"ehbq3XMkJxIU60wS8","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"W5TNQWnLaM0EvaZwK","equipmentId":"ejzN2HZQ2kyGVEKNz","source":"LT83","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WUGC7s4EJ_mYffi3H","equipmentId":"eQGq6k5rbqQz_KwmN","source":"LT83","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WHm2NbM8FdpkrepQR","equipmentId":"eRvDduNLq6YJWnGMg","source":"LT83","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WKpzIbv50y67GMjMq","equipmentId":"e0WPmjsY3V2yHAm2M","source":"LT83","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WD7iZ_sU7XylHwqN_","equipmentId":"ezsPC1CjmIOv-Hg3f","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WQiw6nornpsdGHCov","equipmentId":"ej-C1vqAdSnwD4nQg","source":"LT76","stats":{"accuracy":"0"},"previous":{"accuracy":null},"rclNotApplicable":true},
  {"modeId":"WL7CmYMQsVEm-e2XJ","equipmentId":"eN-OkDp86ufSWaXn6","source":"LT76","stats":{"accuracy":"0"},"previous":{"accuracy":null},"rclNotApplicable":true},
  {"modeId":"WtqrhaQ4JBSXuIeyg","equipmentId":"eKPBObWzRN5w7bnh1","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WofsykiukDG6DrXBB","equipmentId":"ebM68sA9cP1shwII6","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WvGuW2iUJrxKGNrHM","equipmentId":"eAD26Ved2UDzVyF6Y","source":"LT83","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"Wf9D7K1uIf9a1YFcF","equipmentId":"eAXVk_AXSV6SGXds2","source":"LT86","stats":{},"previous":{},"rclNotApplicable":true,"jetDeferred":true},
  {"modeId":"WxBwICnOg7tP-Gqfq","equipmentId":"eWvZx-TNfAV_kvUDq","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WHwsNi90Y4m49YOzg","equipmentId":"et037R0p5-GC4PLm4","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WM_7xi8TwSxpRihZ2","equipmentId":"eEkk6WpqrCj5KoCNQ","source":"LT77","stats":{"accuracy":"0"},"previous":{"accuracy":null},"rclNotApplicable":true},
  {"modeId":"Wlxe2_8BiREGT_6TB","equipmentId":"eSOtTYHTtotFif7ly","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WUT0gfmvp1m0cFJGL","equipmentId":"eY5X7wZEb_oGlYi3t","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WWH0OQJ-rgb1mROw-","equipmentId":"ei-7pEkzpbZ6rVdVz","source":"LT86","stats":{},"previous":{},"rclNotApplicable":true,"jetDeferred":true},
  {"modeId":"WmWAtzBOn5-B5IvhJ","equipmentId":"e-uKG55FIFbCnAky_","source":"LT86","stats":{},"previous":{},"rclNotApplicable":true,"jetDeferred":true},
  {"modeId":"WOtCDhbkzhdvewbDK","equipmentId":"enkB2mLPJ3zmnmYrQ","source":"LT86","stats":{},"previous":{},"rclNotApplicable":true,"jetDeferred":true},
  {"modeId":"WVvwyyO4VoyeTryRo","equipmentId":"ehUod7ZjN_ufLmip8","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"Ws0Es7ZR78_sIW-uP","equipmentId":"eh46iljxxsZ1UhqGv","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WJORKREFCHlwtcROT","equipmentId":"eLMadXvd-l99hQHlD","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"Wl_Q7exUelWCfo0Ga","equipmentId":"eVGqW67Wj3KmybMVN","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"W04WeGwpSVXBrCCCw","equipmentId":"e-vSXirgD31Jj55u_","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WqrX0vMt5n6kLV5mq","equipmentId":"eyFzn-BFYhzHXAAXt","source":"LT77","stats":{"strength":"6"},"previous":{"strength":"5"},"rclNotApplicable":true},
  {"modeId":"WEG0MRykkKI4AzUzD","equipmentId":"ena5PvKRBs2aSnpEt","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"W4PRplvj0ypVOdY6s","equipmentId":"ei0N-icgR3T51RL0k","source":"LT86","stats":{},"previous":{},"rclNotApplicable":true,"jetDeferred":true},
  {"modeId":"W666IAfB0ft-hoH3z","equipmentId":"ekHIDinjTY_Oqkw2K","source":"LT77","stats":{"range":"x1.5/x2.5"},"previous":{"range":"x1.5/x1.75"},"rclNotApplicable":true},
  {"modeId":"Wbeu-Rh82UeIe7Gqs","equipmentId":"ezjgs0iC8JAk19X0Z","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"W4A2YqblVK_LoJh0L","equipmentId":"exm4FaVMtZYJ0xJMN","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"W9_OmSPoA9CK9Ge1M","equipmentId":"e4Cqh4R-bWl7CS7dQ","source":"LT77","stats":{"accuracy":"0"},"previous":{"accuracy":null},"rclNotApplicable":true},
  {"modeId":"W8f7fOdKN4ZBmhYrh","equipmentId":"eE8_Dy15zRaLiEs45","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WxT1QaWNJoCXVhDOG","equipmentId":"ezsJcg7MdbH3xWJ-X","source":"LT76","stats":{"accuracy":"0"},"previous":{"accuracy":null},"rclNotApplicable":true},
  {"modeId":"WqUeIOkvQIgCeKWou","equipmentId":"ewTu5wIeeuRsiyO5l","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WJLaTFUJHSN-6pM_k","equipmentId":"en-fdeTeZmFoFeRDl","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WPn4rW6HE64VST_pm","equipmentId":"eoV_w5IcnBVZFrv6Y","source":"LT76","stats":{"bulk":"-8"},"previous":{"bulk":"-6"},"rclNotApplicable":true},
  {"modeId":"Wdn9cVYekaOlUeQnQ","equipmentId":"eweIjEOO_GWpBIg4C","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WEccMSldVWlEmz-AU","equipmentId":"e7VpdzOU88AVMPPy7","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WnqU4wFdAaHmghhfn","equipmentId":"ethb_9uh_gX8DvHU6","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"Wjy-E-qXjBlmT-V5z","equipmentId":"eEbv9yXUKqcIRJoRt","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WwpI_P5DL8za5501B","equipmentId":"e90I0NpBlzXUqA9Vy","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WPNX4pByD7gohEd6f","equipmentId":"eNROYfnjT1DYJkdkS","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WLLYK8pXkZ87jxOB-","equipmentId":"edWyoRhbknJaNvsTK","source":"LT77","stats":{"accuracy":"0"},"previous":{"accuracy":null},"rclNotApplicable":true},
  {"modeId":"Wipc49tj5CGUW2u1Z","equipmentId":"ePbtQ1cKyeuU7_wPU","source":"LT83","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WeHxrM0WiwSIkqOhR","equipmentId":"eC56fIT76EA6Ulf5L","source":"LT83","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WdMI3ek-qxYwJ05JU","equipmentId":"eDAFJzp4N5rXYFVh1","source":"LT83","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WCUkJUmXxsGLdGrEc","equipmentId":"etN6lwCl-IHVBA5AR","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"Wak71wpexyuS6wOgQ","equipmentId":"eFvi4od7BjgdMLnpc","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"Wt63kR2Ebkr9chL4b","equipmentId":"eagFqPQa18YmSVdJu","source":"LT76","stats":{"accuracy":"0"},"previous":{"accuracy":null},"rclNotApplicable":true},
  {"modeId":"W11eNBa3voVFCsgWv","equipmentId":"eUWsJGYIOS5hRIC3Z","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WFAwJH7XlIK-bIy0Q","equipmentId":"eUWsJGYIOS5hRIC3Z","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WwEfzHtEktP_7pGQJ","equipmentId":"ee1kRIRXHzUdofj74","source":"LT77","stats":{"accuracy":"0"},"previous":{"accuracy":null},"rclNotApplicable":true},
  {"modeId":"WHR31ryZU3AjwHqmw","equipmentId":"eOJFIXvUSkQk5KC2f","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"W1i_YQwOXwfSsNi87","equipmentId":"euFuvEaABw1ncQz2M","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WhuLczmoJXSQgBzGz","equipmentId":"elbJwTmAPdiWFj-Mg","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WSeSXfbUXTcrrZXGD","equipmentId":"emViZt-5rQnxGAIVU","source":"LT77","stats":{"bulk":"0"},"previous":{"bulk":null},"rclNotApplicable":true},
  {"modeId":"Wu1wX2lpPMDtA5FNi","equipmentId":"eyvtiiimEqgyXYWaU","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WyBRd-s6EQ7s2ls_a","equipmentId":"enjD63xIeaGU_03QB","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WjjbiXtJUu9FPc31Z","equipmentId":"edBYbyqTMO4WubN7W","source":"LT77","stats":{"bulk":"0"},"previous":{"bulk":null},"rclNotApplicable":true},
  {"modeId":"WoPZ6WfjRMTWppGsv","equipmentId":"e4vmwyvGiD7CFh3Vl","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"W_OizRQv4WHBPSYIf","equipmentId":"eWOkljQnuFOlvvblh","source":"LT77","stats":{"bulk":"0"},"previous":{"bulk":null},"rclNotApplicable":true},
  {"modeId":"WrowHYC-dAZA488wu","equipmentId":"egFCiRwXHfTTs_Y47","source":"LT77","stats":{"accuracy":"0"},"previous":{"accuracy":null},"rclNotApplicable":true},
  {"modeId":"WHHB1FrefOB5s-4aP","equipmentId":"eO0B7K0gkgSAdLyQR","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"W8IyQCWWhWneTzs48","equipmentId":"ek2DWesEupFg8hTVR","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WO60e2cUBoUzSuKLd","equipmentId":"enzUzuxESLCS0HUZs","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WHdOJqxV7QhQcqk6H","equipmentId":"eS-ANKpu6RBtWJYtk","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"Wt-bMJQAZnEeMXWiA","equipmentId":"eThe4Cu9ga2pmfjJ2","source":"LT76","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"Wo3FP4KhrHj4Ovw39","equipmentId":"e3m2R0EN6occeIRSW","source":"LT77","stats":{"accuracy":"0","bulk":"-2"},"previous":{"accuracy":null,"bulk":"-1"},"rclNotApplicable":true},
  {"modeId":"WTsaH0A-_oG-k93sT","equipmentId":"e2iRKQHG9mWXhyKis","source":"LT77","stats":{},"previous":{},"rclNotApplicable":true},
  {"modeId":"WAd5_TDslv9AXFyLs","equipmentId":"eDP0QnXWi8PKDdBjP","source":"LT87","stats":{"accuracy":"0"},"previous":{"accuracy":null}},
  {"modeId":"WYkHC34-KuQjgMNb-","equipmentId":"eo7GTDW6_KuJf1Brn","source":"LT82","stats":{},"previous":{},"bulkValues":[-12,-15]},
  {"modeId":"W99LmoR-3mwDRYY_2","equipmentId":"eYPDrJOfRmA6AIOQy","source":"LT82","stats":{},"previous":{},"bulkValues":[-14,-18]},
  {"modeId":"WQ-acgyhAxGxutQQq","equipmentId":"eKkg3IJ5llqdYhIMx","source":"LT82","stats":{},"previous":{},"bulkValues":[-16,-20]},
  {"modeId":"WQazt507venteh0Yq","equipmentId":"eKI5Z9-hofeB6sjhT","source":"LT82","stats":{},"previous":{},"bulkValues":[-18,-22]},
  {"modeId":"W6okrp1tUXYYdRJkW","equipmentId":"egfLS3acIU3_WUawq","source":"LT82","stats":{},"previous":{},"bulkValues":[-15,-19]},
  {"modeId":"WfBDjYyWLVcm9IqYO","equipmentId":"eriGoNLrz27w2JoCT","source":"LT82","stats":{},"previous":{},"bulkValues":[-16,-21]},
  {"modeId":"W4PYHnE0if9L3zath","equipmentId":"eoKhn5ACRKnBzh7IQ","source":"LT82","stats":{},"previous":{},"bulkValues":[-15,-20]},
  {"modeId":"WSik01Y7KOYRybDzf","equipmentId":"eqZpfnML8Ezx4oY2t","source":"LT82","stats":{},"previous":{},"bulkValues":[-11,-14]},
  {"modeId":"WUK8gvtaJNSdDQ4HE","equipmentId":"eNU0URA5A6s6deatA","source":"LT82","stats":{},"previous":{},"bulkValues":[-21,-26]},
  {"modeId":"WJE44M7Ljte5q0PJw","equipmentId":"eZzP3PDKdR84iTQCN","source":"LT82","stats":{},"previous":{},"bulkValues":[-19,-24]},
  {"modeId":"WXaJ_qgZAeRV_LccJ","equipmentId":"eE4yf3W58v7gSKaus","source":"LT82","stats":{},"previous":{},"bulkValues":[-22,-27]},
  {"modeId":"WAjiOb3-A2JjSxsxf","equipmentId":"esmQLx8SSD1SKltQ1","source":"LT82","stats":{},"previous":{},"bulkValues":[-20,-25]},
  {"modeId":"W-RYCc6uU-OXKoBah","equipmentId":"eBb63oflrM1tY0UwT","source":"LT82","stats":{"rate_of_fire":"1x10","strength":"82M\u2020","bulk":"-14"},"previous":{"rate_of_fire":null,"strength":null,"bulk":null}},
  {"modeId":"WKsEc93SimNUgXPWc","equipmentId":"eCmTyl83THlghtmEl","source":"LT82","stats":{"rate_of_fire":"1x15","strength":"100M\u2020","bulk":"-14"},"previous":{"rate_of_fire":null,"strength":null,"bulk":null}},
  {"modeId":"WXMj2wr9SMXV2QbWx","equipmentId":"enYM4j919XyO2gc1T","source":"LT82","stats":{"rate_of_fire":"1x20","strength":"116M\u2020","bulk":"-15"},"previous":{"rate_of_fire":null,"strength":null,"bulk":null}},
  {"modeId":"Wz7rrcb1JQBbvlq8t","equipmentId":"e2IA1J1m4TrMSre7r","source":"LT82","stats":{"rate_of_fire":"1x30","strength":"143M\u2020","bulk":"-15"},"previous":{"rate_of_fire":null,"strength":null,"bulk":null}},
  {"modeId":"WER8WRUSBxLneb6MY","equipmentId":"el5X3eDOKEit1sOZX","source":"LT82","stats":{"rate_of_fire":"1x60","strength":"200M\u2020","bulk":"-17"},"previous":{"rate_of_fire":null,"strength":null,"bulk":null}},
  {"modeId":"WdEDlxCiYeL4uSuUU","equipmentId":"emxvkBtlI5-FepMhq","source":"LT82","stats":{"rate_of_fire":"1x180","strength":"350M\u2020","bulk":"-25"},"previous":{"rate_of_fire":null,"strength":null,"bulk":null}},
  {"modeId":"WS7SJUj_6I5AIBmpi","equipmentId":"efM7VE2ERRgdUpsAH","source":"LT82","stats":{"rate_of_fire":"1x2"},"previous":{"rate_of_fire":null}},
  {"modeId":"WXLhR6qAupk40x1vV","equipmentId":"eERSJptdTrUhViqRJ","source":"LT88","stats":{"recoil":"1"},"previous":{"recoil":"1/5"}},
  {"modeId":"WFiGuhETQ5MGheGwO","equipmentId":"eTuv8WfYTc5EsMMId","source":"LT88","stats":{"recoil":"1"},"previous":{"recoil":"1/4"}},
  {"modeId":"WDgJJrXmNb2ltlJ8G","equipmentId":"e2IA1J1m4TrMSre7r","source":"LT82","stats":{},"previous":{},"skillFields":{"governing_skill":{"status":"resolved","skill":{"name":"Gunner","specialization":"Catapult","modifier":0},"candidates":[{"name":"Gunner","specialization":"Catapult","modifier":0}],"basis":"unique unmodified skill default"},"governing_skill_selection":{"strategy":"fixed","candidates":[{"name":"Gunner","specialization":"Catapult","modifier":0}],"fallback_attribute":null},"defaults":[{"type":"dx","modifier":-4},{"type":"skill","name":"Gunner","specialization":"Catapult","modifier":0},{"type":"skill","name":"Gunner","specialization":null,"modifier":-4}]},"previousSkillFields":{"governing_skill":{"status":"none","skill":null,"candidates":[],"basis":"no skill default"},"governing_skill_selection":{"strategy":"manual-or-default-only","candidates":[],"attribute_defaults":[]},"defaults":[]}}

].map(Object.freeze));
const byMode = new Map(LT_RANGED_BASELINES.map(p => [p.modeId,p]));
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
/** Mutates only the detached source view or read-through definition, never persisted owner data. */
export function applyLTSourceMode(mode, equipment) {
  const p=byMode.get(mode?.weapon_mode_id);
  if(!p||equipment?.source!=='LT'||equipment.equipment_id!==p.equipmentId)return mode;
  for(const [field,value] of Object.entries(p.stats))
    if(equal(mode.stats[field],p.previous[field])||equal(mode.stats[field],value))mode.stats[field]=structuredClone(value);
  for(const [field,value] of Object.entries(p.skillFields??{}))
    if(equal(mode[field],p.previousSkillFields[field])||equal(mode[field],value))mode[field]=structuredClone(value);
  mode.lt_ranged_contract={source:p.source,rclNotApplicable:p.rclNotApplicable===true,
    ...(p.bulkValues?{bulkValues:[...p.bulkValues],bulkSource:'LT81-82'}:{}),
    ...(p.jetDeferred&&!ltFlameProfile(p.modeId)?{jetDeferred:true}:{})};
  return mode;
}
export function projectLTSourceData(book,data) {
  projectLTBowSourceData(book,data);
  projectLTPersonalSourceData(book,data);
  projectLTEarlyFirearmsSource(book,data);
  projectLTArtillerySource(book,data);
  if(book==='weapons')for(const equipment of data.equipment??[])if(equipment.source==='LT')
    for(const mode of equipment.modes??[])applyLTSourceMode(mode,equipment);
  projectLTFlameSource(book,data);
  projectLTCrossbowUtility(book,data);
  projectLTRangedExecutionPolicy(book,data);
  return data;
}

/** A bound native attack may still contain the old import value. Explicit owner overrides stay authoritative. */
export function projectLTAttackStats(modeId, raw, overrides = null) {
  const p=byMode.get(modeId);
  if(!p)return raw;
  const result={...raw},fields={accuracy:'acc',bulk:'bulk',rate_of_fire:'rof',strength:'st',recoil:'rcl',range:'range'};
  for(const [field,value]of Object.entries(p.stats)) {
    const key=fields[field];if(!key||overrides?.[key]!==undefined)continue;
    if(String(raw[key]??'')===String(p.previous[field]??''))result[key]=value;
  }
  return result;
}
