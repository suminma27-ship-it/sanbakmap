# v161 deployment evidence audit — 2026-11-10 (UTC)

## Immutable inputs and provenance
- Repository: `suminma27-ship-it/sanbakmap`; inspected `main` tree SHA `51940e14da70ae7f62a6212f79a5a38f0cd3c037` (338 tree entries).
- v160 test blob: `tests/nationwide-quantization-threshold-lineage-v160.mjs` Git blob SHA-1 `94739372c33db307064028a9fd6a945191f0e7cc`.
- Successful workflow for code commit `28dc46ab8e9a82ae51623b6466fa40b19d77cb5b`: run `42829360985`, conclusion `success`.
- Failed workflow for audit-document commit `51940e14da70ae7f62a6212f79a5a38f0cd3c037`: run `42829390723`, job `129877485352`, step `Deploy site`.

## Failure isolation
- Artifact upload itself succeeded: `github-pages.zip`, artifact ID `13770702778`, size `18,297,720` bytes, SHA-256 `56d5199fa2d950e196fdc1edc8294183c4d4bbfb0e08f42c4931237e19b7df18` (digest reported by GitHub Actions upload log; not independently rehashed).
- Immediately afterward `actions/deploy-pages@v4` reported `Found 0 artifact(s)` and `No artifacts named "github-pages" were found for this workflow run`. Therefore this is an artifact metadata lookup/deployment failure, **not evidence of a failed nationwide topology test**.
- Retried failed workflow jobs via GitHub Actions API; API returned `success: true`. Subsequent workflow status read: `queued`, conclusion `null` as of 2026-11-10 14:47:51 UTC. **Do not mark deployment successful until a completed/success run is observed.**

## Safety and next acceptance gates
- No original graph/DEM files, overlays, routing/UI, or Hangyeryeong exception were changed. No provisional 35m link approved or merged.
- Next run: read workflow `42829390723` final result and job logs. If failure persists, diagnose artifact visibility and deployment permissions; do not hide failing deploy under passing tests.
- Still blocked: independently obtain and hash original Forestry SHP, original DEM, v102/v129 and original-overlay ZIP; reconstruct candidate IDs and verify 57 high-priority nodes and 36,084 provisional joins. Do not infer permission or walkability from proximity.
- Nationwide coverage (all 2,902 including <200m), 67,185 original edges, quantization, v69 regression, replay hashes, test suite and deployed page must each have independent passing evidence before completion.

This note records GitHub-reported hashes and log observations, not independently verified original-source SHA-256.
