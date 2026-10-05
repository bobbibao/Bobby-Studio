# Deployment, operations and rollback

Status: **artifacts written, not deployed.** No cloud target, Firebase project, GCS bucket or provider credential was available, and the sandbox has no Docker daemon, so the Dockerfiles and CI workflow are **unverified here** (the CI workflow YAML parses; the images were never built). What *is* verified locally is listed in [agent plan](agent-plan.md) and [performance](performance.md).

## Artifacts

| Artifact | Purpose |
| --- | --- |
| `server-api/Dockerfile` | API image (non-root, `dist/src/main`, includes the Prisma CLI for the release migration step) |
| `worker/Dockerfile` | Worker image (non-root, `dist/main`, health on 3100 bound to `0.0.0.0` inside the container) |
| `image-simulator/Dockerfile` | Simulator for CI and staging dry runs only; never a production dependency |
| `frontend/Dockerfile`, `nginx.conf` | Static build behind unprivileged nginx on 8080 with SPA fallback |
| `.github/workflows/ci.yml` | Typecheck, non-mutating lint, unit, integration (real PostgreSQL/Redis/Auth Emulator), frontend checks, Playwright, image builds |
| `scripts/backup.mjs` | Backup and restore verification |
| `scripts/configure-provider.mjs`, `scripts/provider-smoke.mjs` | Configuration-only provider switch and a deliberate smoke call |

## Configuration mapping

| Concern | API | Worker | Notes |
| --- | --- | --- | --- |
| Environment | `APP_ENV` | `APP_ENV` | `staging` or `production` rejects the emulator, local storage and (production) the simulated mode |
| Database | `DATABASE_URL` | none | Worker has no database access; it talks to the internal API |
| Redis / queue | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` | same | Use `noeviction` and AOF; queued jobs must not be evicted |
| Identity | `FIREBASE_PROJECT_ID` plus service-account variables (`BOBBY_GCP_*`) or workload identity | none | `FIREBASE_AUTH_EMULATOR_HOST` must be unset |
| Storage | `STORAGE_DRIVER=gcs`, `BOBBY_GCS_BUCKET_NAME` | same | Bucket must be private; assets are served through signed URLs |
| Worker credential | `WORKER_SERVICE_SECRET` | `WORKER_SERVICE_SECRET` | At least 24 characters, identical on both |
| Asset URL signing | `ASSET_URL_SECRET` | none | At least 24 characters, used for nothing else |
| Metrics | `METRICS_TOKEN` | none | Bearer token for `GET /api/ops/metrics` |
| Provider profile | `IMAGE_PROVIDER`, `IMAGE_PROVIDER_MODE` | `IMAGE_PROVIDER`, `IMAGE_PROVIDER_MODE`, `IMAGE_PROVIDER_BASE_URL`, `IMAGE_PROVIDER_API_KEY`, `IMAGE_MODEL` | See below |
| Origins | `ALLOWED_CORS_DOMAINS` | none | Explicit list; wildcard rejected when deployed |

Secrets belong in the platform secret store, not in images, build arguments or committed files. Run `node scripts/doctor.mjs` locally and rely on the startup validators in deployed environments: both applications refuse to start with a problem list that names fields and reasons, never values.

## Release procedure

1. Back up: `node scripts/backup.mjs --out <dir>` then `node scripts/backup.mjs verify <dump>` (restores into a throwaway database and compares row counts and lifecycle invariants).
2. Build and tag the four images from one commit.
3. Run migrations as a separate step with the new API image: `node_modules/.bin/prisma migrate deploy`. Migrations in this project are additive; never edit or delete historical ones.
4. Roll the API, then the worker, then the web image. API readiness is `GET /api/health/ready` (PostgreSQL and Redis); liveness is `/api/health/live`. Worker liveness and readiness are `/health/live` and `/health/ready` on port 3100.
5. Give containers a stop grace period of at least 60 seconds. On SIGTERM the API stops accepting work and drains; the worker stops claiming and lets in-flight jobs finish. Anything left in flight is recovered by the reconciler (overdue claims fail with a release of reserved credit; pending jobs older than ten minutes fail).
6. Check `GET /api/ops/metrics` (bearer `METRICS_TOKEN`) for queue depth, oldest pending age and failure counters, and send one canary generation.

## Activating a live provider (configuration only)

Run `node scripts/configure-provider.mjs --provider openai|gemini --mode live --model <vendor model id>` and supply the key through the masked prompt, `--secret-env` or `--secret-file`. The script validates the result with the applications' own config validators and leaves the previous files untouched on any failure. It makes no provider request. In a deployed environment apply the same five values (`IMAGE_PROVIDER`, `IMAGE_PROVIDER_MODE=live`, `IMAGE_PROVIDER_BASE_URL`, `IMAGE_MODEL`, secret) through the secret store and restart the API and worker. Verify with `node scripts/provider-smoke.mjs --confirm-spend`, which performs exactly one billable request. Routine key rotation: `node scripts/configure-provider.mjs --rotate-key` (or replace the secret value in the store); no other value changes.

The adapters were written from official SDK type definitions because vendor documentation was unreachable from the sandbox. **Their behavior against the live services is unverified**; the first live smoke call is the real acceptance test.

## Retention

Preview outputs expire after 24 hours and uploaded inputs after 7 days; saved results are kept. The reconciler removes expired unsaved assets one hour after expiry. Job and ledger rows are retained; no automatic deletion of user data exists.

## Rollback

- **Application:** redeploy the previous images. Migrations are additive and compatible with the previous release, so an application rollback needs no database action.
- **Provider profile:** restore the previous values (the configure script keeps `*.bak-<timestamp>` copies locally). Jobs already running finish under the profile that claimed them.
- **Data:** restoring a backup is a deliberate human decision; use `scripts/backup.mjs verify` to prove a dump is restorable first. Never reset a database or edit historical migrations to recover.

## Known gaps

Docker image builds, CI execution, GCS private-bucket behavior, a staging deployment and any live provider call have not been run. Each is recorded in the [agent plan](agent-plan.md) as a human or access prerequisite rather than claimed.
