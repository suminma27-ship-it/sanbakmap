# v162 deployment outcome reconciliation — 2026-11-11 (KST)

## Read-only input identifiers and evidence
- Repository: `suminma27-ship-it/sanbakmap`; observed main HEAD `20d1b60d86a798a8b6b9da7715cc0d8369f04bed` (v161).
- Input audit file `audits/v161-deployment-evidence-20261110.md` (v161); earlier v160 audit commit `51940e14da70ae7f62a6212f79a5a38f0cd3c037`.
- Failed workflow `42829390723`, head `51940e14da70ae7f62a6212f79a5a38f0cd3c037`: **completed/failure** after retry, attempt 2. The retry did **not** repair that run.
- Newer workflow `42837771857`, head `20d1b60d86a798a8b6b9da7715cc0d8369f04bed`: **completed/success**. Deploy job conclusion `success`; each of `Validate route topology and UI regressions`, `Package website`, `Upload site`, and `Deploy site` concluded `success`.
- GitHub-reported previous Pages artifact SHA-256 `56d5199fa2d950e196fdc1edc8294183c4d4bbfb0e08f42c4931237e19b7df18` (run 42829390723, not rehashed). Commit SHA and Git blob SHA-1 are immutable input identifiers, **not** original-data SHA-256.

## Verified result and non-conclusions
- v161 HEAD has passing CI and a successful Pages deployment job, resolving the *current HEAD deployment gate* that was open in v161. The v160 audit-commit workflow remains failed historically and must not be reported as a successful retry.
- This is **not** proof that 2,902 mountain/park datasets and 67,185 source edges are losslessly replayable. Original Forestry SHP, original DEM, v102/v129 overlays and individual candidate-ID mapping were not obtained in this audit. No original-data SHA-256 was independently recomputed.
- This audit changes **only this documentation**. No graph, DEM, routing/UI, Hangyeryeong exception, provisional join, or permission/walkability status changed; 0 newly approved joins.

## Reproducible automated verification
GitHub API GET `/repos/suminma27-ship-it/sanbakmap/actions/runs/42829390723`: assert `status == completed && conclusion == failure && run_attempt == 2`.
GET `/repos/suminma27-ship-it/sanbakmap/actions/runs/42837771857`: assert `status == completed && conclusion == success && head_sha == 20d1b60d86a798a8b6b9da7715cc0d8369f04bed`.
GET `/repos/suminma27-ship-it/sanbakmap/actions/runs/42837771857/jobs`: assert deploy job and its validation, packaging, upload, and deploy steps all conclude `success`. All these assertions were checked against connector responses in this run.

## Remaining acceptance gates
1. Locate original SHP/DEM/v102/v129/3D/audit ZIP and compute independent SHA-256 and repeatable output manifests; do not substitute source-reference strings for bytes.
2. Reconstruct individual 36,084 provisional 35m joins and verify 57 high-risk quantization nodes against full precision; classify uncertainty without auto-approving proximity.
3. Independently establish all 2,902 entities (including under 200m), 67,185 original edges, v69 regression and Hangyeryeong exception preservation.
4. Recheck Actions and Pages for the **new** documentation-only HEAD. Mark nationwide cleanup complete only after all independent gates pass.
