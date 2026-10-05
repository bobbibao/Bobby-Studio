# Bobby Studio

A professional image creation workspace combining prompts, sketches, and reference images. Video generation is a future feature.

Real authentication, persistence, jobs, assets, history, retry, save and download are implemented. Only the external image inference service is replaced during development, by a separately authenticated HTTP simulator that speaks a subset of the OpenAI Images and Gemini `generateContent` protocols. Official local infrastructure emulators (the Firebase Authentication Emulator) support automated verification; they are not application-level bypasses.

**What is and is not verified is recorded in the [agent plan](docs/delivery/agent-plan.md)** (Current state and Status table). Nothing in this repository has been run against a live OpenAI or Gemini account, a real Firebase project, a real GCS bucket or Stripe; see [Not verified](#not-verified).

## Quick start

Requirements: Node.js 20+, Yarn 1.x, and PostgreSQL 16 and Redis 7 either running locally or available through Docker. `node scripts/setup.mjs` explains anything missing.

```bash
node scripts/setup.mjs            # install from lockfiles, generate ignored env files (0600), create DB, migrate, seed
node scripts/doctor.mjs           # validate tools, env names, provider profile and (if running) service health
node scripts/dev.mjs start --build  # Auth Emulator, simulator, API, worker, frontend (reuses infrastructure already listening)
# open http://127.0.0.1:4200 and create an account; local sign-in uses the Firebase Auth Emulator
node scripts/dev.mjs status
node scripts/dev.mjs stop
```

Ports: web 4200, API 3000, worker health 3100, simulator 4010, Auth Emulator 9099. Secrets are generated locally, never printed, and never committed.

## Checks

| What | Command |
| --- | --- |
| API unit tests | `yarn --cwd server-api test` |
| API integration (real PostgreSQL, Redis, Auth Emulator; disposable database) | `yarn --cwd server-api test:integration` |
| Worker tests (include the real simulator over HTTP) | `yarn --cwd worker test` |
| Simulator tests | `yarn --cwd image-simulator test` |
| Frontend type-check, lint, tests, build | `yarn --cwd frontend type-check`, `yarn --cwd frontend lint`, `yarn --cwd frontend test`, `yarn --cwd frontend build` |
| API/worker non-mutating lint and typecheck | `yarn --cwd server-api lint:check`, `yarn --cwd server-api typecheck` (same in `worker`) |
| Browser end to end against the running stack | `cd tools && node_modules/.bin/playwright test` |
| Load test | `node tools/load/generation-load.mjs` (results: [performance](docs/delivery/performance.md)) |
| Backup and restore verification | `node scripts/backup.mjs --out <dir>` then `node scripts/backup.mjs verify <dump>` |

The existing `lint` scripts in the API and worker use `--fix`; use `lint:check` to verify without changing files.

## Switching to live inference

A fake key cannot authenticate to OpenAI or Gemini, and the simulator accepts a local key only at its own endpoint. Live activation is configuration only: provider, mode, model, endpoint and secret. The provider is never inferred from a key prefix, and nothing silently falls back to a live provider.

```bash
node scripts/configure-provider.mjs --provider openai --mode live --model <vendor-model-id>   # masked key prompt, validated, previous files backed up
node scripts/provider-smoke.mjs --confirm-spend                                                 # exactly one billable request
node scripts/configure-provider.mjs --rotate-key                                                # routine rotation changes only the secret
node scripts/configure-provider.mjs --provider openai --mode simulated                          # back to the simulator
```

Restart the API and worker after changing the profile. Details, the deployed-environment equivalent and rollback are in [deployment](docs/delivery/deployment.md).

## Documents

| Purpose | Document |
| --- | --- |
| Architecture, boundaries, patterns, conventions | [Architecture overview](docs/architecture/overview.md) |
| Public API, realtime, worker and provider protocols | [Generation contracts](docs/architecture/generation-contracts.md) |
| HTTP image simulator and provider adapters | [Provider simulator](docs/architecture/provider-simulator.md) |
| Deployment, configuration mapping, release and rollback | [Deployment](docs/delivery/deployment.md) |
| Measured throughput and latency | [Performance](docs/delivery/performance.md) |
| Implementation sequence, verified status, known gaps | [Agent delivery plan](docs/delivery/agent-plan.md) |
| Legacy cleanup inventory and closure status | [Cleanup plan](docs/delivery/cleanup-plan.md) |
| Environment, Firebase, credentials and autonomous verification | [Autonomous execution runbook](docs/delivery/autonomous-execution.md) |
| Checks, failure cases and release gates | [Verification](docs/delivery/verification.md) |
| Baseline findings (historical, before the work above) | [Source audit](docs/architecture/source-audit.md) |
| Professional studio experience | [UI specification](docs/product/studio-design.md) · [Interactive prototype](docs/product/studio-prototype.html) |
| Repository instructions and reusable workflow | [AGENTS.md](AGENTS.md) · [Generation skill](.agents/skills/bobby-generation/SKILL.md) |

## Product commitments

- Prompt, sketch + prompt, and reference + prompt generation.
- Optional realtime with debounce, bounded in-flight work, server-side cancellation, and protection against stale results.
- OpenAI and Gemini adapters, each exercised through the corresponding simulator protocol, with no production UI or business-logic fork for simulated inference.
- Real account isolation, history, retry, save and download. No fabricated business records or successful responses for unimplemented actions.
- English for all new code comments, documentation, UI source copy, errors, and logs; existing `vi` and `de` translations are kept.

## Not verified

- Any live OpenAI or Gemini call (adapters were built from official SDK type definitions and tested against the simulator).
- A real Firebase project, a real GCS bucket (adapters are checked against a local fake of the JSON API), Stripe flows, and any cloud or staging deployment.
- Docker image builds and the CI workflow (no Docker daemon was available where this was built).
- Project and library create/rename/delete through the browser, and real-device, screen-reader and long-soak behavior.

## Human steps outstanding

- Revoke or rotate the credential-like CMS token that was once embedded in the web client. It was removed from source but remains in git history and was printed once in a working session, so treat it as exposed until its owner revokes it.
- Provide Firebase/GCP project access, a private GCS bucket and live provider credentials with a budget, if live verification or a staging deployment is wanted.

The repository folder and historical package identifiers have not been renamed; the product name is **Bobby Studio**.
