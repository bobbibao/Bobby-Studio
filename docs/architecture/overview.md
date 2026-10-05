# Bobby Studio architecture

**Status: proposed implementation, not a completed system.** [Source evidence](source-audit.md), [contracts](generation-contracts.md), [delivery sequence](../delivery/agent-plan.md), and [cleanup inventory](../delivery/cleanup-plan.md) are maintained together.

## 1. Completion target

Deliver a professional, globally usable image studio, not a demo application. Authentication, authorization, projects, history, credits, persistence, assets and recovery must run through real application services. The development-only image simulator replaces external inference at the HTTP boundary. It must not replace these business services with fake success responses.

Realtime means automatically requesting an updated image after committed input changes. It does not promise frame-by-frame inference or subsecond output from every provider. Provider image streaming is a separate optional capability. Video remains deferred.

A million registered users is a product ambition, not a capacity claim. Size infrastructure using measured active sessions, request rate, service time, quotas, queue age and memory.

## 2. Keep the existing topology

~~~mermaid
flowchart LR
  UI[React / Vite / Chakra Studio] -->|Authenticated HTTP| API[NestJS modular API]
  UI <-->|Socket.IO notifications| API
  API --> DB[(PostgreSQL / Prisma)]
  DB --> O[Outbox dispatcher in API]
  O --> Q[(Redis / BullMQ)]
  Q --> W[NestJS worker]
  W --> A[OpenAI or Gemini adapter]
  A -->|development profile| M[HTTP image simulator]
  A -->|live profile| P[Selected image provider]
  W --> S[Asset storage]
  W -->|Authenticated acknowledged callback| API
  API -->|Owned asset access| S
~~~

Keep React 18, Vite, Chakra UI 2, TanStack Query, i18next, NestJS, BullMQ, Redis, Prisma/PostgreSQL and Sharp. Keep the existing two processing queues initially. Add a small NestJS + Sharp image-simulator process for development/CI, rather than another product microservice or a second application backend.

Do not introduce Kafka, Kubernetes, event sourcing, sharding, a new frontend framework or a generic workflow engine without measured requirements. Existing Python integration becomes an optional, capability-checked adapter; its model, URL and thesis defaults must no longer control the product.

## 3. Clean architecture boundaries

| Layer | Owns | Must not own |
| --- | --- | --- |
| Controllers, gateways, Nest modules | Authentication, DTO validation, transport mapping, DI composition | Provider calls, credit transactions, domain policies |
| Generation application handlers | Submit, cancel, retry, finalize; ports and transaction coordination | HTTP exceptions, SDK payloads, concrete ORM queries |
| Generation domain | State transitions, input identity, capability policies, typed errors | Nest decorators, Redis, Prisma, provider SDK types |
| Infrastructure | Prisma repositories, BullMQ, cache, provider/storage adapters | UI state or user identity from untrusted payloads |
| Worker processors | Provider invocation, durable checkpoint, post-processing, callback | Trusting client prices, browser state, duplicated billing rules |
| Frontend generation feature | Editor draft, scheduler, API client, server-state projection | Provider secrets, direct inference calls, credit authority |

Reuse [existing CQRS handlers](../../server-api/src/application/generation/handlers) and ports. Move one use case at a time out of the [large generation service](../../server-api/src/modules/image-generation/image-generation.service.ts). Keep a temporary compatibility facade while migrating callers, with an explicit removal gate. Do not add another stack of forwarding services.

The [provider port](../../worker/src/infrastructure/ai/ai-provider.interface.ts) must use neutral input/output types, not Python connector DTOs. Registry selection is static code + validated catalog data, never eval/dynamic imports from a database connectorFunction string.

## 4. Established patterns and concrete use

| Pattern | Application | Boundary |
| --- | --- | --- |
| Ports and Adapters / Dependency Inversion | Repository, queue, image, storage interfaces | Add interfaces at genuine boundaries, not for every class |
| Strategy + Adapter | OpenAI/Gemini/Python serializers selected by profile | Each protocol retains its real capabilities |
| CQRS | Commands mutate, queries read snapshots/history | One database; no event sourcing requirement |
| Finite state machine | Explicit transitions and absorbing terminal states | Pure functions suffice; no new state-machine dependency required |
| Debounce, coalescing, backpressure | Latest pending preview and bounded executions | Established mechanisms, not a newly invented pattern |
| Idempotent consumer, optimistic concurrency | Unique effects and conditional transitions | No exactly-once claim for external paid inference |
| Transactional outbox, polling publisher | Commit job and enqueue intent together | One table and a small API poller, not CDC infrastructure |
| Checkpoint and step retry | Resume upload/delivery without repeating inference | Unknown external outcomes require reconciliation |
| Cache-aside | Redis projection, PostgreSQL fallback | Cache loss cannot erase job history |

