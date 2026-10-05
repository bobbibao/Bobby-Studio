# Bobby Studio autonomous delivery plan

**All application tasks below are PLANNED.** This session has produced architecture, instructions and an interactive design prototype; it has not completed A0–A8. The final target is a production-quality product with simulated external image inference during development, not an unfinished application behind a demo UI.

Read [AGENTS](../../AGENTS.md), [architecture](../architecture/overview.md), [contracts](../architecture/generation-contracts.md), [cleanup inventory](cleanup-plan.md) and [autonomous runbook](autonomous-execution.md). New work is English; existing Vietnamese source copy is migrated in A6.

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
