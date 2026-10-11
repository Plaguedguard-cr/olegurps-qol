# Current ammunition compatibility report

Current catalogs: Weapon Reference 5.6, LT 1.2, HT 1.3, UT 2.7. All ready.

HT now evaluates all 64 eligibility_v1 records using structured predicates and source facts. See [ht-v1-3-eligibility-report.md](ht-v1-3-eligibility-report.md) for every option, counts, preservation evidence, changed files and tests.

HT178 retains 33 confirmed firing / 35 undetermined pairs with feeding warnings. UT Paint remains 4/4 compatible. LT/UT and original HT attack, ammo and rocket data are preserved. No interface or gameplay implementation was added.

Final tests: 482/482 PASS, including 89 new eligibility tests. Foundry 14.364 isolated reference services were checked against the actual files; normal full-page startup was not reloaded.

Audits are under docs/audit. HT v1.3 source bytes and both source reviews are preserved; obsolete HT v1.2 is removed. Only the HT pointer changed in Weapon Reference. Historical LT provenance is preserved, not used as a loader path.

No commit/push; other local changes preserved.
