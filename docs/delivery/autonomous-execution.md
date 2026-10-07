# Autonomous execution and environment runbook

**Status: implementation instructions, not completed provisioning.** The user wants agents to carry Bobby Studio through implementation, configuration and automated verification with minimal manual work. Do the authorized work end to end; do not stop after writing a plan, installing dependencies or compiling.

## 1. Operating workflow

1. Read repository instructions, current task/dependencies, source evidence and the relevant contract sections.
2. Inspect available tools, existing environment/configuration and connected account metadata without printing secrets. Use the existing package locks and supported toolchain.
3. Implement one reviewable vertical slice, update contracts/config examples, run its checks, diagnose failures and fix their cause.
4. Start the actual services and use browser automation where the behavior is user-visible. Do not ask the user to click through routine checks the agent can execute.
5. Record commands, sanitized evidence, task status and remaining external prerequisites. Continue independent tasks while an external answer is pending.

If multi-agent execution is requested, use the [ownership graph](agent-plan.md). Give each agent a bounded task, acceptance gate and exclusive write scope; one integration owner controls schema/contracts/lockfiles and verifies the combined system. The plan is not by itself permission to spawn agents in a session that disallows delegation.

## 2. Setup automation to implement in A0/A7

Create small, idempotent setup/doctor commands, not a provisioning framework. A0 should provide root commands with documented equivalents for individual apps. They must:

- Check Node/Yarn/Docker and emulator requirements against pinned dependencies, reporting actionable missing tools.
- Generate development simulator/service secrets once using crypto randomness; write ignored environment files with restricted permissions; never overwrite existing values without an explicit reset operation.
- Validate required values and profile combinations before startup. Report field names/status, not secret contents. Separate browser-visible Firebase project config from server/private credentials.
- Start PostgreSQL, Redis, Firebase Auth Emulator, simulator, API, worker and frontend; wait for meaningful health/readiness.
- Apply migrations only to the selected development/test DB and seed idempotently. User A/B test identities and application records should be created through appropriate emulator/API paths.
- Support a disposable E2E environment and cleanup of resources created by that run. Do not reset a developer's persistent database for convenience.
- Generate a sanitized environment summary and test result, including process/port health and external-call policy, rather than dumping all environment variables.

**Implemented (A0):**

~~~sh
node scripts/setup.mjs [--install] [--rotate-secrets] [--skip-db] [--skip-install]   # idempotent; env files 0600, values never printed
node scripts/dev.mjs start [--build] [--only=api,worker]                             # PostgreSQL, Redis, Auth Emulator, simulator, API, worker, frontend
node scripts/dev.mjs status | stop
node scripts/doctor.mjs [--json]                                                     # tools, env (names only), profile validation, external-call policy, health
yarn --cwd server-api test:integration                                               # real services, disposable database per run
(cd tools && node_modules/.bin/playwright test)                                      # browser checks against the running stack
~~~

Without a Docker daemon (the cloud sandbox) `dev.mjs` uses native PostgreSQL (`pg_ctlcluster`) and `redis-server`; with Docker it uses `docker-compose.dev.yml` (unverified in the sandbox).

Windows uses Docker Desktop and an isolated PostgreSQL port of 55432 by default (`BOBBY_POSTGRES_PORT` overrides it). Run `dev.mjs start --only=postgres,redis` before `setup.mjs`; setup uses the matching Compose container's `psql` when the host lacks PostgreSQL admin access. The scripts launch Firebase and Vite through their JavaScript entrypoints, avoiding Windows `.cmd` shim execution. A repository-local Yarn 1.22.22 can be installed with `npm install --prefix .data/toolchain yarn@1.22.22 --no-audit --no-fund`; it takes priority over system Yarn without changing lockfiles.

## 3. Firebase through supported mechanisms

For local/CI, use the [official Authentication Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth) and a demo project such as demo-bobby-studio. Frontend SDK, Admin SDK and CLI must agree on the project ID. Configure the Admin emulator host without a URL scheme and connect the web SDK explicitly. Production startup rejects emulator settings. Test SDK token acquisition and API verification, not a hardcoded bypass identity.

