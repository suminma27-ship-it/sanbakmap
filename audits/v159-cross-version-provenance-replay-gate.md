# v159 — cross-version source provenance and replay gate (2026-11-10)

Base main: `cd163c97a264e38d5fb880609428be9f9b276178` (v158). Rechecked v129 and v149 directly from GitHub. Queried prior conversation/Library files for mountain.zip, raw forest SHP, v129 original overlay, v140 audit archive and raw DEM: the retrieved matches were HTML preview derivatives, **not verified raw source archives**. A preview is not acceptable for original-coordinate replay.

Inputs (Git blob SHA-1, not source SHA-256): v129 `4a19d137b0773542dc99f9682293a624ebbd9c8f`; v149 `e070002d58024eafab90c9f760df67120cbcd6a4`. Referenced source archive SHA-256: `7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a`; referenced original overlay archive SHA-256: `a672b42904c270c7b8442ae7dd29b64d3efea4ee0a555bd8d60d972222c9b7cb`. These are *references*, not independently recomputed hashes.

Performed 10 direct read-only cross-file checks: source and overlay provenance equal; 2,902-place coverage matches; 108,906+36,084=144,990 candidate partition; 67,185*2=134,370 endpoint occurrences; 3,571 original / 3,282 experimental preview components agree; zero permanent approvals; Hangyeryeong exception retained; below-200m not excluded; completion flag false. **10/10 passed** on retrieved GitHub JSON. These validate only summary consistency, not underlying raw geometry.

Added `tests/nationwide-provenance-replay-gate-v159.mjs` for automated future regression, emitting SHA-256 of the input JSON when executed. GitHub Actions/Node execution of this newly committed test has **not** yet been confirmed. The absent-overlay path assertion is a conservative guard for the named expected directory, not proof that no archive exists in any external storage.

Next: recover original SHP/DEM and 32-bucket v129 overlay bytes, verify actual SHA-256 against recorded references, reconstruct 57 risky node mappings and individual 36,084 candidate IDs, validate degree/component/grade/v69 and official-access evidence. Until then no automatic merge, deletion, source rewrite, route approval or completion declaration. Original graph/DEM/UI unchanged.
