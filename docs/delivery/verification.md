# Verification and operations

**Target runbook, not evidence that the application is complete.** The baseline lacked installed application dependencies. Application build, migration and E2E execution have not been verified by the planning changes.

The design prototype was independently checked with JavaScript syntax validation, local-link checks, skill/YAML validation and Chrome/Playwright interaction checks. Prototype evidence is not application acceptance. Temporary verification tooling was installed outside the repository; no application test files or dependencies were added for the planning work.

The English Bobby Studio prototype passed a fresh Chrome/Playwright run on 2026-10-05: manual output, duplicate-save prevention, PNG download, auto-off behavior, burst input, draw/undo/redo, latest pending revision during execution, toggle-off cancellation, Stop, fault/retry, version selection, prompt-only mode, selection reset after new output, and 390/768/1440 px overflow checks. The run recorded no page JavaScript errors or requests outside localhost. Desktop/mobile screenshots were visually inspected. These results do not mark any production V01–V22 gate as complete.

## 1. Reproducible setup and commands

Baseline uses Yarn 1.22.22 with a lockfile per application. After reviewing the target environment:

~~~sh
yarn --cwd frontend install --frozen-lockfile
yarn --cwd server-api install --frozen-lockfile
yarn --cwd worker install --frozen-lockfile
~~~

After A0 fixes configuration, verify actual application compilation:

~~~sh
yarn --cwd frontend tsc --project tsconfig.app.json --noEmit
yarn --cwd frontend build
yarn --cwd server-api prisma:generate
yarn --cwd server-api build
yarn --cwd worker build
~~~

The existing root frontend TS config does not by itself validate app files. Do not suppress errors with broad excludes. Build success does not prove compiled Node resolves aliases or the DB schema is migrated; boot compiled API/worker and verify their dependencies.

API/worker lint scripts currently use --fix; add/use non-mutating checks for verification. Frontend Jest refers to an external Nx preset: replace obsolete scaffolding with one self-contained runner. Prefer the existing Vitest tooling for new frontend behavior checks and Jest for API/worker; do not retain duplicate runners without consumers.

A0/A7 must replace the prospective setup description with actual checked commands for Compose, Firebase Auth Emulator, simulator, migrations, seeding and readiness. Do not run a nonexistent root command merely because a document describes it. See [autonomous execution](autonomous-execution.md).

## 2. Required verification matrix

| ID | Scenario | Acceptance evidence |
| --- | --- | --- |
| V01 | Clean install/build and compiled startup | All app entrypoints resolve; local services ready; no missing imports/aliases |
| V02 | No cloud credentials in development; emulator settings in production | Supported local emulator/simulator flow works; unsafe production profile rejected |
| V03 | User B reads/cancels/retries/downloads/joins A's resources; forged body identity | No disclosure or mutation; principal ownership includes projects/folders/assets |
| V04 | Missing/wrong callback credentials, malformed schema, unknown version | Rejected before effects; valid acknowledgment occurs after durable commit |
| V05 | OpenAI JSON/multipart and Gemini native simulator calls | Real HTTP auth/serialization; valid images with correct dimensions; input affects deterministic output |
| V06 | Auth, validation, quota, throttling, transient failure, timeout, malformed/no-image output | Native error mapped correctly, Retry-After honored, bounded calls, no hidden live fallback |
| V07 | Concurrent identical idempotency keys, key reuse with different input, lost POST response | One logical job/reservation/outbox; correct conflict; same-key replay recovers job |
| V08 | Crash after DB commit before enqueue, after enqueue before published mark | Outbox recovery; no duplicate application effects; checkpoint/claim guards protect inference |
| V09 | Concurrent completion, late progress, stale attempt/sequence | One result/capture, monotonic stateVersion, absorbing terminal status |
| V10 | Cancel before queue, during provider execution and racing finalize | Both transaction orders verified; no resurrection/early slot release; usage accounted separately |
| V11 | Redis projection lost, event before join, reconnect | Durable REST snapshot recovers result; transport loss is not job failure |
| V12 | API down after post-processing; transient storage failure | Recovery produces one result without reinference for delivery/upload failure |
| V13 | Concurrent credit requests and reservation release/capture | No overspend/negative balance; each job has one financial effect |
| V14 | IME, rapid input burst, drawing/undo/clear, uploads completing out of order | Only valid current snapshot can submit/display; no request per pointer move |
| V15 | Auto off/on, manual during auto, Stop, hidden/offline/unmount/logout | Timers/listeners cleaned; no new auto request when off; draft/identity isolation retained |
| V16 | Profile switches simulator → OpenAI/Gemini live | Same adapter code, correct capability/model/key/base URL; actual vendor verification separately recorded |
| V17 | Two API and two worker instances | Authorized room fanout, shared quotas, outbox leases and capacity remain correct |
| V18 | Shutdown/stall/saturation/DB restore/Redis recovery | Accepted intent/result remains recoverable; unknown paid outcome is not retried blindly |
| V19 | Secrets, configuration and production bundle inspection | No embedded privileged keys/bypasses/test fixtures; no unexpected external endpoints; exposed-credential disposition recorded |
| V20 | Project/library create/rename/delete/organize plus refresh/restart | Real persistent changes, stable IDs, cross-user isolation; no fake success or fabricated records |
| V21 | English UI, locale fallback, 390/768/1440 widths, keyboard/touch | No overflow/missing labels; source copy English; user content and legitimate translations preserved |
| V22 | Every visible release action and optional feature flag | Core actions work; deferred features explicitly inactive; no placeholder billing/account/admin success |

