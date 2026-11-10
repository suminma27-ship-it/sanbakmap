# v158 — repository artifact availability and independent-replay gate (2026-11-10)

Read-only GitHub tree inspection of `main` at commit `77b8ed5894339fb2251e5eba807f9deb0e11d1c1` (Git commit tree `0fbeb1c48a80fe383e33807b0a653398b09c999a`). Git tree/object identifiers are **SHA-1 Git object IDs**, not SHA-256 hashes of raw source archives.

## Observed repository artifacts
- Nationwide topology: **16** `data/nationwide-topology/pack-*.js` files.
- Nationwide full preview: **11** `data/nationwide-full/part-*.js` files.
- POI: **32** `data/nationwide-pois/bucket-*.json.gz` files. These are POI buckets, **not** the 32 original-geometry overlay graphs described by v129.
- Repository ZIP objects: only `data/nationwide-elevation-pack/nationwide-dem-v109.zip` (1,601,782 bytes, Git blob `872cf56b7136d1c5b2a9d769a0327ef810e7975d`). It must **not** be mistaken for the nationwide raw DEM source or original SHP ZIP.
- `audits/v129-exact-original-overlay-summary.json` Git blob: `4a19d137b0773542dc99f9682293a624ebbd9c8f`. It reports a **separate** 32-bucket overlay archive with SHA-256 `a672b42904c270c7b8442ae7dd29b64d3efea4ee0a555bd8d60d972222c9b7cb`, but the archive itself is not in this Git tree.
- v140 audit archive SHA-256 is recorded as `a813b28b5f22cb8673348fa42dda1a17ca3548be85b8ac5212a47a3340163b3a`, but its bytes are not present in the inspected tree.

## Audit conclusion / guard
The repository contains published derivatives and summary evidence, but **not** the source ZIP and v129 32-bucket overlay needed to reproduce per-pair identity joins or independently hash source SHP/DEM. Do not infer that 36,084 provisional edges have been individually verified from the 32 POI buckets. The 486 lower bound from v157 is arithmetic only; no pair is automatically v69-eligible without degree/component/grade/uniqueness checks. The 57 priority nodes likewise require raw endpoint-to-edge mapping.

**Gate: BLOCKED ON SOURCE BYTES** for source-independent reproduction and candidate-by-candidate verification. This is not a failure of existing published routing tests; those can continue separately. Search previous conversation uploads / archive storage for the original forest SHP, v102/v129 graph overlay, v140 coordinate archive, and nationwide raw DEM, then compute SHA-256 on the bytes, match recorded provenance, enumerate pair IDs, and run per-node/edge geometry and v69 regressions. Do not reconstruct missing source from published preview and claim source fidelity.

No source, topology, DEM, user-confirmed Hangyeryeong exception, map/UI, or official route status changed; zero new physical links approved. Nationwide 2,902-place and 67,185-edge completion remains **unproven** until source-level and deployed tests pass.
