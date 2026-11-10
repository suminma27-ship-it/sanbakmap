# v163 — current HEAD publication and source-byte inventory gate (2026-11-11 KST)

## Independently checked inputs
- GitHub API GET `/repos/suminma27-ship-it/sanbakmap/git/trees/main?recursive=1`: HEAD commit `ffc43209cd92e893b51824e037f234da67568dea`, 326 blob entries (340 tree entries including directories).
- Previous audit input `audits/v162-deployment-outcome-reconciliation-20261111.md`, Git blob SHA-1 `346df2ff4b9edcd4d4dc3ee482264463724d5035`.
- Completion gate input `audits/v146-nationwide-completion-gate.json`, Git blob SHA-1 `17b466e9f78f438ec76c375aa075416c53dbdfd5`; reports 2,902 entities including <=200m and 67,185 edges, but does not independently prove original source replay.
- GET `/repos/suminma27-ship-it/sanbakmap/actions/runs?per_page=5`: latest HEAD workflow `42848233709` at `ffc43209...`, `completed/success` (created 2026-11-10T15:48:37Z). Previous HEAD workflow `42837771857` success; earlier `42829390723` failure remains historical.

## New verification: exact published artifact inventory at v162 HEAD
Enumerated Git tree **blob paths**, not just prior prose summaries. Exact prefix/pattern counts:
- `data/nationwide-topology/pack-*.js`: **16**, pack-00 through pack-15. Sentinel Git blob SHA-1: pack-00 `dc91302ff83dd6406a93d7296cfd5836e3b8a44a`, pack-15 `af9a8da66f2640893b30bd969fb0adfc40d13241`.
- `data/nationwide-full/part-*.js`: **11**, part-00 through part-10. Sentinel blob SHA-1: part-00 `051dab56d6138c549a2f1ac3f5de8a1d8245e592`, part-10 `2084b9f06520d3fd1e5745dbd9e2b6321b65ea3e`.
- `data/nationwide-pois/bucket-*.json.gz`: **32**, bucket-00 through bucket-31. These are POIs, **not** the v129 original-geometry overlays. Sentinel blob SHA-1: bucket-00 `7cf358330f9eb3fc4236b9370c3ef2449109fa7d`, bucket-31 `1b83196aeee1c53c5c643a51960cfba3878a8cf2`.
- Exactly one tracked ZIP: `data/nationwide-elevation-pack/nationwide-dem-v109.zip`, 1,601,782 bytes, blob SHA-1 `872cf56b7136d1c5b2a9d769a0327ef810e7975d`. This derivative **is not** the original nationwide DEM.
- **0** tracked `.shp`, **0** `.tif/.tiff/.vrt`, **0** files under a `data/*overlay*` prefix. This is a repository-tree finding only, not proof that archived uploads never existed.

## Reproducible verification and result
1. GET recursive main tree; assert `sha == ffc43209cd92e893b51824e037f234da67568dea` for this historical snapshot; filter `type == blob`; assert 326 total and the four pattern counts (16,11,32,1).
2. Assert exact first/last shard names, listed sentinel Git blob IDs and 1,601,782-byte ZIP size. Assert no SHP, TIF/TIFF/VRT or `data/*overlay*` tracked paths.
3. GET Actions run 42848233709; assert `head_sha == ffc43209cd92e893b51824e037f234da67568dea`, `status == completed`, `conclusion == success`.
These assertions were evaluated against GitHub connector read results during this run. Git commit/tree/blob SHA-1 values are **identifiers**, not independent SHA-256 of raw input bytes. The previously recorded source/archive SHA-256 references are **not recomputed** here.

## Gate disposition and next work
- **Current published HEAD CI gate: PASS** for v162 HEAD, with no claim that raw nationwide data has been reproduced.
- **Source-byte replay gate: BLOCKED**: original Forestry SHP, full raw DEM, v102/v129 source graph and 32 original overlay buckets, v140 precision archive, and candidate-ID mapping are absent from the inspected repository tree and not available as raw bytes in this run.
- Next: recover these raw archives from prior conversation/library or authorized storage, calculate independent SHA-256, reconstruct 57 priority nodes and 36,084 provisional candidate identities, validate 0.1m quantization and v69 regression. Keep uncertainty provisional; no proximity-only approval.
- No graph/DEM/UI changes, no deletion/merge, no change to Hangyeryeong user-confirmed exception, no below-200m exclusions, and **0 newly authorized permanent joins**. Nationwide completion remains **false**. Recheck CI/Pages on this documentation-only commit before counting it as a passing HEAD.
