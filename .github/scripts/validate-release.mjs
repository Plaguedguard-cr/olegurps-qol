import fs from "node:fs";
import path from "node:path";

const fail = message => {
  console.error(`Release validation failed: ${message}`);
  process.exit(1);
};

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync("module.json", "utf8"));
} catch (error) {
  fail(`module.json is not valid JSON: ${error.message}`);
}

const tag = process.env.GITHUB_REF_NAME ?? "";
const repository = process.env.GITHUB_REPOSITORY ?? "";
const versionPattern = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

if (manifest.id !== "olegurps-qol") fail(`unexpected module id: ${manifest.id}`);
if (!versionPattern.test(String(manifest.version ?? ""))) fail(`invalid version: ${manifest.version}`);
if (tag !== `v${manifest.version}`) fail(`tag ${tag || "<missing>"} does not match module version v${manifest.version}`);
if (!/^[^/]+\/[^/]+$/.test(repository)) fail(`invalid GITHUB_REPOSITORY: ${repository || "<missing>"}`);

const baseUrl = `https://github.com/${repository}`;
const expectedManifest = `${baseUrl}/releases/latest/download/module.json`;
const expectedDownload = `${baseUrl}/releases/download/v${manifest.version}/olegurps-qol-v${manifest.version}.zip`;

if (manifest.url !== baseUrl) fail(`url must be ${baseUrl}`);
if (manifest.manifest !== expectedManifest) fail(`manifest must be ${expectedManifest}`);
if (manifest.download !== expectedDownload) fail(`download must be ${expectedDownload}`);

const declaredFiles = [
  ...(manifest.scripts ?? []),
  ...(manifest.esmodules ?? []),
  ...(manifest.styles ?? []),
  ...(manifest.languages ?? []).map(language => language.path)
].filter(Boolean);

for (const relativePath of declaredFiles) {
  if (!fs.statSync(path.resolve(relativePath), { throwIfNoEntry: false })?.isFile()) {
    fail(`declared runtime file does not exist: ${relativePath}`);
  }
}

for (const pack of manifest.packs ?? []) {
  if (!pack.path || !fs.statSync(path.resolve(pack.path), { throwIfNoEntry: false })?.isDirectory()) {
    fail(`compendium path does not exist: ${pack.path ?? "<missing>"}`);
  }
}

const macroPack = (manifest.packs ?? []).find(pack => pack.name === "macros");
if (!macroPack) fail("Macro compendium is not declared");
if (macroPack.type !== "Macro") fail(`macros pack has type ${macroPack.type}, expected Macro`);
if (macroPack.path !== "packs/macros") fail(`macros pack path must be packs/macros, got ${macroPack.path}`);

for (const requiredDirectory of ["scripts", "packs", "assets"]) {
  if (!fs.statSync(requiredDirectory, { throwIfNoEntry: false })?.isDirectory()) {
    fail(`required runtime directory does not exist: ${requiredDirectory}`);
  }
}

console.log(`Validated OleGURPS QOL ${manifest.version} for ${repository} (${tag}).`);
