# Bobby Studio agent instructions

## Read the right context

- Start with [README](README.md). Distinguish current code from the proposed architecture.
- For generation work, read [overview](docs/architecture/overview.md), the relevant [contracts](docs/architecture/generation-contracts.md), and your task in [agent plan](docs/delivery/agent-plan.md).
- For UI work, read [studio design](docs/product/studio-design.md); for checks, read [verification](docs/delivery/verification.md).
- For legacy removal, read [cleanup inventory](docs/delivery/cleanup-plan.md); for environment, account setup and automated delivery, read [autonomous execution](docs/delivery/autonomous-execution.md).
- [Source audit](docs/architecture/source-audit.md) records the baseline, not proof that an issue remains after later changes. Verify before fixing.
- Historical frontend ERP/Vue examples are not Bobby's source of truth. Do not introduce their sample entities, auth endpoints, or dependencies.

## Scope and architecture

- Image generation is the current product. Video is deferred; do not build video jobs, providers or billing without a new task.
- The product is Bobby Studio. Write all new documentation, comments, UI source copy, errors and logs in English. Schedule existing Vietnamese source copy for A6; preserve actual translations and user content.
- Deliver production-quality application behavior. Both OpenAI and Gemini adapters and matching HTTP simulator facades are required; a mock demo is an intermediate milestone.
- Keep React/Vite/Chakra 2 and NestJS API + worker, BullMQ/Redis, PostgreSQL/Prisma. Use the existing generation layers and DI ports.
- Prefer small use cases and adapters over a rewrite, generic base classes, new frameworks or new infrastructure.
- The default export of the generation feature is a React page. Import its named API client when making requests.
- Keep domain independent of transport/ORM/provider SDKs. Provider-neutral ports must not expose Python DTO types.
- Migrate the duplicate Prisma/Sequelize catalog deliberately, with caller and data parity checks. Do not run both as writers for new generation state.

## Invariants

- User identity comes from authenticated server context. Enforce ownership for reads, mutations, assets and socket rooms.
- Use the official Firebase Authentication Emulator for local/CI SDK flows. Remove custom token/route bypasses; production must reject emulator configuration.
- Provider credentials stay on the server/worker. Local and CI must use the configured mock; never silently call a paid or external provider.
- Mock API compatibility is a documented subset. Do not invent provider fields or claim fixture output is AI inference.
- Simulator/live switching is an explicit provider/mode/model/endpoint/secret configuration change, not a code fork or key-prefix guess. Routine rotation within a live profile changes only the secret.
- Do not ship fabricated projects/assets, timed fake CRUD success, embedded CMS credentials or silent permission/provider fallbacks. Keep legitimate constants, honest placeholders and isolated test fixtures.
- Increment editor revision before async work. Debounce alone does not prevent stale results; gate uploads, responses and events by session/revision/job identity.
- Abort of a browser HTTP request is not cancellation of a queued job. Preserve separate logical cancellation and actual execution completion.
- PostgreSQL is the durable job/result/credit authority. Enqueue intent must be recoverable; a DB failure must not become a successful submit.
- Finalization and credit capture are transactional and idempotent. Terminal states do not regress. Duplicate/out-of-order callbacks are expected.
- One owner for provider retries; a timeout may have an unknown paid outcome. Callback retries must not repeat successful provider inference.
- No base64/keys in queue payloads, logs or history; use owned asset references. Bound image sizes, decoding and outbound downloads.
- Do not delete historical migrations, reset databases, discard unrelated changes, or replace data with fake values to make a check pass.

## Working and verifying

- Keep app-specific Yarn lockfiles until a dedicated tooling task changes them. There is no root application build command at the documented baseline.
- Existing API/worker lint scripts use `--fix`; use non-mutating lint for verification unless intentionally formatting touched files.
- Use existing naming/formatter conventions. Avoid broad formatting, `any` stubs and blanket TypeScript/lint suppressions.
- Write tests for observable risks: ownership, race conditions, idempotency, retries and the end-to-end mock flow. Do not add tests for every wrapper/DTO or snapshots of incidental markup.
- Run checks for the changed boundary. Report commands, results and anything not run; build success is not end-to-end proof.
- Set up authorized environments and run browser/Playwright checks yourself when useful. Reuse approved account access, generate development keys and populate ignored env files without exposing secrets. Request only genuinely missing access or tool-required approval; never claim account provisioning/live verification without evidence.
- Update task status and relevant contract/runbook when behavior changes. Do not mark planned tasks complete without acceptance evidence.
- Delegate only when the current assignment authorizes parallel agent work; the delivery plan describes potential work allocation, not standing permission to spawn agents.

## Project skill

Use [bobby-generation](.agents/skills/bobby-generation/SKILL.md) for implementing or diagnosing an image-generation slice across editor, API and worker. Its references are scoped so you need not load every project document for a small change.