## 3. Small meaningful suites

Organize tests by observable behavior and shared setup, not one file per component/class. Initial suite shape:

- One frontend scheduler suite for debounce, revision, composition, cancellation/toggle and network visibility using deterministic timers.
- API authorization/contract integration and lifecycle transaction suites using real local PostgreSQL/Redis for concurrency. Mocking Prisma cannot prove SQL atomicity.
- One worker/provider integration suite against both HTTP simulator facades for serialization, error policy, checkpoint resume and delivery; share scenarios rather than duplicating tests in every class.
- A compact browser E2E suite for authentication, project/library persistence, prompt/sketch/reference → generation → cancel/retry/save/download → reconnect/history. Use one browser runner, preferably Playwright.

Adapt existing catalog/entitlement tests during consolidation. Remove sample greeting tests and unused scaffolds after replacement. Avoid wrapper call-count tests, huge markup snapshots, arbitrary full-coverage targets or extra files that only mirror implementation.

A happy-path smoke cannot replace ownership/race/recovery checks. Manual clicking is not the default acceptance gate when automation can exercise the flow.

## 4. Process-boundary failure matrix

| Failure point | Durable state | Recovery |
| --- | --- | --- |
| API exits before commit | No accepted job | Replay same idempotency key |
| API exits after commit before queue | Job + outbox | Dispatcher lease recovery |
| Redis unavailable/full | Outbox and bounded admission | Readiness/backpressure; bounded publish retry |
| Worker exits before external dispatch | Claim/checkpoint records no dispatch | Safe new attempt |
| Worker exits after dispatch without checkpoint | STARTED / uncertain external outcome | Verified retrieval/idempotency if available; otherwise no blind paid reinference |
| Upload succeeds but callback fails | Stable object key + checkpoint | Retry finalize; later reference-aware orphan cleanup |
| Finalize commits but callback response is lost | Terminal result/reservation | Duplicate acknowledgment, no new effects |
| Socket disconnects | DB snapshot and editor draft | Authorized rejoin + GET/poll |
| Cancel and complete race | Conditional transaction | Winner determines logical state; loser cannot double charge/overwrite |

Redis queues need persistence, noeviction and memory alarms. Separate disposable cache storage when eviction policies conflict. After complete Redis data loss, recover from durable jobs/checkpoints without replaying an uncertain external paid request as if it never happened.

## 5. Performance budgets, not current benchmarks

- Target input feedback under 100 ms and avoid >50 ms main-thread work during drawing on the measured device. Capture traces on a representative desktop and real mobile device.
- Initial debounce 700 ms, minimum preview interval 2 s/user. UI status changes locally without waiting for inference.
- With fixed 800 ms simulator latency, start by targeting p95 acceptance <300 ms and debounce-fire-to-visible <3 s for ten active sessions, documenting worker concurrency and machine configuration. Record violations honestly rather than presenting these as measured guarantees.
- Increase offered load through 1, 10, 50 and 100 concurrent studio sessions with realistic bursts and quotas. Registered users are not jobs/second. Never load-test against paid inference.
- Record offered/accepted/throttled/completed/error rates, p50/p95/p99 stage latency, oldest queued age, RSS/CPU, Redis memory and DB pool utilization. Explain capacity using service time and execution slots.
- Overload must result in bounded queues and explicit retry guidance, not unlimited growth or dropped accepted work. Stale displayed results and duplicate credit captures must be zero in the tested scenarios.

## 6. Observability and release operations

Structured logs: traceId, requestId, jobId, studioSessionId, attemptId, provider, intent, stage, durationMs, errorCode. Never full prompts/images, secrets or signed URLs. Metrics labels must not use user/job IDs.

Minimum metrics: admission/terminal counts, queue depth/age, outbox lag, provider latency/errors, callback retries, unknown outcomes, stale/duplicate drops, active calls, old reservations and orphan bytes. Readiness checks actual configured DB/Redis/storage/provider connectivity without generating a paid image; liveness only indicates the process is alive.

Graceful shutdown stops admission, drains or checkpoints bounded work and closes clients. Staging uses the same build artifacts/config schema as production, with simulated inference explicitly selected. Deploy additively compatible migrations before code; backfill/verify; remove old schema only after all consumers migrate.

Automate container build, selected-environment deployment, TLS/proxy/CORS, migration and rollback. Test PostgreSQL backup restoration in a separate environment and asset/queue recovery. Container files alone do not prove operational readiness.

## 7. Evidence and completion labels

- CORE FLOW VERIFIED: integrated simulator-backed flow passes; this is intermediate.
- PRODUCTION CANDIDATE VERIFIED WITH SIMULATED INFERENCE: A0–A8 application/cleanup/automation checks pass in the recorded environment; core business behavior is real; external inference is intentionally simulated.
- LIVE OPENAI VERIFIED / LIVE GEMINI VERIFIED: named model/account configuration tested with authorized budget; record actual checks and limitations separately.
- DEPLOYMENT VERIFIED: named environment, artifact/version, readiness, smoke and rollback evidence. Do not claim this from local checks.

The final product target does not permit leaving CRUD/auth/UI/workers unfinished because a paid image key is missing. Conversely, no document or mock test proves real-provider entitlement or quality. Report commands, environment, results and genuine remaining external prerequisites without a zero-bug promise.