References: [NestJS CQRS](https://docs.nestjs.com/recipes/cqrs), [Ports and Adapters](https://alistair.cockburn.us/hexagonal-architecture/), [BullMQ idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs), [Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html). Bobby-specific limits and composition are engineering proposals, not claims of deployment at another company's scale.

## 5. Persistence and transaction invariants

Use PostgreSQL/Prisma as the durable authority. Consolidate the duplicate Sequelize catalog/entitlement path incrementally, comparing IDs, model capabilities, prices, plan rules and migration history first. Do not rewrite applied migrations or delete historical records.

| Record | Proposed changes |
| --- | --- |
| Existing ImageRequest | idempotencyKey, inputHash; unique userId + key |
| Existing ImageJob | studioSessionId, clientRevision, intent, stateVersion, attemptId, lastEventSequence, result, errorCode, expiresAt, cancellationRequestedAt, executionFinishedAt; versioned provider checkpoint/usage |
| New StudioSession | Owner, latest accepted revision, active job, pending job; transactional admission across replicas |
| New GenerationOutbox | Unique event, job, schema version, small payload, nextAttemptAt, publishedAt, bounded lease |
| New CreditReservation | Unique job, amount, RESERVED/CAPTURED/RELEASED; reuse existing balance |
| Existing Attribute/output mapping | Uniqueness by job + output index; reuse project/library representation after reviewing existing data |

Store input images as owned assets. Queue payloads, outbox and history contain references, not base64. Use an existing asset model if it can represent owner and lifecycle; only add a separate table when justified. A signed URL is temporary access, not permanent identity.

**Submit:** validate owner/capabilities → lock or conditionally update session and balance → create request/job, reservation and outbox → commit → return 202. Simulation has explicit zero external cost, not a credit-bypass branch. Database failure returns unavailable; never enqueue a fabricated durable ID.

**Finalize:** load owner/cost from the stored job → validate attempt/version/state → write unique result + capture reservation + COMPLETED in one transaction → commit → cache/socket. Duplicate callbacks cannot charge twice. A read-before-write status check alone is insufficient.

**Cancel:** set CANCELLED and reason, remove undispatched intent/pending preview, release unused reservation. Retain physical execution capacity until the worker/reconciler confirms termination. Late results cannot resurrect state; provider usage and executionFinishedAt may still be recorded. Product policy: capture user credits only for accepted successful results. Record any provider cost from cancellation separately and enforce limits against repeated cancellation abuse.

## 6. Durable worker flow

1. The API outbox poller claims short batches with row locking and a bounded lease. It does not hold a SQL transaction across Redis calls. Stable job IDs use hyphens, not colons. A crash between enqueue and published marking can redeliver; the worker checks durable state before inference.
2. Worker claim uses an authenticated internal API and returns an attempt/run token plus checkpoint. Terminal jobs skip. BullMQ owns execution locks; do not build a second distributed lock framework. Old tokens cannot finalize a newer attempt.
3. Before inference, persist STARTED and correlation information. After receiving the image, persist an object-key/digest checkpoint and SUCCEEDED attempt outcome. If a crash leaves STARTED without a checkpoint and the provider has no verified retrieval/idempotency guarantee, record PROVIDER_OUTCOME_UNKNOWN and stop automatic paid reinference.
4. BullMQ owns retry policy; adapters and SDKs do not independently multiply attempts. Respect deadline, Retry-After, quota classification and uncertain outcomes.
5. Post-processing uses stable output IDs and object keys. Send and acknowledge completion inside a retryable processor before marking the step completed. Callback failures throw; retries reuse saved output instead of invoking the model again.
6. A bounded reconciler repairs pending dispatch/delivery and diagnoses stale attempts. Retain failed jobs/checkpoints for replay. Event listeners are telemetry, not the only path to durable completion.

## 7. Realtime and client state

Keep Socket.IO with authenticated handshake and authorized room joins. Events carry job/revision/version identity. REST snapshots recover late joins, reconnects and cache loss; [Socket.IO does not provide durable replay by default](https://socket.io/docs/v4/delivery-guarantees).

TanStack Query owns server state in the new studio. Prompt/strokes/tool selection are draft state in hooks/components; introduce a feature store only when multiple panels need it. Legacy Redux can remain for unrelated screens during migration, with a one-way bridge and removal gate rather than two active job authorities.

Increment desiredRevision before asynchronous preprocessing/upload. Gate all asynchronous outcomes by snapshot identity. Preserve the last successful image while updating. Update one job query per event and invalidate balance/history once per new terminal transition; do not refetch entire projects on each progress message.

## 8. Configuration profiles and production parity

| Concern | Development/CI | Production |
| --- | --- | --- |
| Authentication | Official Firebase Auth Emulator, real SDK/token/guard path | Firebase Auth, configured project and authorized domains |
| Database/queue | Real local PostgreSQL/Redis | Managed or operated PostgreSQL/Redis with backups/persistence |
| Storage | Configured shared local volume through storage port | Private GCS through the same port and short-lived access |
| Image inference | OpenAI/Gemini HTTP protocol simulator with local key | Selected provider's actual endpoint, model and key |
| Business operations | Real persistence and authorization | Same implementation |
| Optional billing/email | Disabled by explicit capability or legitimate provider sandbox | Verified integration if the feature is exposed |

Proposed config: APP_ENV, IMAGE_PROVIDER=openai|gemini, IMAGE_PROVIDER_MODE=simulated|live, IMAGE_PROVIDER_API_KEY, IMAGE_MODEL, STORAGE_DRIVER, LOCAL_STORAGE_ROOT, FIREBASE_PROJECT_ID, and server-only emulator settings. Endpoint/model profiles are validated and allowlisted, not supplied by the browser. See [autonomous setup](../delivery/autonomous-execution.md) for exact ownership and rollout requirements.

Use Firebase's official emulator instead of a home-grown dev login or token bypass. Cloud auth initialization must support configured emulator operation and real credentials. Production refuses auth emulator settings, placeholders, and undocumented fallback modes. Do not place provider keys or CMS credentials in VITE variables.

Both live adapters are implementation requirements, not optional future features. Actual paid network verification remains distinct from simulator contract verification. Switching provider can change capabilities; the UI reads the catalog instead of assuming identical controls. Routine key rotation within one live profile changes only the secret.

## 9. Scale through measurement

Apply user/session/provider quotas, bounded queue admission, deadlines, image limits and retention before beta. Scale I/O inference workers separately from Sharp CPU processing. Global provider quotas cannot multiply with worker replicas. Use BullMQ v5 OSS capabilities compatible with the pinned version, not unplanned Pro features.

When running multiple API instances, configure the [Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter) and sticky sessions if HTTP polling remains enabled. This does not replace durable recovery. Use private object storage, cursor pagination and thumbnails.

Estimate concurrency from accepted requests/second × mean service seconds, then measure queue age, p95 latency, quota, RSS and database pool use. For example, 10 jobs/s × 8 s implies roughly 80 I/O slots; it is a sizing illustration, not a current benchmark.

## 10. Code and language conventions

- Product name: Bobby Studio. All new comments, docs, UI source strings, errors and logs use English. Existing Vietnamese source copy is migrated under A6; never translate user prompts or remove legitimate locale resources.
- Preserve React PascalCase components, use-prefixed hooks, Nest kebab-case role filenames, two-space formatting and app-local formatter configuration. Avoid whole-repository formatting.
- Validate unknown inputs; use typed errors and discriminated unions. Avoid any stubs, double casts and blanket lint/type suppressions. Increase strictness by touched boundary.
- Reuse class-validator/class-transformer at Nest boundaries and existing form tools. Do not add libraries because a legacy template mentions them.
- Import named feature API clients, not default page exports. Shared code cannot import feature implementations. Do not enforce atomic-design folder layers without reuse.
- Keep public Bobby contracts camelCase; provider-specific names remain in adapters. API owns schema; compatibility tests protect worker/client mirrors. No monorepo tooling migration is required for this work.
- Keep legal constants, defaults with validation, placeholder UI and test fixtures. Remove hidden environment coupling, fake business behavior, fail-open permissions and duplicated sources of truth.
- Never log keys, tokens, base64, full prompts or signed URLs. Use correlation IDs, timing, provider and sanitized error codes.
- Use risk-based tests and automation in [verification](../delivery/verification.md), not a test file for every wrapper or DTO.
