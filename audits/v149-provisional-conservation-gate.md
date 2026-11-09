# v149 — Nationwide 35m candidate conservation and safety gate

Verified GitHub `main` at v148 (`e877786c05df540b9f4948640629fcf8406a3a5f`); [v148 CI run 42625297059](https://github.com/suminma27-ship-it/sanbakmap/actions/runs/42625297059) completed **successfully**. This resolves the v147 accessor regression; it does not establish nationwide physical passage.

Cross-version conservation checks now run in CI against v129, v130, v140, v145, and v147:
- 2,902 mountains (including under 200m), 67,185 original edges, 59,301 nodes and 134,370 original edge endpoint occurrences.
- 144,990 source proximity pairs = 108,906 already-same-node pairs + 36,084 provisional edges. Both v130 geometry *types* and *decisions* independently partition the 36,084 provisional set.
- 11,232 geometrically held, 16,983 planning-only, 337 priority 3D-checked with 2 missing heights; 57 source-coordinate priority nodes have 150 **incidences**, not 150 distinct edges.
- Original components 3,571, all-35m *experimental preview* components 3,282, QC preview components 3,410. Neither preview is a validated physical network.

Pinned provenance: source SHA-256 `7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a`; overlay SHA-256 `a672b42904c270c7b8442ae7dd29b64d3efea4ee0a555bd8d60d972222c9b7cb`; v140 audit ZIP SHA-256 `a813b28b5f22cb8673348fa42dda1a17ca3548be85b8ac5212a47a3340163b3a`. These are metadata cross-checks, **not** a new independent hashing of unavailable raw SHP/DEM archives.

The v149 JSON and Node regression test are audit-only. No graph, DEM, UI, official access status, or Hangyeryeong exception changed. No permanent connection approved. The next execution must pursue raw per-edge source geometry, elevations, degree/component and v69 regression; if raw archives remain unavailable, preserve the unknown disposition. **Completion remains false.**
