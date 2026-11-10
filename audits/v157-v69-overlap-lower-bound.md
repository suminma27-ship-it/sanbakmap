# v157 — v69 0.75m threshold versus provisional 35m candidates

Evidence: `audits/v149-provisional-conservation-gate.json` (144,990 pairs; 108,906 same-node; 36,084 provisional) and v155 recorded threshold totals (109,392 pairs <=0.75m; 35,598 >0.75m). This is an arithmetic set-overlap audit, **not** per-candidate identity evidence.

For subsets A (<=0.75m) and B (provisional), |A ∩ B| >= |A| + |B| - |U| = 109,392 + 36,084 - 144,990 = **486**. Therefore at least 486 provisional candidates lie within 0.75m; their exact identities remain unknown. The valid bounds are:
- provisional <=0.75m: **486–36,084**
- provisional >0.75m: **0–35,598**

The two ranges are coupled (their counts sum to 36,084); their endpoints must not be treated as independently realized. This corrects any interpretation that all provisional candidates necessarily exceed the v69 threshold. It does **not** approve any new trail connection or imply that distance alone establishes physical accessibility.

Automated test: `tests/nationwide-v69-overlap-bounds-v157.mjs`. It computes the SHA-256 of its v149 input bytes, checks both partitions and the overlap bounds, and asserts zero approved links and incomplete status. Source SHP/DEM ZIP hashes were **not** independently recomputed in this run. The test's Actions result must be checked before calling the deployed test green.

Remaining completion gates: obtain the per-pair candidate identity table and source SHP/DEM; review the 57 quantization priority nodes and 36,084 provisional candidates individually; verify per-edge 3D grades, node degree and components, official access and v69 route regression; independently hash raw source files; confirm all 2,902 mountains and 67,185 source edges with CI/deployment. Preserve the Hangyeryeong user-confirmed exception and all original graph/DEM/UI data; do not automatically merge or delete.
