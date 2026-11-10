# v165 — v164 HEAD deployment verification (2026-11-11 KST)

## Verified inputs (GitHub REST, read on 2026-11-11)
- Repository: `suminma27-ship-it/sanbakmap`, branch `main`, HEAD commit `ac5c37b9410d22098f93c6bb8875da78d11ef8db`; recursive tree: 342 entries. Git tree API returned HEAD commit as tree identifier; it is not a raw-data SHA-256.
- Recent commit sequence checked: v160 `28dc46ab` / `51940e14`, v161 `20d1b60d`, v162 `ffc43209`, v163 `438828df`, v164 `ac5c37b`.
- GitHub Actions run [42868759973](https://github.com/suminma27-ship-it/sanbakmap/actions/runs/42868759973): `head_sha=ac5c37b9410d22098f93c6bb8875da78d11ef8db`, `status=completed`, `conclusion=success`.
- Run jobs endpoint: one `deploy` job with `conclusion=success`. `Validate route topology and UI regressions`, `Package website`, `Upload site`, `Deploy site` all concluded success.
- Run artifacts endpoint: `github-pages` artifact, 18,297,777 bytes, `expired=false`, GitHub-reported `sha256:e47c2ce53a9a1b8db6ae688a1ff42f6d76f7fe36dd2c644ea1bff35f16c76ec2`.

## v165 verification and interpretation
All six deployment evidence gates passed: (1) run SHA equals pre-audit main HEAD; (2) run completed; (3) overall conclusion success; (4) deploy job success; (5) all four critical job steps success; (6) nonexpired Pages artifact with reported SHA-256. This independently closes the previously pending **v164 commit CI/Pages outcome**, but does not establish source-graph fidelity or field legality. Artifact SHA-256 is supplied by GitHub, **not** independently recomputed from downloaded bytes.

## Remaining hard gates and safe next action
- Original Forestry SHP, DEM/TIF/VRT, v102/v129 original graph/overlay, and high-precision source coordinates are not available in the examined repository tree. The previously supplied source ZIPs were not obtained in this execution. Source-file hashes, original-vs-0.1m quantization disconnection/false-join replay, and the identity/evidence classification of 36,084 provisional joins therefore remain blocked.
- Preserve nationwide 2,902-place scope including elevations <=200m and all 67,185 original edges; these are prior audit reference counts, not independently replayed this execution.
- Next run: check this v165 commit's own CI/Pages result; if source files become accessible, compute SHA-256 for each raw file and deterministic reconstruction of high-precision endpoints; test 57 priority nodes, then 35m candidate identity/evidence, v69 regression, and nationwide completeness. No proximity-only approval, automatic deletion or merge.
- Graph, DEM, UI, Hangyeryeong user-confirmed exception and approved joins were not modified by this audit. New permanent joins approved: **0**. Nationwide final completion: **false**.
