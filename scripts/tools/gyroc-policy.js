// User decision, 2026-10-23. Not an Ultra-Tech erratum.
export const gyrocShotshellExcluded = type => type?.book==='ut' && type.ammoId==='15mm_micromissile' &&
  (type.recipe?.variantId==='ut_shotshell'||type.recipe?.parameters?.warheadVariant==='ut_shotshell');
export const GYROC_SHOTSHELL_REASON='Micromissile + Shotshell запрещено проектным решением пользователя (23.10.2026).';