For an authorized cloud project, inspect the configured [Firebase CLI](https://firebase.google.com/docs/cli) account/project and SDK configuration. Prefer existing credentials and repeatable CLI/API setup; use browser automation for console-only steps. Avoid rerunning broad initialization that overwrites unrelated project configuration.

Use [Application Default Credentials](https://docs.cloud.google.com/docs/authentication/application-default-credentials) or workload identity where deployment supports them. Do not make exporting long-lived service-account private keys the default. Restrict storage/service permissions to the needed resources.

The emulator reduces development dependencies; it does not verify live OAuth redirects, production authorized domains, IAM or billing. A7 runs targeted checks against the selected real Firebase/storage environment when access exists and records any blocked external prerequisite accurately.

## 4. Provider profiles and credentials

| Setting | Purpose | Visibility |
| --- | --- | --- |
| APP_ENV | development, test, staging, production | Server; limited capability projection to UI |
| IMAGE_PROVIDER | openai or gemini | Safe provider ID may be exposed |
| IMAGE_PROVIDER_MODE | simulated or live | UI may show simulation status |
| IMAGE_PROVIDER_API_KEY | Key accepted by the selected simulator/live provider | Worker/service secret only |
| IMAGE_MODEL | Selected model profile mapped to verified vendor model ID | Safe catalog metadata |
| Provider endpoint profile | Allowlisted simulator or vendor base URL | Internal configuration |
| Firebase public app config | Project/app identity needed by web SDK | Browser-visible; not an inference credential |
| Firebase/GCS server identity | Admin verification and private storage access | Server identity/secret store |

Development defaults to the simulator. OpenAI facade uses its Images protocol; Gemini facade uses native generateContent. Same adapter code operates in both modes. Activation is configuration-only: selected provider, live endpoint/model profile and its real key. Key rotation inside a profile changes only the secret. A fake key cannot work against a real vendor endpoint, and changing a key cannot convert one protocol into the other.

A7 should provide one operator setup command for this transition: select the provider/model profile, receive the secret through a masked prompt or secret-store reference rather than a command-line argument, validate configuration, and update the profile/secret together. The command handles endpoint selection so the operator does not edit application code or multiple files manually. It must distinguish configuration validation from an authorized live inference smoke and preserve the previous working configuration on failure.

Agents may discover/reuse credentials already made available for the authorized project, generate simulator/service secrets, populate ignored env files and configure approved secret stores. If tasked to provision a key and authenticated authorized account access exists, prepare/perform the narrowly scoped key operation using the applicable tools and approval policy. Never place secret values in chat, screenshots, source control, logs or frontend bundles.

When no account session/key exists, continue all simulator and contract work. Request the minimum missing access when it becomes the final external dependency, with the prepared configuration and exact intended operation. Do not claim to have obtained a key, created a cloud project or verified a live provider without evidence.

## 5. Human interaction boundaries

| Situation | Agent action |
| --- | --- |
| Local code/config, dependency install, app start, emulator setup, browser checks | Execute within current authorization; no routine permission question |
| Missing permission for a concrete tool operation | Use the tool's approval mechanism if available; explain the exact operation/reason, do not ask repeatedly after approval |
| Existing authorized account/project and scoped setup task | Inspect then configure using CLI/API/browser, preserving unrelated settings |
| Account login, MFA, CAPTCHA, legal acceptance, payment/billing selection unavailable to the agent | Ask the owner only for that step; never bypass it or invent completion |
| New paid usage/infrastructure outside an approved budget | Prepare deployment/config/test and cost scope first; request the final approval required by the actual policy |
| Deployment/publication in scope with required approvals already granted | Proceed and verify; do not introduce another approval gate |
| Destructive reset, removing an active shared resource, Git history rewrite | Prepare a targeted migration/remediation plan; respect separate destructive-action authorization |

Permission to work autonomously does not let an agent override a tool rejection or self-approve an account-owner step. If a tool policy denies an action, report its specific reason and continue a supported alternative. This is not a reason to leave ordinary implementation or automated testing to the user.

## 6. Browser and Playwright workflow

Launch the real application with its real API/worker/database and simulated inference. Use an isolated test browser/context and owned test accounts; reuse an authorized browser session only for account setup requiring it. Prefer DOM/accessibility selectors, not brittle screenshot coordinates.

Automate sign-in, project creation, prompt/sketch/reference upload, realtime/manual generation, cancellation/retry, history, save/download and sign-out. Check request counts, final visible version, persistence after refresh, ownership with a second account, console errors and unexpected external requests. Test responsive desktop/tablet/mobile and keyboard paths; capture screenshots for visual review, not as the sole functional assertion.

Use deterministic faults through the simulator and service lifecycle to test reconnect/restart/callback recovery. Save traces/screenshots on failure and redact sensitive content. A passing HTML prototype is not a passing React application test. Browser automation against the live model is a small budgeted smoke, not the load-test target.

## 7. Default deployment path and automation

First produce an OCI/container deployment that can run on one conventional managed host with separately operated PostgreSQL/Redis and private GCS. Keep provider I/O and CPU processing independently scalable. Do not require Kubernetes to ship. Record the selected host, region, account/project, domain and budget once; adapt to existing infrastructure rather than creating a second stack.

A7 supplies repeatable container builds, migrations, readiness, TLS/proxy configuration, environment/secret mapping, backup/restore procedure, rolling/rollback procedure and CI checks. A8 executes against a staging deployment with the same application artifact intended for release. Public deployment is performed when included in the current task/approval scope; otherwise the deployable candidate and exact remaining operation are handed over.

## 8. Minimal handoff

Maintain status in the delivery plan/PR or current session: completed behavior, changed contracts/migrations, automated checks/results, screenshots or trace when useful, configuration readiness, and a short external-blocker list. Avoid creating a new report for every command. A blocker must name the missing access or external state and the work already completed around it.

The completion target is the final product. “Mock demo works” is an intermediate milestone; absence of a paid inference key is not permission to leave auth, CRUD, workers, UI or deployment quality unfinished.
