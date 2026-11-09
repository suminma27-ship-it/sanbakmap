# v148 — v147 CI evidence-path regression fix

The v147 deploy CI run [42614333694](https://github.com/suminma27-ship-it/sanbakmap/actions/runs/42614333694) failed in `tests/nationwide-provisional-evidence-coverage-v147.mjs` at line 8. The v129 JSON stores the overlay package SHA-256 at top-level `overlayPackageSha256`, not at `output.overlayPackageSha256` (the `output` field is a human-readable string). This was a test accessor bug, not evidence of a source data mismatch.

Correct the accessor and preserve every other assertion. In particular, v147 source archive SHA-256 remains `7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a` and graph overlay SHA-256 remains `a672b42904c270c7b8442ae7dd29b64d3efea4ee0a555bd8d60d972222c9b7cb`. Both are pinned in v147 and v129 audit metadata. No SHP, DEM, graph, map, Hangyeryeong exception, candidate disposition, or UI modification was made.

This is a **CI blocker repair**, not completion of the nationwide per-edge grade and official-access audits. The new commit's workflow must pass before treating the v147 coverage gate as deployed. Pending work remains the 57 priority source-node checks, 35m candidates' source-grounded grade/degree/component checks, and official legal passage evidence.
