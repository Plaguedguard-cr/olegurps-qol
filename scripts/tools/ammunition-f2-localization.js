import { russianUI } from "../russian-ui.js";
export const f2Messages = {
  ru: Object.fromEntries(Object.entries(russianUI).filter(([key]) => key.startsWith("OleGURPS.AutomaticAmmo.F2")).map(([key, value]) => [key.slice(25), value])),
  en: {
    LinkedPrimary: "The native primary Damage already resolves the published external blast. Do not add a second blast or infer an internal Follow-Up.",
    rolekinetic: "Primary", rolelinked: "Linked", "rolefollow-up": "Follow-Up", "rolemain-charge": "Main charge", rolefragmentation: "Fragments",
    LinkedExtra: "If the published primary component is already the external blast, do not add another copy. Repeated Damage is not a new hit.",
    NameElements: "Multiple-projectile hits", NameAllocation: "Buck-and-Ball allocation", NameLinked: "Linked external component", NameInternal: "Follow-Up penetration", NameFragments: "Fragment hits", NameTandem: "Tandem and ERA", NameSpall: "HESH spall", NameFalloff: "Thermobaric falloff", NameReliability: "SAPLE fuze reliability", NameFlight: "Self-Destruct flight",
    Local: "GM calculation (this client only)", LocalHint: "Enter this hit’s conditions and click Calculate. Apply the result manually; inputs clear when the card closes.",
    Facts: "Saved facts: physical cartridges — {physical}; fired elements — {elements}; actual hits — {hits}.", Unknown: "unconfirmed", Components: "Saved components", Calculate: "Calculate", Clear: "Clear",
    Result: "Result from GM conditions: {result}. Not applied automatically.", Missing: "Calculation unconfirmed: requires {fields}.",
    Elements: "Resolve each actual hit with its own target, location, Damage and DR in GGA. Do not multiply damage by element count or spend a cartridge per element. Do not repeat Hit. Rubber shot can also cause serious injury.",
    Allocation: "One physical Buck-and-Ball charge: first actual hit is the ball, later hits are pellets. The source does not establish allocation across multiple charges. Native D remains ball damage; the GM resolves pellets.",
    Linked: "Linked is a separate external component with its own defenses and hit conditions. Use saved native components; do not duplicate a published primary blast. Do not transfer carrier AD to Linked.",
    Internal: "Internal Follow-Up requires confirmed carrier hit and penetration. Without penetration, an internal explosion is unconfirmed: resolve the original Follow-Up rule and defenses in GGA. Damage and repeated clicks do not confirm another explosion.",
    Fragments: "Fragment Damage is one hit's damage, not Hit. Select a target, distance from center, posture, SM and cover. Enter an already completed native GGA 3d6 result; this section does not roll or create messages. Resolve locations and DR separately.",
    Tandem: "No ERA: stages can accumulate. With ERA: resolve stages in order. Unknown ERA: no confirmed total. Do not apply both the sum and the stages; Linked remains separate.",
    Spall: "HESH: when neither impact nor blast penetrates nonlaminated armor, spall is one tenth of maximum blast damage against DR/100. Round both up (HT170).",
    Falloff: "Thermobaric at r>0: floor(original Damage/(2×r)). Do not reduce twice or apply GGA Explosion /3r to the reduced value. Contact r=0 and unknown distances require separate adjudication. This result is not applied.",
    Reliability: "SAPLE TL5–6: use a confirmed native 1d result, functioning on ≤ TL−2. TL7+ has no such check. Unknown results do not confirm an explosion; preserve the carrier strike. Repeated Damage does not require another 1d.",
    Flight: "Self-Destruct requires a specific fuse, sourced destruct distance and actual path. Do not substitute ½D. Reaching the distance creates no extra explosion or resource expense.",
    distance: "Distance from center, yards", target: "Specific target (GM input)", sm: "Target SM", posture: "Target posture", cover: "Confirmed cover penalty", total: "Confirmed GGA 3d6 total",
    standing: "Standing", crouching: "Crouching", kneeling: "Kneeling", crawling: "Crawling", sitting: "Sitting", lying: "Lying",
    carrierHit: "Carrier hit confirmed", penetration: "Penetration confirmed", guaranteed: "Eligible Follow-Up confirmed for this target", era: "Reactive armor ERA", precursor: "Original precursor damage", main: "Original main-charge damage", rawConfirmed: "Original results of the correct GGA components, before reduction",
    nonpenetration: "Nonpenetration confirmed", laminated: "Laminated armor", dr: "Original DR", damage: "Original Damage result for this component", tl: "Confirmed SAPLE TL", die: "Confirmed GGA 1d total", path: "Actual projectile path, yards",
    yes: "Yes", no: "No", AllocationResult: "ball: {ball}; pellets: {pellets}; pellet damage: {formula}", HitResult: "hits: {hits}; effective fragment skill: {skill}; danger radius: {radius} yards",
    InternalReady: "GM confirmed internal Follow-Up conditions; check the fuse and resolve the component in GGA", ExternalOnly: "internal blast unconfirmed; original Follow-Up rule and defenses remain GM decisions",
    ERAStages: "ERA: first {precursor}, then {main}; defenses and outcome remain GM decisions", TandemResult: "cumulative damage {damage}, AD(10); Linked separate; do not also apply the stages",
    SpallResult: "Spall damage {damage} cut against DR {dr}. Apply to crew and equipment behind the struck armor.", Laminated: "HESH spall excluded by laminated armor", DamageResult: "auxiliary damage {damage}, divisor {divisor}; defenses and application remain GM decisions",
    FuzeResult: "1d={die}, threshold ≤{threshold}: {state}; carrier strike preserved", triggered: "functioning confirmed by GM", failed: "fuze failed", NoFuzeRoll: "TL7+: no additional reliability check; resolve penetration separately",
    FlightResult: "fuze distance {distance} yards: {state}; comparison only, not blast application", reached: "path reached distance", unreached: "path did not reach distance"
  }
};
import { moduleText } from "../localization.js";
export function f2Text(key, runtime = globalThis, values = {}) {
  return moduleText("OleGURPS.AutomaticAmmo.F2" + key, values, f2Messages.ru[key]);
}
