import { russianUI } from "../russian-ui.js";
import { ammoEffectText } from "./gga-damage-compatibility.js";
export const explosiveMessages = {
  ru: Object.fromEntries(Object.entries(russianUI).filter(([key]) => key.startsWith("OleGURPS.ExplosiveAmmo.")).map(([key, value]) => [key.slice(23), value])),
  en: {
    P4ConstructionMissing:"The exact load design, chamber or source is unconfirmed; an ordinary cartridge is not an explosive round.",
    P4PayloadMissing:"Complete published damage for the required components is missing. Blast and fragmentation yields are not invented.",
    P4SourceConflict:"The profile does not match the original mode or confirmed load data.",P4TLRequired:"The confirmed design's TL is below this High-Tech variant's minimum.",
    P4PlatformRequired:"The confirmed platform does not support this design.",P4ArmorMissing:"Exact DR and laminated or reactive armor data are required; missing data does not mean no protection.",
    P4DistanceMissing:"A confirmed positive distance from the blast in yards is required.",P4ERARequired:"The GM resolves reactive armor and stage interactions; armor is not bypassed automatically.",
    P4Components:"Explosive load components",P4Primary:"Primary charge",P4Precursor:"Precursor charge",P4Linked:"Linked blast",P4MainCharge:"Second-stage main charge",
    P4Conditions:"Formulas are ready; the GM verifies component hits, armor and additional effects in native Apply Damage.",
    P4LinkedFollowUp:"Linked is a separate external blast with its own DR. Follow-Up follows the carrier hit; an internal explosion requires confirmed penetration. The carrier divisor is not copied to blast or fragments. The GM selects the appropriate Apply Damage conditions.",
    P4Fragmentation:"The fragment button rolls damage for one fragment hit. The GM resolves hit count, distance and protection; no automatic fragment Hit is rolled.",
    P4SAPLEReliability:"SAPLE TL{tl}: the GM rolls 1d6 before detonation; explosion succeeds on {threshold} or less. Selecting a component does not prove detonation.",
    P4HESH:"HESH: if impact and blast both fail to penetrate, apply spall of one tenth maximum blast damage against DR/100, rounding both up. Laminated armor prevents this effect.",
    P4Tandem:"Tandem HEAT stages remain separate. Damage is cumulative without reactive armor; the GM resolves stage interactions and protection with reactive armor. Do not treat both stages as independent internal explosions.",
    P4Thermobaric:"Thermobaric blast damage is divided by 2 x distance in yards. Native GGA Explosion uses 3 x distance and is not changed automatically; the GM must apply the correct divisor. Contact distance needs a separate ruling.",
    P4ht_le:"LE",P4ht_saple:"SAPLE",P4ht_apex:"APEX",P4ht_he:"HE",P4ht_saphe:"SAPHE",P4ht_saphec:"SAPHEC",P4ht_aphex:"APHEX",P4ht_efp:"EFP",P4ht_heat:"HEAT",P4ht_hedp:"HEDP",P4ht_hesh:"HESH",P4ht_ms_heat:"MS-HEAT",P4ht_thermobaric:"Thermobaric",
    Effects: "Additional effects", "unconfirmed-compatibility": "construction compatibility is not confirmed",
    Editor: "Custom APEX / APHEX", Variant: "Construction", Name: "Recipe name",
    ProjectileMass: "Projectile mass, g", ExplosiveMass: "Explosive mass, g", REF: "REF",
    FragmentMass: "Fragment material mass, g", ReferenceMass: "Reference mass, g", ReferenceDice: "Reference damage, d6",
    ReferenceSource: "Calibration source", Source: "Parameter source", SourceKind: "Value provenance",
    GM: "GM", Reference: "Reference", Q: "Q", NeutralQ: "Q = 1 is the neutral assumption of the OleGURPS house model.",
    ModelNotice: "Fragmentation uses the OleGURPS house model, not an official GURPS formula. Explicit masses are required; the 146 g M406 estimate is not measured fragment mass.",
    Save: "Save recipe", Approve: "Approve recipe for this weapon", Revoke: "Revoke GM approval",
    RevisionNotice: "Saving edits the selected user recipe and preserves rounds. A published profile creates a separate user recipe; old attacks remain unchanged.",
    ReferenceConfirmed: "Reference confirmed", GMApproved: "User recipe", Unknown: "Compatibility unknown", Incompatible: "Confirmed incompatible",
    Resolved: "Calculation complete", Unresolved: "Calculation incomplete", Explosion: "Explosion", Fragmentation: "Fragments",
    Incendiary: "APHEX: incendiary — the GM determines ignition conditions; no separate fire damage is assigned.",
    ManualConditions: "The GM determines Follow-Up conditions. Select Explosion, internal explosion and DR handling manually in Apply Damage; these are not enabled automatically.",
    FollowUp: "Follow-up", FollowUpHint: "The GM confirms Follow-Up conditions: one guaranteed hit, others use the normal roll. Penetration and internal explosions are not determined automatically.",
    Guaranteed: "One guaranteed Follow-Up fragment hit", Unavailable: "Component unavailable: {reason}",
    "projectile-mass-required": "positive projectile mass is required",
    "parameter-source-required": "a parameter source is required",
    "explosive-mass-and-ref-required": "positive explosive mass and REF are required",
    "invalid-explosive-mass": "explosive mass must be less than projectile mass",
    "apex-charge-must-be-less-than-five-percent": "APEX explosive mass must be strictly below 5% of projectile mass",
    "fragment-calibration-required": "fragment mass, reference mass, reference damage, source and positive Q are required",
    "invalid-fragment-mass": "fragment material and explosive masses exceed projectile mass",
    "nonfinite-model-result": "calculation does not produce a finite positive result",
    "unusual-model-parameters": "Unusually large parameters or result: check units and calibration.",
    ApprovalScopeRequired: "A confirmed weapon, family and distinct recipe identity are required.",
    ApprovalCannotOverrideProhibition: "User parameters cannot bypass a confirmed technical prohibition.",
    InvalidRecipe: "Invalid or existing recipe identity.",
    IncompleteShot: "Complete valid parameters before firing; an incomplete recipe cannot be calculated."
  }
};
import { moduleText } from "../localization.js";
export function explosiveText(name, runtime = globalThis, language = runtime.game?.i18n?.lang ?? "ru", values = {}) {
  return moduleText("OleGURPS.ExplosiveAmmo." + name, values, explosiveMessages.ru[name] ?? ammoEffectText(name, values, runtime));
}
// Kept for API compatibility: Russian resources are synchronously bundled.
export async function loadExplosiveTranslations() {}
