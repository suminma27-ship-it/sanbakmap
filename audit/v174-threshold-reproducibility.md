# v174 — 35 m threshold reproducibility gate (2026-11-11 KST)

Base main observed: `a60d8c8e640925921f8fb2504cc7436e104cc630` (v173). Previous test commit `b7f9dd2b78eb74555a2806ddf7e76764f49e38f9`.

## Executed local deterministic fixture

Metric Euclidean 2D grid size 0.1 m; two independently rounded endpoints imply at most `sqrt(2)*0.1 = 0.14142135623730953 m` pairwise distance error. For quantized distance `q` and threshold 35 m: `q <= 34.85857864376269` is certainly within *distance threshold only*; `q > 35.14142135623731` is certainly outside; remaining cases require original coordinates. Exact-boundary comparisons depend on floating point tolerance; do not approve based on floating-point equality without a documented convention.

Fixture classifications tested with Python assertions: `34.8→within`, `34.9→uncertain`, `35.0→uncertain`, `35.1→uncertain`, `35.2→outside`. All five passed. Canonical compact JSON fixture SHA-256: `9af82dd03224bba655ced84d0f64735d7e0b076226e32e424a118db2d4f15c22`. This hash is of the **derived fixture**, not of the original SHP/DEM.

## Newly explicit safety gates

1. This error bound assumes a **metric Euclidean coordinate system** and nearest-grid rounding independently in each coordinate. If quantization occurred in longitude/latitude or another coordinate system, rederive the bound in the actual CRS and compare geodesic/projected distances before classifying any candidate.
2. A candidate passing the geometric threshold is **not an approved trail**. Independent official route/permission or on-site evidence is mandatory. No candidate was approved here.
3. The connector's combined commit status response for both v173 commits returned an empty statuses list. This **does not prove CI success or failure**; check workflow runs/jobs independently before marking v173 verified.
4. Original SHP, DEM, v102/v129 overlays, v69 regression baseline and per-candidate coordinates were not accessible in this run. Consequently the 57 high-priority nodes, 36,084 provisional candidates, and nationwide 2,902-site / 67,185-edge coverage cannot be independently audited from this fixture. No source hashes were independently recomputed.

## Completion gates / next execution

Recover exact source archives with SHA-256 and CRS metadata; verify 67,185 edges and all 2,902 sites including <=200m; compute original-versus-quantized endpoint membership, cross-component merges/splits and 35m candidate distance classifications; preserve Hangyeryeong confirmed exception; compare against v69 baseline; require tests and Pages deployment checks. Do not alter source graph, DEM, UI or merge/delete candidate edges without evidence. Overall status: **incomplete**.
