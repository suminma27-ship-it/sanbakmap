# v164 — v163 HEAD CI/Pages outcome and artifact digest (2026-11-11 KST)

## Verified live GitHub inputs
- GET `/repos/suminma27-ship-it/sanbakmap/git/trees/main?recursive=1`: main HEAD `438828df14dfcd57d84388b4ed70330924fad464`, 341 tree entries. v163 audit document Git blob SHA-1 `9f8b343632f7e90e38b15bb883ebd89d4d242fbc` (4037 bytes).
- GET `/repos/suminma27-ship-it/sanbakmap/actions/runs/42859365068`: `head_sha=438828df14dfcd57d84388b4ed70330924fad464`, `status=completed`, `conclusion=success`, updated `2026-11-10T16:55:43Z`.
- GET `/repos/suminma27-ship-it/sanbakmap/actions/runs/42859365068/jobs?per_page=100`: one `deploy` job, success. `Validate route topology and UI regressions`, `Package website`, `Upload site`, `Deploy site` all success.
- GET `/repos/suminma27-ship-it/sanbakmap/actions/runs/42859365068/artifacts`: `github-pages`, 18,297,732 bytes, not expired, GitHub-reported `sha256:e1010b8f94d25be46874e1e891c1653c6de1ea093d694b98ed1ec7da9d6c412f`.

## New independent gate check
The v163 documentation-only commit's previously unconfirmed CI/Pages run is now **PASS**. Explicit assertions checked: run HEAD equals repository HEAD before this audit commit; run completed/success; deploy job success; all four critical steps success; exactly one named Pages artifact exists, is non-expired and carries a SHA-256 digest. This digest is a GitHub-reported **published artifact digest**, not a recalculated original SHP/DEM input digest. The artifact's bytes were not downloaded in this check.

## Limits and next gate
- This is a **deployment integrity audit**, not a raw graph correction or proof of physical trail access.
- Original Forestry SHP, original DEM/TIF/VRT, v102/v129 raw graph/overlay, and v140 high-precision node source remain unavailable in the inspected repository. Therefore independent source SHA-256 replay, exact quantization topology comparison, 57 priority nodes and 36,084 provisional join identities remain **BLOCKED**.
- Recheck the workflow on this v164 commit. Once raw inputs are accessible, calculate independent SHA-256, reconstruct source node/edge IDs, classify provisional candidates with official evidence and compare v69 regression. No proximity-only permanent joins.
- No UI, graph, DEM, Hangyeryeong exception, below-200m coverage, or route approvals changed. Newly approved permanent joins: **0**. Nationwide completion: **false**.
