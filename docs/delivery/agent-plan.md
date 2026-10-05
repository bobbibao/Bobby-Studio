# Bobby Studio autonomous delivery plan

Task definitions below are the plan; the **Current state** and **Status** sections record verified progress. The final target is a production-quality product with simulated external image inference during development, not an unfinished application behind a demo UI.

Read [AGENTS](../../AGENTS.md), [architecture](../architecture/overview.md), [contracts](../architecture/generation-contracts.md), [cleanup inventory](cleanup-plan.md) and [autonomous runbook](autonomous-execution.md). New work is English; existing Vietnamese source copy is migrated in A6.

## Current state

*Update at every milestone boundary. After a restart re-read AGENTS.md and this block, then continue.*

- **Milestone:** A0 to A5 verified (A0 minus the Docker compose path). A6 cleanup and A7 operations in progress. Branch `claude/epic-clarke-f0he4y`.
- **Operations work done alongside A3 (verified, see `docs/delivery/performance.md`):** Redis Socket.IO adapter (cross-replica fanout), bearer-protected `/api/ops/metrics`, structured request logging, `scripts/backup.mjs` (backup + restore verification into a throwaway DB), `tools/load/generation-load.mjs` (0 failures up to 100 concurrent sessions), and `scripts/configure-provider.mjs` / `scripts/provider-smoke.mjs` (configuration-only provider switch validated by the app's own config validators, masked secret input, `*.bak-*` env backups, key rotation that changes only the secret, no request ever made without `--confirm-spend`). Live provider calls remain **unverified** (no credentials).
- **Verified so far:** evidence tables below. API integration suite `yarn --cwd server-api test:integration` (59 tests, real PostgreSQL/Redis/Auth Emulator, disposable DB per run). Stack E2E `cd tools && node_modules/.bin/playwright test` (20 tests: identity, generation API, recovery, studio UI, responsive; needs `node scripts/dev.mjs start`).
- **Next concrete step:** A6: remaining dead-code inventory, project/library persistence and fake-service removal, Vietnamese copy, legacy docs, dependency pruning (worker still lists unused axios/@nestjs/axios/@nestjs/schedule/@prisma/client/@google/genai/lodash/date-fns/class-*), billing/admin route decision.
- **Carry-overs:** library/project APIs still use the legacy `Attribute` JSON model and public GCS-style `path` values; saved generations create `Generated_Image` attributes whose `value.path` is `/api/assets/<id>/content` (relative, needs a signed `access` token), so the library UI must mint signed URLs (A6). `GCSConnector` (service-account based) still serves the legacy upload paths. Live GCS storage adapters (`GcsAssetStorage`) compile but are unverified (no bucket).
- **Blockers / human steps:**
  - The credential-like CMS token that was in `frontend/src/config.ts` is **exposed and must be revoked/rotated by its owner**: it remains in git history (earlier commits) and appeared once in this session's tool output. The browser CMS client and token were removed from source (the CMS data was fetched but never rendered); a production bundle scan found no long hex strings or hardcoded service IPs. Removal does not revoke it.
  - No Firebase cloud project, GCS bucket, OpenAI or Gemini credentials were provided; staging deployment and live-provider verification are outside what can be evidenced (recorded as gaps, not claimed). Vendor documentation sites were unreachable from the sandbox, so adapters were built from official SDK type definitions (see `docs/architecture/provider-simulator.md`).
- **Non-obvious decisions:**
  - No Docker daemon in the cloud sandbox: PostgreSQL 16 / Redis 7 run natively; `docker-compose.dev.yml` is provided for Docker hosts but is **unverified** here. The Firebase Auth Emulator runs from `tools/` (`firebase-tools`, own lockfile) and is verified. `tools/` also holds Playwright.
  - Root `package.json` has scripts only (no dependencies, no lockfile). Always run yarn with `--mutex file:/tmp/.yarn-mutex` when more than one install may run.
  - Compiled API entrypoint is `dist/src/main`. Frontend emulator URL lives in `.env.development.local`; `vite build` (production mode) refuses it and the web bundle throws if it is set outside `import.meta.env.DEV`.
  - Identity is only a verified Firebase ID token. First request provisions the account (no password column value). Global `APP_GUARD`; `@Public()` is the opt-out (health, Stripe webhook, signed-URL image route, worker-credential webhooks). `User.password` is now nullable (additive migration).
  - Asset access for `<img>` uses short-lived HMAC URLs minted only inside authorized responses (`ASSET_URL_SECRET`), never the user token in a URL.
  - The Prisma terminal-state triggers (`ImageJob`, `CreditReservation`) are defense in depth; application code still uses conditional updates.
  - Existing seed deletes and recreates the model catalog: do not run it against real data; replaced in A3.
  - Remaining dead frontend files are inventoried by `tsc` reachability from `main.tsx` and removed in A6; only non-compiling or security-relevant dead code was removed so far.

## Baseline (2026-10-05, commit 82958dc) and A0 evidence

| Check | Baseline | After A0 |
| --- | --- | --- |
| Frontend install | corrupt cache when apps install in parallel | `yarn install --frozen-lockfile` per app, sequential (scripted) |
| Frontend `tsc -p tsconfig.app.json` | 236 errors (181 in app source: missing lib/target/module settings, 20+ stale imports, real bugs such as undefined `userId`, `Box align/justify` ignored at runtime) | **0 errors** |
| Frontend `vite build` | failed: `src/styles.css` never existed | passes (Tailwind entry restored, preflight off because Chakra resets) |
| Frontend tests | Jest with missing Nx preset, sample greeting test | Vitest + jsdom; smoke test passes; Jest/ts-jest removed |
| Frontend lint | script used removed `--ext` flag | `yarn lint`: 0 errors, 463 warnings (ratchet `--max-warnings 500`); 30 hook-order errors fixed |
| API build / typecheck | build passed; `node dist/main` path wrong | `yarn typecheck`, `yarn build` pass; `start:prod` = `node dist/src/main` |
| API lint | `--fix` only; 3065 prettier errors | `yarn lint:check` non-mutating, 0 errors, 162 warnings (prettier rule not enforced on legacy files; new files are formatted) |
| API tests | 2 suites failed (path aliases) | 3 suites pass (incl. 8 config-validation tests, V02) |
| Worker build / lint / test | no ESLint config | `yarn lint:check` 0 errors, 7 warnings; `yarn test` passes with no tests |
| Fresh DB migrations | not run | `prisma migrate deploy` applies both migrations on an empty DB; drift vs `schema.prisma` limited to column defaults (additive fix in A1) |
| Compiled boot | API crashed on Firebase init without service account | API + worker boot from compiled output; `/api/health/ready` and `:3100/health/ready` return 200 only with DB/Redis/storage/API reachable |
| Outage behavior | API process exited after 5 failed Redis reconnects | verified: Redis down → readiness 503, liveness 200, process stays up, readiness recovers when Redis returns |
| External calls | worker defaulted to a public inference host and rewrote localhost URLs to it | defaults and rewrite removed; `loadWorkerConfig` requires loopback base URL for `simulated` mode |

Commands: `node scripts/setup.mjs` (idempotent; `--rotate-secrets`, `--skip-db`, `--skip-install`), `node scripts/dev.mjs start|stop|status [--build] [--only=a,b]`, `node scripts/doctor.mjs [--json]`. Image simulator: not implemented yet (A2); doctor reports it as a warning.

## Status

| Task | Status | Evidence / remaining |
| --- | --- | --- |
| A0 | **verified except**: V01 gate for the image simulator (A2) and Docker-compose path (no daemon available) | table above |
| A1 | **verified** (carry-over: catalog consolidation in A3) | Firebase Auth Emulator end to end: anonymous/forged/bypass-header requests 401, valid token provisions account without password (`test:integration` 25/25); two-user isolation for jobs, history, projects, library prompts, notifications, publishing, sockets; worker credential guard (constant-time); additive migration applies on fresh DB and upgraded dev DB; contract fixtures validated in API (11 tests), worker (6) and frontend (3); Playwright `identity.spec.ts` passes (bearer on every API call, zero third-party requests, zero console errors); prod bundle scan clean |
| A2 | **verified** (adapter wiring into worker lifecycle is A3) | `image-simulator` 61 tests; worker provider suite 48 tests against the real simulator over HTTP; simulator healthy under `dev.mjs`, returns decodable 1024x1024 PNG, wrong key 401; live vendors not contacted |
| A3 | **verified** | Prisma-only catalog (fail-closed; sequelize/cqrs/passport/bcrypt removed), atomic credit ledger, transactional admission (idempotency, revision, supersede, bounded backlog), outbox dispatcher, claim/event fencing, conditional finalize + capture, cancel, retry, save, reconciler, signed asset delivery, `generation.updated` socket hints. Worker rewritten (claim → provider → store → checkpoint → completed; one retry owner; no blind paid retries). API integration 59/59 (concurrent idempotency, cancel/complete race x12, overspend, outbox crash recovery, unknown-outcome, terminal-state trigger, sockets); worker 67 tests (processor against the real simulator); stack E2E: success, transient retry, quota failure, explicit retry, idempotent replay, cancel + isolation, validation, and API SIGKILL during completion with short and long outage (exactly one provider call, one charge) |
| A4 | **verified** | Studio UI and client scheduler under `frontend/src/features/generation`: frontend `tsc` 0 errors, lint 0 errors (444 warnings, baseline 463), 99 unit/integration tests (scheduler with fake timers, canvas, results, drafts, API errors, i18n), production build. Real-browser E2E in `tools/e2e/studio.spec.ts` against the real API, worker, simulator, Auth Emulator: manual prompt generation (charged once, saved, downloaded, restored after reload), realtime previews (debounced, latest wins, off means no submissions, explicit final), sketch (`sketch_to_image`, no base64 in the request), reference (`image_to_image`, invalid type rejected client-side), provider failure (no raw provider text, credits returned, Retry), Stop (server-side cancel, credits returned), offline drop recovered without resubmitting, two-account isolation. Console errors, failed requests, 5xx and third-party hosts asserted clean in every flow |
| A5 | **verified for the studio flows above** (long-run soak and real-device checks not done) | Realtime integration proven through the real socket/REST path; `studio-responsive.spec.ts` checks 390/768/1440 px for horizontal overflow, 44 px mobile targets, tablet settings drawer focus/Escape and the mobile navigation overlay. Screenshots reviewed. Bugs found by these runs and fixed: legacy shell consumed 64 px rail on mobile and clipped the header (now an overlay with hamburger), overlay close button hidden under the navbar (z-index) |
| A6 | in progress | done: auth/identity cleanup, legacy generation pipeline and studio removed, unused worker/API dependencies pruned. Remaining: see Current state |
| A7 | in progress | Dockerfiles, CI workflow and `docs/delivery/deployment.md` written but **unverified** (no Docker daemon); backup/restore, load test and provider activation scripts verified locally. Staging deployment blocked: no cloud target |
| A8 | planned | |

## Dependencies and work ownership

~~~mermaid
flowchart LR
  A0[A0 Reproducible foundation] --> A1[A1 Identity and contracts]
  A1 --> A2[A2 Both provider adapters and simulator]
  A1 --> A3[A3 Durable lifecycle]
  A1 --> A4[A4 Professional studio]
  A2 --> A5[A5 Realtime integration]
  A3 --> A5
  A4 --> A5
  A5 --> A6[A6 Complete product and remove legacy]
  A6 --> A7[A7 Operations and deployment automation]
  A7 --> A8[A8 Final acceptance]
~~~

One agent can execute sequentially. When parallel work is authorized, use an integration/contract owner plus API, worker/provider and frontend owners. After A1, A2/A3/A4 can proceed against frozen interfaces. Never assign concurrent writers to the same schema, migration, lockfile or contract. Worker adapter files belong to A2; worker lifecycle/bootstrap/checkpoints belong to A3, with explicit handoff. Integration owner verifies combined slices continuously.

## A0 — Reproducible foundation

**Dependency:** none. **Owner:** integration. **Scope:** tooling, startup, local infrastructure, doctor/setup scripts and blocking wiring defects.

- Install using each app's Yarn lock; pin a supported Node/Yarn toolchain after checking dependencies. Resolve Nest peer compatibility and compiled-runtime aliases without a blanket major upgrade.
- Fix F01's page/client import, compiler-confirmed stale imports, real frontend app type-check and invalid Nx test scaffolding. No any stubs or broad excludes to hide defects.
- Add non-mutating lint commands and verify build output/start:prod paths. Building is not enough; compiled API and worker must boot.
- Add development Compose/config for real PostgreSQL/Redis and official Firebase Auth Emulator. Make required Redis/DB failures visible through readiness instead of silently disabling generation routes.
- Create idempotent setup/doctor commands that generate local simulator/service secrets, populate ignored env files, validate profiles and wait for health. Distinguish browser-visible and container-internal URLs.
- Configure a shared local asset volume through explicit paths; remove external URL rewriting/default inference calls. Optional cloud modules initialize only when enabled and configured.
- Inventory exposed routes and legacy behavior using the cleanup plan. Record credential-like findings without values and prioritize their removal in A1.

**Deliverable:** repeatable bootstrap, env examples, actual commands and baseline issue list. **Gate:** V01/V02; compiled startup, local DB/Redis/emulator healthy, zero live AI calls. If the simulator is not yet implemented, report unavailable honestly.

## A1 — Real identity, authorization and contract ownership

**Dependency:** A0. **Owner:** API/contract. **Scope:** authentication, generation API/DTO/domain ports, catalog and additive schema/migrations.

- Wire Firebase SDK/Admin verification to emulator and live profiles. Remove custom bypass headers, routes and fabricated Auth objects only after replacement works. Provision users from verified identity; remove fake password behavior.
- Authenticate socket connections, authorize room membership and apply ownership/team ACL to jobs, history, assets, projects and folders. Never trust body userId/cost/provider endpoint.
- Require service authentication on worker claim/callback. Validate DTOs/files and return real failure status; no payload-based bypasses.
- Remove the client CMS credential and privileged browser access; prepare or perform its authorized revocation/rotation. Replace hardcoded service addresses with validated configuration. Do not copy the secret into tests or documentation.
- Freeze versioned public, queue and callback contracts; neutralize generation DTOs while retaining a temporary SDXL mapper. Confirm upload/catalog routes and owner checks.
- Design additive Prisma migrations for sessions, idempotency, outbox, reservations, durable results and output uniqueness. Migrate catalog/entitlement consumers toward one authority, comparing existing data first.
- Introduce conditional state transitions and durable queries. Redis is a projection, not the only result store.

**Deliverable:** verified two-user authorization, contract fixtures and migrations. **Gate:** V03/V04/V11/V19; fresh and upgrade migration checks; API/worker/client compile against the same contract. Secret removal alone does not close revocation if the key is live.

## A2 — OpenAI and Gemini adapters plus HTTP simulator

**Dependency:** A1. **Owner:** worker/provider. **Scope:** provider port/adapters, separate image-simulator app and development integration.

- Implement both production adapters using verified vendor contracts and configurable profiles. Actual paid calls are not needed to implement/verify their serializers, decoders and error policies offline.
- Add one small simulator with two protocol facades: OpenAI Images JSON/multipart and Gemini native generateContent. Both require local API keys; each returns its native supported response/error shapes.
- Use deterministic Sharp-rendered fixtures reflecting prompt/image/settings. No Internet downloads or fabricated business data; label simulated inference in capability metadata.
- Cover auth, validation, permission, quota, throttling/Retry-After, transient failure, timeout, malformed output and safety/no-image scenarios. Do not claim full vendor compatibility.
- Keep the actual adapter code path for simulator/live modes. Remove forced Python/model/LoRA defaults; preserve Python only as an optional capability-checked adapter with no external default calls.
- Establish one retry owner, abort/deadline propagation and unknown paid outcome behavior. Local prompt enhancement is disabled or an explicit local no-op, not an automatic Gemini request on each edit.
- Add simulator to bootstrap/Compose. Document provider/mode/model/endpoint/key activation, including which settings must change and which code remains identical.

**Deliverable:** both adapters and both simulator protocols working through HTTP. **Gate:** V05/V06/V16; valid decodable images, actual key rejection, bounded calls, unsupported fields rejected. Live account/model verification remains clearly identified if no key is available.

## A3 — Durable lifecycle and delivery

**Dependency:** A1; may use agreed fixtures before A2 finishes. **Owner:** API/lifecycle with worker handoff. **Scope:** use cases, Prisma, outbox, checkpoint/post-processing/callback.

- Implement transactional submit + idempotency + outbox; remove DB-error enqueue and insufficient-credit fallbacks. Handle crash before/after enqueue and worker claim racing publisher state updates.
- Reserve/capture/release credits and write output transactionally with uniqueness by job; prevent concurrent overspend and duplicate completion effects.
- Apply terminal-state rules, attempt/run-token/sequence fencing and deterministic cancel-vs-finalize behavior.
- Save provider checkpoints durably and use stable output IDs/object keys. Retry only unfinished steps, never successful inference because upload/callback failed.
- Move callback acknowledgment into the processor; throw on delivery/commit failure. Event listeners only log/measure. Keep failed jobs and checkpoints long enough for recovery.
- Separate logical cancellation from physical termination. Retain capacity until execution is known to have ended; explicitly reconcile uncertain provider outcomes.
- Add bounded reconciliation and reference-aware cleanup for stuck dispatch/delivery, reservations and orphan assets.

**Deliverable:** reliable manual image flow and recoverable failures. **Gate:** V07–V13; API outage during completion still produces exactly one application result/capture after recovery. Do not claim exactly-once external inference.

## A4 — Professional, globally usable studio

**Dependency:** A1. **Owner:** frontend. **Scope:** generation feature, necessary theme changes, navigation compatibility.

- Implement [UI specification](../product/studio-design.md) in React/Chakra. Use the [prototype](../product/studio-prototype.html) as an interaction reference, not production code.
- Deliver workspace shell, prompt/model/capability controls, sketch/reference input, result viewing, version strip and accessible responsive navigation. Keep technical inference controls in Advanced; remove thesis/queue metrics from the creative flow.
- Implement pointer stroke commit, undo/redo, eraser, upload, fit/zoom and comparison where specified. Preserve reference color; preprocess sketches only when the adapter requires it.
- Use English source strings through i18next, Intl formatting, keyboard/IME/touch/reduced-motion support, and clear empty/loading/updating/error/reconnecting/cancelled/expired states.
- Use one server-state cache and feature-local draft. Migrate route wrappers and named API clients without dual ownership of active jobs.
- Make manual submit/cancel/retry/save/download operate on real API responses when A3/A2 are ready. Development fixtures cannot become production fallbacks.

**Deliverable:** integrated manual studio and responsive/a11y evidence. **Gate:** V14/V15/V21 at desktop/tablet/mobile; no component snapshot-test proliferation.

## A5 — Realtime end-to-end integration

**Dependency:** A2 + A3 + A4. **Owner:** integration, frontend and API. **Scope:** scheduler, coalescing, subscriptions/recovery and real browser flow.

- Implement immediate revision identity, debounce/IME/stroke handling, guarded preprocessing/uploads and idempotent submission retries.
- Enforce one physical active + latest pending per session and shared user/provider quotas. Burst input must not create an unbounded queue or hidden paid calls.
- Implement auto off/on, manual flush/pause and cancellation semantics. Explicit finals remain independent of obsolete previews.
- Subscribe with authorization acknowledgment and GET snapshot; reconnect/poll without inventing failed jobs. Keep draft and last image during disruptions.
- Make preview save/retention and final history coherent; replay/reload/logout must not mix users or sessions.
- Run fault scenarios through simulator → worker → API → UI, not synthetic browser statuses. Add a small real E2E suite.

**Deliverable:** functioning core product with simulated inference. **Gate:** V01–V16 as applicable; this is an intermediate milestone, not final product completion.

## A6 — Complete product behavior and retire legacy code

**Dependency:** A5; independent inventory can begin earlier. **Owner:** integration/frontend/API. **Scope:** library/projects/account integration, cleanup, branding and existing-language migration.

- Close every applicable [cleanup item](cleanup-plan.md): fake project CRUD/designs, mock-image selectors, unstable IDs, bypass remnants, duplicate catalog/services, unfinished reducers, obsolete docs/tests and dependencies.
- Complete required project/library operations against persistent APIs: create/rename/delete, organize saved outputs, pagination, download, refresh/restart consistency and ownership. Required features cannot be hidden to claim completion.
- Verify sign-in/out, account identity/preferences, history and quotas. Existing billing/admin/support routes must either be complete and verified when exposed or explicitly deferred/disabled; never fabricate working behavior. Video remains deferred.
- Consolidate Bobby Studio product naming across page metadata, app shell and navigation. Rename internal package identifiers only if necessary and update their consumers deliberately.
- Migrate pre-existing Vietnamese hardcoded source copy, errors, logs and relevant comments to English, retaining vi/de translations and user-authored data. Remove irrelevant ERP/Vue documentation after updating inbound links.
- Validate compiled bundles/import graph for forbidden production fixture/bypass/secret references. Legitimate design constants and licensed examples remain.

**Deliverable:** coherent product with real core operations and a closed cleanup inventory. **Gate:** V19–V22 plus affected lifecycle/browser checks. Timed fake success and unimplemented visible actions are release blockers.

## A7 — Operations, provisioning and deployment automation

**Dependency:** A6; prepare infrastructure scripts earlier where independent. **Owner:** integration/operations. **Scope:** deployment artifacts, secrets/profile setup, observability, recovery and capacity evidence.

- Follow [autonomous runbook](autonomous-execution.md): inspect authorized project/account access, configure Firebase and storage, populate environments/secret stores, request only actual missing access or required approvals. Do not leave routine browser verification to the user.
- Produce repeatable application containers and CI checks, migration/seed procedure, meaningful readiness, graceful shutdown, TLS/proxy/CORS configuration and rollback.
- Use private GCS in the selected real staging/production environment; test authorized access and expiry. Local volume remains a development adapter, not a hidden production dependency.
- Add structured logs and bounded-cardinality metrics for queue age, outbox lag, provider/delivery failures, unknown outcomes, reservations and cleanup.
- Test multiple API/worker replicas with shared fanout/quotas; verify Redis persistence/noeviction, database backup/restore and reference-safe asset retention.
- Load test with fixed-latency simulator; record workload, machine/config, accepted/throttled rate, latency, memory and recovery. No live provider load testing.
- Prepare live OpenAI/Gemini activation without code changes. Execute limited live smoke only with authorized credentials/budget; otherwise record the exact external verification gap.

**Deliverable:** deployable candidate and verified environment/runbook, not just container files. **Gate:** V17/V18/V19; all automated checks relevant to selected staging environment. Account-owner/MFA/billing blockers are explicit, not disguised as completed provisioning.

## A8 — Final acceptance and handover

**Dependency:** A7 and all required cleanup gates. **Owner:** integration/reviewer. **Scope:** clean-environment verification and release decision.

- Bootstrap from a clean checkout/environment using documented commands, with no hidden developer config.
- Run the complete critical user journey and failure matrix against the real application and simulator, using Playwright where useful. Review actual responsive screenshots and keyboard/accessibility results.
- Verify auth/ownership, project/library persistence, reference/sketch inputs, realtime/manual flow, cancellation/retry, downloads/history, reconnect/restart and no unexpected external calls.
- Verify deployment/rollback/restore and configuration validation. Update README/runbooks to actual commands and implementation status; remove obsolete transitional bridges only after callers are migrated.
- Hand over production-quality software even if paid inference credentials are unavailable. Clearly distinguish application acceptance, staging deployment verification, and each vendor's live inference verification. The requested simulated-inference setup is a valid explicit environment, not evidence of real-model quality.
- If a live/public release is in scope and already authorized, perform it and verify. If an external owner action is genuinely required, finish all independent work and present only that concrete remaining step.

**Final acceptance:** A0–A8 implementation/automated gates completed, no known core-path blocker, cleanup closed, configuration-only provider activation, reproducible operating instructions and accurately stated external verification. Do not summarize this as a zero-bug guarantee.

## Agent assignment template

~~~text
Implement A0 from docs/delivery/agent-plan.md for Bobby Studio.
Read AGENTS.md and the source audit; verify current code before changing it.
Complete code, configuration, documentation and the A0 acceptance checks.
Use the autonomous runbook to set up and inspect tools/environments yourself.
Use browser automation for user-visible behavior; do not ask for routine manual testing.
Keep live inference disabled until a selected provider/key/budget is authorized.
Report behavior delivered, commands/results and specific external blockers.
Do not stop at a plan, a compile-only result, or a mocked business service.
~~~

For a complete-project assignment, execute A0 → A1 → A2/A3/A4 → A5 → A6 → A7 → A8, preserving dependencies and ownership. Authorization from the actual user/task governs provisioning, delegation and deployment; do not infer extra permissions from a sample prompt alone.

## Handoff format

Update task/PR/session with status, completed behavior, changed contracts/migrations, executed checks/results, cleanup IDs closed, environment readiness and unresolved external prerequisites. Reuse these documents; do not create a report per command. Keep baseline audit findings as history rather than repeating already-resolved investigations.
