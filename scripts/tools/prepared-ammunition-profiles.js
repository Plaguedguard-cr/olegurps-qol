// Reviewed reference components and explicitly approved OleGURPS house-model inputs.
// Keep previous revisions here when publishing a replacement so saved magazines retain their identity.
const rifleHouseParameters = {
  projectileMassG: 7.9, ref: 1.4, fragmentMassG: 2,
  referenceMassG: 146, referenceDice: 2, q: 1,
  referenceSource: "User-approved OleGURPS fragment calibration: 146 g / 2d, Q=1 (2026-10-10)",
  source: { kind: "gm", note: "User-approved OleGURPS 7.62x39mm house-model assumptions (2026-10-10); not historical factory cartridge data" }
};
export const PREPARED_AMMUNITION_PROFILES = [{
  id: "ht-50-browning-aphex-published", revision: 1, verified: true,
  book: "ht", ammoId: "ht_50_browning_12_7x99mm", variantId: "ht_aphex",
  modeIds: ["W4EbC4v3uPyORRhTC", "WR0KjQaYwU2kPV2uB"],
  method: "published", origin: "reference", explosion: "1d-2 cr ex", fragmentation: "1d-2 cut",
  facts: { caliberMm: 12.7 },
  source: { kind: "reference", note: "High-Tech: Barrett M82A1 and Browning M2HB APHEX descriptions; published 1d-2 [1d-2] cr ex follow-up",
    url: "https://gametable.pbworks.com/f/GURPS%2B-%2B4th%2BEdition%2B-%2BHigh-Tech.pdf",
    pdfPages: [119, 134] }
}, ...[
  { variantId: "ht_apex", explosiveMassG: 0.316 },
  { variantId: "ht_aphex", explosiveMassG: 0.6 }
].map(({ variantId, explosiveMassG }) => ({
  id: "olegurps-7-62x39mm-" + variantId + "-house", revision: 1, verified: true,
  book: "ht", ammoId: "ht_7_62x39mm", variantId,
  method: "calculated", origin: "calculated", facts: { caliberMm: 7.62 },
  source: { ...rifleHouseParameters.source },
  parameters: { ...rifleHouseParameters, source: { ...rifleHouseParameters.source }, explosiveMassG }
}))];
