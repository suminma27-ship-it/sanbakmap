# v175 — independent threshold classification replay (2026-11-11 KST)

Observed latest main before write: `a1dc9500dc00fae8c6e4b5a4292541ff0ab3382b` (v174). Reviewed repository README blob `d3c7211f023b908fd20385e35bb8397acf97ab2d`, v172 audit blob `5d5ae764d4b0d90bb45bd16e322839263982a176`, and v173 test blob `6676ba67ca462868d566060527a8b70e99d459f5`.

## Independently executed calculation

Using JavaScript, recomputed pairwise metric rounding bound `sqrt(2)*0.1 = 0.14142135623730953 m` and lower/upper threshold bounds `34.85857864376269`, `35.14142135623731` meters. Tested five synthetic quantized distances `[lower-0.001, lower, 35, upper, upper+0.001]` against strict classification predicates `d<lower` (inside), `d>upper` (outside), otherwise ambiguous. Actual classes: `[inside, ambiguous, ambiguous, ambiguous, outside]`. **PASS** against expected classes. This is a fresh independent execution of the threshold logic, **not** execution of the repository's Node test or a GitHub Actions result.

## Distinct risks and completion gates

The five cases are synthetic; none is an actual trail endpoint. Input Git blob SHA-1 identifiers above are repository object references, **not** independently recomputed original SHP/DEM SHA-256. No raw source archive or edge-level v129 overlay was available; no exact-to-quantized component-membership audit, 57-node coordinate inspection, 36,084 candidate-by-candidate validation, v69 baseline comparison, or full 2,902-site / 67,185-edge coverage replay was possible. The connector's commit-workflow-runs endpoint returned no PR-triggered runs for v174; absence of results **cannot establish** CI status for push-triggered workflows.

Next execution: recover original archives and CRS, independently hash bytes, build per-endpoint precise-to-quantized mapping and component split/merge report, classify each provisional candidate with exact distances, validate official route/permission, compare v69 and verify CI + Pages deployment. Preserve all original graph/DEM/UI, <=200m sites, and user-confirmed Hangyeryeong exception; no automatic join, deletion, merge or physical route approval. Overall **incomplete**, new approved connections **0**.
