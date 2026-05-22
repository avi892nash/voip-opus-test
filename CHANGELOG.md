## [1.1.2](https://github.com/avi892nash/voip-opus-test/compare/v1.1.1...v1.1.2) (2026-05-22)


### Bug Fixes

* **web:** migrate eslint to flat config for v10 compatibility ([ed5f6a6](https://github.com/avi892nash/voip-opus-test/commit/ed5f6a6dc63b8cc02d0caabe2719318e4e731671))

## [1.1.1](https://github.com/avi892nash/voip-opus-test/compare/v1.1.0...v1.1.1) (2026-05-21)


### Bug Fixes

* **ci:** bump Node to 22 (semantic-release v25 requires >=22.14.0) ([069a03d](https://github.com/avi892nash/voip-opus-test/commit/069a03dd54e282a604eeda4e29ae650456628637)), closes [#27](https://github.com/avi892nash/voip-opus-test/issues/27)

# [1.1.0](https://github.com/avi892nash/voip-opus-test/compare/v1.0.0...v1.1.0) (2026-05-21)


### Features

* **deb:** auto-update via systemd timer + GitHub releases ([#16](https://github.com/avi892nash/voip-opus-test/issues/16)) ([eee1bed](https://github.com/avi892nash/voip-opus-test/commit/eee1bed14e5cb0b3bf92f47c6f15f828c1cdddbf))

# 1.0.0 (2026-05-21)


### Bug Fixes

* **ci:** commit root package-lock.json for the release job ([#15](https://github.com/avi892nash/voip-opus-test/issues/15)) ([37d3152](https://github.com/avi892nash/voip-opus-test/commit/37d3152dd6e2e2ddd35ae86fb85acd459f3b522a))


### Features

* rebuild as Pi-deployable VoIP + Opus PWA with CI/CD + semantic-release ([868f6c2](https://github.com/avi892nash/voip-opus-test/commit/868f6c2aa9d858d8574bf45ab5019a0567c76177))


### BREAKING CHANGES

* → major.
- One commit on the long-running branch (this one) because the
  iterative history wasn't conventional. Future PRs are expected to
  follow the convention from the start.

## Docs

- README.md — CI + latest-release badges, full "Releasing" section
  with commit-prefix → semver-bump table.
- docs/ARCHITECTURE.md — system map, frontend + backend module tables,
  sequence diagrams for signup / 1:1 calls / 3-person mesh / disconnect.
- docs/PROTOCOL.md — exhaustive WebSocket message reference.
- docs/DEPLOY.md — three paths; Path C is the .deb + Cloudflare Tunnel
  walkthrough.

## Deleted

- intro/, app/, libopus/, tools/, scripts/start.py + demo.py, broken
  tests, Windows-only Opus binaries, stale docs/task.md, stale
  docs/README.md, stale docs/PROJECT_OVERVIEW.md, root duplicate
  sample.wav, leftover CRA scaffold (favicon.ico, logo192.png,
  logo512.png, web/.gitignore).

## Verification (local, before push)

- tsc --noEmit               clean
- eslint                     0 warnings, 0 errors
- pytest server/tests/       21 passing
- vite build                 clean (25 PWA precache entries)
- bash -n on every script    OK
- YAML parse both workflows  OK
- node require() both .cjs   OK

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
