# Legacy cleanup and replacement plan

**Status: in progress; see [Closure status](#closure-status-2026-10-05).** The inventory below is the original plan; the closure table records what was actually verified. See [baseline findings](../architecture/source-audit.md). Product target: Bobby Studio, production behavior, English-first development, and one isolated image simulator.

## Rules for removal

Remove hardcoded deployment addresses, embedded credentials, fake business data, synthetic success, security bypasses, silent provider substitutions and obsolete duplicate implementations. Keep legitimate constants, validated defaults, empty-state illustrations, licensed examples, deterministic test fixtures and official infrastructure emulators.

Before deleting a file: trace imports, runtime registration, routes, configuration, migrations and test consumers; replace needed behavior; verify the replacement; remove old callers; then delete. Dead code may be deleted immediately after confirming it is unused. Never turn a working action into a silent no-op or remove persisted user data to simplify migration.

The new image simulator belongs in a separate development process. Its data must not leak into application project/library services. Fixture imports are allowed in tests and explicitly isolated preview tooling, not production service code. The current HTML design prototype stays under documentation and is excluded from application bundles.

## Inventory and acceptance gates

| ID | Current location / issue | Action and owner | Evidence before closure |
| --- | --- | --- | --- |
| C01 | [Client config](../../frontend/src/config.ts): service IPs and credential-like CMS token | A1: remove bundled credential, route privileged CMS access through API; use validated endpoint config. Verify/revoke or rotate exposed token through authorized account access | Built assets/source maps contain no credential; no privileged browser CMS calls; credential status recorded without its value |
| C02 | [Token storage](../../frontend/src/services/auth/tokenStorage.ts), [interceptor](../../frontend/src/services/api/auth.interceptor.ts), [bypass route](../../frontend/src/routes/ProtectedRoutesByPassed.tsx), [auth guard](../../server-api/src/modules/auth/auth.guard.ts) | A1: replace with official Firebase emulator/live token path, then remove bypass constants/headers/routes and fake Firebase Auth object | Anonymous access denied; two-user ownership tests pass in emulator; production refuses emulator configuration |
| C03 | [Auth guard](../../server-api/src/modules/auth/auth.guard.ts): fabricated password when creating Firebase user | A1: model external identity explicitly; no reusable fake password | Firebase-backed account provisioning cannot create a password-login backdoor; migration preserves existing users |
| C04 | [Project service](../../frontend/src/services/project.ts): fake folder lists and delayed success for edit/delete | A6: use real authorized CRUD and cache updates; delete fake implementations | Create/rename/delete survives refresh and restart; failure is shown honestly; cross-user mutation rejected |
| C05 | [Project selector](../../frontend/src/selectors/project.tsx), [mock config](../../frontend/src/configs/mock.ts), [project fixtures](../../frontend/src/features/admin/pages/admin/project/data.ts) | A6: replace fabricated project imagery with empty state; move useful fixtures to test-only locations; delete unused samples | Empty projects stay empty; no fixture imports in shipped service/selector graph |
| C06 | [General service](../../frontend/src/services/index.ts): hardcoded user and fabricated designs | A6: migrate remaining callers to feature API clients and authenticated data; delete obsolete hook portions | Design list derives from actual owned records; no timed synthetic response |
| C07 | [Project reads](../../frontend/src/services/project.ts): random IDs on each fetch | A6: preserve server IDs, use client temporary IDs only for optimistic creations and reconcile them | Stable selection/cache/mutations after refetch and navigation |
| C08 | [Provider config](../../worker/src/config/api-keys.config.ts), [storage rewrite](../../worker/src/services/storage.service.ts), API/worker env examples | A0/A2: remove public inference fallback and host rewrite; explicit validated profiles | Local/CI sends zero requests to live AI; missing config fails readiness or shows unavailable |
| C09 | [Studio](../../frontend/src/features/admin/pages/admin/generate/components/SdxlStudio/SdxlStudio.tsx), [ThesisShowcase](../../frontend/src/features/admin/pages/admin/generate/components/SdxlStudio/ThesisShowcase.tsx), [Python processor](../../worker/src/processors/python-model.processor.ts) | A2/A4: remove thesis UI and fixed house_lora_final/model/seed assumptions; optional Python adapter owns model-specific configuration | Model change updates supported controls; OpenAI/Gemini requests contain no invented SDXL fields |
| C10 | [Catalog constants](../../frontend/src/constants/models.ts), [restrictions](../../frontend/src/hooks/useModelRestrictions.ts), [model slice](../../frontend/src/slices/models.ts), backend entitlement fallbacks | A1/A2: one authoritative catalog and entitlement policy; safe cache fallback may display metadata but never grant access | Missing/invalid entitlement is denied; unsupported resolution rejected server-side |
| C11 | [Generation service](../../server-api/src/modules/image-generation/image-generation.service.ts): continue after DB/credit failure and force Python | A3: remove permissive branches after transactional admission is in place | No enqueue without durable record/reservation; no silent provider downgrade or unpaid paid job |
| C12 | [Webhook handling](../../server-api/src/modules/image-generation/image-generation.service.ts), [worker sender](../../worker/src/services/webhook.service.ts) | A1/A3: remove disabled checks, swallowed errors and success-shaped failures | Rejected callbacks cannot mutate state; acknowledged success is durable |
| C13 | [Duplicate catalog](../../server-api/src/service/model-catalog/model-catalog.service.ts), [duplicate entitlement](../../server-api/src/service/entitlement/entitlement.service.ts), [database manager](../../server-api/src/database/DatabaseManager.ts) | A1/A6: migrate callers/data to Prisma, then delete unused duplicate services and Sequelize plumbing/dependencies | Fresh and upgrade migrations pass; catalog/price/plan parity; no remaining runtime consumers |
| C14 | [Main parsers](../../server-api/src/main.ts), [local post-processing](../../worker/src/processors/post-processing.processor.ts) | A0/A3: one effective body-limit policy, bounded upload/decode, configurable storage port/root | Container and compiled paths work; large/malformed input rejected without runaway memory |
| C15 | [Retry helper](../../worker/src/utils/retry.utils.ts), [worker bootstrap](../../worker/src/main.ts) | A3: consolidate retry ownership, remove conflicting retention/concurrency defaults and unsupported ID separators | Bounded calls, checkpoint resume, consistent retained-failure policy, graceful shutdown |
| C16 | [Legacy generation hook](../../frontend/src/hooks/useSdxlGeneration.ts), [socket hook](../../frontend/src/hooks/useJobSocket.ts), Redux job projection | A4/A5: migrate to one scheduler and server-state cache, delete retired bridges after caller migration | Late results, reconnect, logout and navigation cannot mix jobs/users; no duplicate listeners |
| C17 | [Empty user reducers](../../frontend/src/store/user.ts), [unfinished project reducers](../../frontend/src/reducers/project.ts), old components/services | A6: trace runtime use, implement required behavior or remove dead code | Compiler/import graph and browser flows pass; no stub exported as working behavior |
| C18 | [App metadata](../../frontend/src/config/app.ts), [HTML entry](../../frontend/index.html), logo/navigation copy | A4/A6: product name Bobby Studio; consolidate name config; remove/configure unapproved chat/analytics scripts | Correct page title/app identity, no surprise development third-party requests; no blind package/DB identifier rename |
| C19 | [Historical frontend conventions](../../frontend/FRONTEND_CONVENTIONS.md), [target structure](../../frontend/TARGET_STRUCTURE.md), [auth template](../../frontend/API_AUTH_ARCHITECTURE.md) | A6: delete obsolete templates once useful guidance and inbound links move to current docs | No conflicting ERP/Vue instructions or links; current docs match actual implementation |
| C20 | [Jest scaffold](../../frontend/jest.config.ts), [template app test](../../frontend/src/app/app.spec.tsx), dependency overlap | A0/A6: one frontend test runner, remove obsolete scaffolds/dependencies after imports/build tooling checked | Meaningful tests execute; no unused second runner or sample greeting test |
| C21 | Existing Vietnamese comments, hardcoded UI/error strings and legacy product names | A6: inventory and translate source copy/comments/logs to English; migrate UI strings to English source catalogs | No unexplained mixed-language released paths; vi/de translations remain supported; user content unchanged |
| C22 | Sample learning/inspiration/pricing content and placeholder feature routes | A6: classify as real editorial examples, required product feature or deferred feature | Licensed labeled examples may remain; exposed interactive actions work; unfinished routes hidden server/client-side rather than faking success |

## Language migration

New work is English immediately. Migrate existing Vietnamese strings after the associated behavior stabilizes, so translation does not hide logic changes. Keep i18next and existing locale resources; English is the default source/fallback, not a reason to erase Vietnamese/German support. Dates, numbers and file sizes use Intl; store timestamps in UTC and format for the viewer.

Do not mechanically translate prompts, customer project names, database content, proper nouns or historical migration names. Audit routes in account/auth, studio, library/projects, history and any enabled settings/billing screen. Translate comments/logs in touched paths and schedule the remainder in A6's inventory.

## Credential cleanup

Do not print, test against a third party, or copy the embedded CMS credential. Identify its owner/scope using authorized metadata. Revoke/rotate through authorized access before claiming remediation; removing it from the latest source does not remove exposure in Git history. Coordinate any history rewrite separately because it affects collaborators; token invalidation is the immediate protection. Run a focused secret scan on source and production bundles with values redacted.

## Closure

Each cleanup item is closed by a task/PR reference and verification result, not by deleting a keyword. A8 requires no unexplained synthetic business behavior, embedded secrets, bypass auth, external defaults or unimplemented exposed action in the release path. Known optional/deferred features are explicit and inaccessible as active functionality.


## Closure status (2026-10-05)

Evidence column names what was run. "Verified" means an automated check or browser run passed; nothing here is claimed from reading code alone.

| ID | Status | Evidence / remaining |
| --- | --- | --- |
| C01 | **code done; credential revocation is a human step** | Browser CMS client and token removed; production bundle scan found no long hex strings or service IPs. The token remains in git history and was printed once in a tool session, so it must be treated as exposed until its owner revokes it |
| C02, C03 | verified | Auth Emulator integration suite; forged/bypass requests rejected; no password backdoor on provisioning |
| C04, C05, C06, C07 | **verified** | Fake `services/project.ts` functions, `configs/mock.ts`, project/inspiration fixtures and the hardcoded-user design service removed; projects without images render the card's honest placeholder (`selectors/project.test.ts`); Playwright `routes.spec.ts` shows an empty projects page for a new account. Project create/rename/delete continue to use the existing `UserProjectManagement` hook and attribute API; that CRUD was **not** browser-exercised in this pass |
| C08 | verified | Local and CI run only against the simulator; live profile needs explicit configuration and `--confirm-spend` |
| C09 | verified | Legacy studio, thesis UI and Python processor removed; `/generate` renders the new studio |
| C10 | **mostly verified** | Studio uses the server catalog and entitlements only. Dead client-side catalog slice, fallback catalog and unused model-catalog client removed. `constants/models.ts` keeps `Bobby AI` labels for legacy persisted records and the plan-limit defaults used by the projects page; it grants no model access |
| C11, C12 | verified | A3 lifecycle suites (admission failure cannot enqueue, rejected callbacks cannot mutate state) |
| C13 | verified | Prisma-only catalog; Sequelize removed; fresh and upgrade migrations applied |
| C14, C15 | verified | Bounded decode/download in worker; one retry owner; graceful shutdown covered by recovery E2E |
| C16 | **verified** | `useSdxlGeneration`, `useJobSocket`, `JobSocketProvider`, the Redux job projection and its history reducers deleted. The navbar History menu now reads the real server history (status chips; no progress percentages). Logout/navigation isolation covered by `studio.spec.ts` two-account test |
| C17 | verified | Empty `store/user.ts`, the dead `inspiration` and `models` slices and 174+ unreachable files removed by import-graph reachability from `main.tsx` (tsc, 101 unit tests, build and 22 browser tests pass afterwards) |
| C18 | verified | Title and identity are Bobby Studio; `index.html` loads no third-party scripts; browser runs assert zero third-party hosts |
| C19 | **done** | The three ERP/Vue templates deleted; `frontend/AI_CONTEXT.yaml` updated to current facts |
| C20 | verified | Single Vitest runner; no Jest scaffold or template test |
| C21 | **done for code, comments, logs and server messages** | All Vietnamese source comments, logs and the one user-visible server message translated; remaining non-English text is the `vi` language label and intentional Unicode in tests. `vi`/`de` locale files untouched. Hardcoded UI copy outside the studio namespace was not re-audited screen by screen |
| C22 | **partly done** | The email-invitation modal, which showed success without sending anything, was removed (no backend endpoint exists; invite link and QR flows remain). Unreachable pricing/payment pages removed. The profile billing/subscription section is still reachable and its Stripe flows were **not** verified here (no Stripe account); decide exposure before release |
