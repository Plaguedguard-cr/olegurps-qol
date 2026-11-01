/** Document and request identities must also work in Foundry HTTP sessions. */
export function generateId(runtime = globalThis, { preferFoundry = false, length = 16 } = {}) {
  if (!preferFoundry && typeof runtime.crypto?.randomUUID === "function") return runtime.crypto.randomUUID();
  const utils = runtime.foundry?.utils ?? globalThis.foundry?.utils;
  if (typeof utils?.randomID === "function") {
    try { return utils.randomID(length); }
    catch (error) {
      // Foundry 14's generator also requires crypto.getRandomValues. Do not
      // hide unrelated failures when that dependency is actually available.
      if (typeof runtime.crypto?.getRandomValues === "function") throw error;
    }
  }
  // Local object/correlation IDs, never credentials. This final fallback also
  // works before Foundry utilities exist and never changes browser globals.
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
