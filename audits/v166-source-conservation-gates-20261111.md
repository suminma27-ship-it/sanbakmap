# v166 nationwide source conservation audit — 2026-11-11 KST

## Inputs and provenance
Main before change: `6d9d57adb006bf4faafd5c04ebbb3dd370a3108e` (v165). Checked recent v160–v165 commit lineage, the v165 audit, and GitHub-hosted v140/v145/v149 summary JSON. Original Forestry SHP, DEM/TIF/VRT, v102/v129 graph/overlay ZIP and original high-precision coordinates were **not recovered** in this run. Library search returned HTML previews, not raw archives.

Git blob SHA-1 of inputs: v140 `72f78e835c13cac887738a179000b2ef5899bbb3`; v145 `7d326a794710cc8f120dbe402a45180faf4e3a66`; v149 `e070002d58024eafab90c9f760df67120cbcd6a4`. v140 source archive SHA-256 reference `a813b28b5f22cb8673348fa42dda1a17ca3548be85b8ac5212a47a3340163b3a` remains **unverified against original bytes**. The new test calculates SHA-256 of its three JSON inputs when executed.

## Newly automated invariants
Added `tests/nationwide-source-conservation-v166.mjs` at `e775cd208facfbd7a6a0fbc477947509acd1da43`. Assertions require 2,902 mountains, 67,185 original edges, 134,370 endpoint occurrences = 2 × edges, 59,301 covered graph nodes, v149 scope consistency, 108,906 same-node + 36,084 provisional = 144,990 candidates, and component count ordering (3,571 original ≥ 3,410 QC preview ≥ 3,282 all preview). They additionally enforce 57 high-priority conflation nodes and 150 provisional endpoint incidences, 337 grade-checked + 2 grade-missing = 339, Hangyeryeong exception, below-200m inclusion, no source/DEM/UI changes, zero permanent joins, and completion=false.

These are **summary conservation tests**, not raw graph replay, actual hiking-route approval, or evidence that all 36,084 provisional candidates are safe. `riskHeld=11,232` and `unverifiedPlanOnly=16,983` are not assumed to be a disjoint/exhaustive partition. Preview component reduction is not approved physical connectivity.

## Acceptance and next steps
Verify the new test actually runs and passes in GitHub Actions, check v165/v166 Pages outcome, and recover source bytes to independently hash/replay endpoint geometry, 57 priority nodes, 36,084 provisional candidates, v69 regression, DEM, and nationwide coverage. No original graph, DEM, UI, exception, join, deletion, or merge changed. No new permanent links approved. Final completion remains **blocked**.
