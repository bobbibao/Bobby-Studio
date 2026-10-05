# Current source audit

Date: 2026-10-05. Baseline: **82958dc**. The audit traces submit → API → queue → provider → post-processing → callback → UI, plus configuration, authentication, credits and selected project services. It is not a complete audit of every billing/admin feature. Application dependencies/builds were not run; distinguish direct wiring defects from risks requiring runtime reproduction.

## Preserve these foundations

React/Vite/Chakra, NestJS API + worker, BullMQ/Redis, Sharp, PostgreSQL/Prisma and existing generation ports are appropriate foundations. [Domain statuses](../../server-api/src/domain/generation/generation-status.ts), cancellation/retry endpoints, pointer-event sketching and a local storage branch already exist. Improve their ownership, atomicity and lifecycle rather than rebuilding everything.

## Findings

P0: core-flow blocker or authorization/accounting issue. P1: resolve before beta. P2: product/operational cleanup. These are engineering priorities, not exploitation or load-test results.

| ID | Priority | Source evidence | Required correction |
| --- | --- | --- | --- |
| F01 | P0 | [Generation hook](../../frontend/src/hooks/useSdxlGeneration.ts) imports the [feature default](../../frontend/src/features/generation/index.ts), which is a React page, then calls .generate() | Use the named API client; verify an actual submit. |
| F02 | P0 | [Controller](../../server-api/src/modules/image-generation/image-generation.controller.ts) favors body userId; status/result/history are public; cancel/retry omit actor | Principal-derived identity and owner/team checks for every operation and project binding. |
| F03 | P0 | [Gateway](../../server-api/src/modules/image-generation/job-status.gateway.ts) joins arbitrary job rooms; [client](../../frontend/src/utils/socket.ts) sends no auth token | Authenticate handshake and authorize joins/rejoins. |
| F04 | P0 | [Webhook handler](../../server-api/src/modules/image-generation/image-generation.service.ts) has commented secret checks and returns success-shaped error bodies | Required worker auth, payload validation and acknowledgment only after commit. |
| F05 | P0 | [Completion handling](../../server-api/src/modules/image-generation/image-generation.service.ts) sets COMPLETED before output persistence, retries parallel output/credit operations, then swallows errors | Unique result and credit capture in one conditional transaction; no false completion. |
| F06 | P0 | [Worker completed listener](../../worker/src/main.ts) delivers after completion without awaiting; [sender](../../worker/src/services/webhook.service.ts) swallows failures | Retryable, checkpointed delivery inside the processor. |
| F07 | P1 | [Submit service](../../server-api/src/modules/image-generation/image-generation.service.ts) enqueues despite DB failure and before retry payload/metadata persistence | Durable transaction + outbox; no fabricated ID fallback. |
| F08 | P1 | [Repository](../../server-api/src/modules/image-generation/image-generation.repository.ts) updates state unconditionally, disables cache invalidation, swallows some DB failures | Conditional transitions and attempt/version fencing; terminal states cannot regress. |
| F09 | P1 | [Hook](../../frontend/src/hooks/useSdxlGeneration.ts) cancels only browser HTTP; [studio](../../frontend/src/features/admin/pages/admin/generate/components/SdxlStudio/SdxlStudio.tsx) only generates on click | Server cancellation and optional revision-aware realtime scheduler. |
| F10 | P1 | [Socket hook](../../frontend/src/hooks/useJobSocket.ts) marks jobs failed on disconnect; service reads Redis for status | Reconcile from durable REST snapshots; connection loss is not job failure. |
| F11 | P1 | [Provider port](../../worker/src/infrastructure/ai/ai-provider.interface.ts) exposes Python DTOs; [worker wiring](../../worker/src/worker.module.ts) and API fix provider to Python | Neutral port, explicit provider profiles and capability validation. |
| F12 | P1 | [Processor](../../worker/src/processors/python-model.processor.ts) retries HTTP three times and [queue](../../server-api/src/infrastructure/queue/bullmq-generation.queue.ts) retries three times | Up to nine calls for eligible failures; one retry owner and unknown-outcome policy. |
| F13 | P1 | [Bootstrap](../../server-api/src/main.ts) initializes Firebase certificate despite missing config; [module](../../server-api/src/app/app.module.ts) hides generation if Redis absent | Validated environments, official auth emulator, honest readiness. |
| F14 | P0 | [Auth guard](../../server-api/src/modules/auth/auth.guard.ts), [token storage](../../frontend/src/services/auth/tokenStorage.ts), [interceptor](../../frontend/src/services/api/auth.interceptor.ts), [bypass route](../../frontend/src/routes/ProtectedRoutesByPassed.tsx) implement permissive fallback identity | Remove bypass after Firebase emulator/live token paths work; missing credentials fail closed. |
| F15 | P1 | [Storage](../../worker/src/services/storage.service.ts) rewrites localhost to a public host and fetches arbitrary URLs; [post-processing](../../worker/src/processors/post-processing.processor.ts) writes into a sibling app | Configured storage roots, owned assets, bounded allowlisted downloads. |
| F16 | P1 | [Bootstrap](../../server-api/src/main.ts) has 100 MB then 50 MB JSON parsers and no visible global ValidationPipe | Enforced DTO validation and request/image decode limits. |
| F17 | P1 | [Prisma catalog](../../server-api/src/modules/model-catalog/model-catalog.service.ts) and [Sequelize catalog](../../server-api/src/service/model-catalog/model-catalog.service.ts) coexist; modules use Sequelize | Migrate to one Prisma authority with data and caller parity. |
| F18 | P1 | [TS config](../../frontend/tsconfig.json) has empty root include/files; type-check uses tsc --noEmit; [Jest config](../../frontend/jest.config.ts) references an external Nx preset | Real app type-check and self-contained test runner. |
| F19 | P1 | [ImageItem](../../frontend/src/features/admin/pages/admin/project/components/ImageItem.tsx) imports ../@/types; [subscription hook](../../frontend/src/features/admin/pages/admin/profile/hooks/useSubscriptionData.ts) imports nonexistent type paths | Fix compiler-reported stale imports, not any stubs. Ignore commented imports when auditing. |
| F20 | P2 | [Worker](../../worker/src/main.ts) uses a colon in post-processing custom job IDs; lockfile pins BullMQ 5.56.4 | Use hyphens per [BullMQ contract](https://docs.bullmq.io/guide/jobs/job-ids); no claim that the pinned version necessarily throws. |
| F21 | P2 | Worker clamps concurrency to 2–4; gateway has default in-memory adapter | Validated capacity settings and shared Socket.IO fanout when scaling replicas. |
| F22 | P2 | [Studio](../../frontend/src/features/admin/pages/admin/generate/components/SdxlStudio/SdxlStudio.tsx) is 720 lines with thesis/Python defaults; old docs describe ERP/Vue examples | Professional feature split and retirement of irrelevant guidance. |
| F23 | P0 | [Client configuration](../../frontend/src/config.ts) contains hardcoded service IPs and a credential-like CMS token | Treat credential as exposed until owner verifies/revokes it; remove client secret, move privileged CMS access behind API. Do not copy its value into docs/logs. |
| F24 | P1 | [Project service](../../frontend/src/services/project.ts) returns fake folders and timed success for edit/delete; [general service](../../frontend/src/services/index.ts) returns fabricated designs | Real persistence-backed actions or explicit unavailable feature; never synthetic success. |
| F25 | P1 | [Project selector](../../frontend/src/selectors/project.tsx) inserts mock images; project service generates fresh IDs when reading persisted folders/projects | Honest empty states and stable server identities; no fabricated records. |
| F26 | P1 | [Model restrictions](../../frontend/src/hooks/useModelRestrictions.ts), [frontend catalog](../../frontend/src/constants/models.ts), duplicated entitlement paths include permissive fallback rules | Server catalog and fail-closed permission/capability rules; cached UI metadata cannot grant access. |
| F27 | P2 | [App name](../../frontend/src/config/app.ts) says Bobby Frontend; [HTML entry](../../frontend/index.html) has legacy branding and an unconditional third-party chat script | Bobby Studio metadata and configurable approved integrations; no surprise development requests. |
| F28 | P2 | [User slice](../../frontend/src/store/user.ts) has empty reducers; [project reducer](../../frontend/src/reducers/project.ts) has unfinished user-ID logic | Trace callers, implement needed behavior or delete unused code after replacement checks. |

## Limits and follow-through

The Python model server is not in this repo; do not infer its behavior. Local storage fallback and duplicate-completion checks exist, but read-then-write checks do not prove concurrency safety. Mixed Nest majors need peer-dependency and compiled-startup verification, not a speculative blanket upgrade.

No current throughput, inference-quality, API-entitlement or zero-bug claim is justified. The [cleanup inventory](../delivery/cleanup-plan.md) assigns removal/replacement gates; [verification](../delivery/verification.md) defines evidence. This audit remains a baseline record after issues are fixed.
