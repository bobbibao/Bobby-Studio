# Windows Chrome application verification — 2026-10-06

The actual application was installed from its Yarn lockfiles and run locally with PostgreSQL 16.9, Redis 7.2.8, the official Firebase Authentication Emulator, the image HTTP simulator, the compiled Nest API/worker, and Vite. Playwright controlled installed Google Chrome in isolated test profiles. No live inference request was made. The final run used a fresh bobby_browser_qa database, Redis DB 3, frontend port 4201, API port 3001, worker health port 3101 and simulator port 4011 to avoid a separately running Desktop checkout.

## Fixes

- Windows package-manager discovery, Node application entrypoints, absolute storage paths, Prisma integration startup, and direct catalog seeding now work in this environment.
- Restored the existing English, Vietnamese, and German translation namespaces removed from source; regional English falls back correctly. Relative timestamps use the selected language.
- Project deletion no longer invokes a React hook inside the click handler or sends duplicate requests. Folder keys are stable and empty image preload lists no longer cause a render loop.
- Owned library/project image and thumbnail references receive fresh signed delivery URLs after ownership checks. Stored references remain stable. Image loaders no longer log signed URLs.
- Email verification exposes the continuation button and cleans up resend timers. The official local emulator generates OOB codes without requiring production email templates or delivery credentials.
- Selected-image movement in the project grid now opens its destination dialog, carries source metadata, clears stale selections, and persists before closing. Moving within the same project retains the destination image.
- The stale-job test uses explicit UTC instants instead of timezone-sensitive raw SQL fixture dates.

## Verification

| Check | Result |
| --- | --- |
| Frontend Vitest | 101 passed |
| API unit Jest | 27 passed |
| API integration, disposable real database/Redis | 67 passed |
| Worker/provider Jest | 70 passed |
| HTTP simulator Jest | 61 passed |
| Chrome Playwright | 26 passed |
| Frontend, API and worker typecheck and source lint | Passed; existing lint warnings remain |
| Frontend production build and compiled API/worker startup | Passed |

Browser coverage includes signup and verification, signin/anonymous redirect, route rendering, project/folder CRUD with reload, library image decoding and organization, prompt/sketch/reference inputs, realtime toggles, save/download/history, cancellation/refunds, failure/retry, idempotency, offline reconnect, API process termination/recovery, account isolation, and 390/768/1440-pixel layouts. Network, page-error, console and 5xx diagnostics are checked; first-time onboarding intentionally embeds the existing YouTube tutorial.

## Reproduction

Use Node 20+ and Yarn 1.22.22. Ensure PostgreSQL and Redis are listening first. On Windows, PostgreSQL/Redis must be supplied as native services or through Docker; the scripts do not install them.

```sh
node scripts/setup.mjs
node scripts/dev.mjs start --build
cd tools
node node_modules/@playwright/test/cli.js test
```

The browser defaults to installed Chrome. Set CHROMIUM_PATH to a Chrome-compatible executable to override the location. When changing local API/worker/simulator ports in ignored env files, dev readiness follows those values; set E2E_API_URL to the matching API URL when running tests. DEV_FRONTEND_PORT overrides the web port; set E2E_BASE_URL to match it. Include the chosen web origin in ALLOWED_CORS_DOMAINS. When psql is unavailable, use setup --skip-db after provisioning the databases externally, then run the documented Prisma migration/seed commands.

## Limits

This is local simulator-backed application evidence, not a production deployment or a claim that every feature is complete. Live OpenAI/Gemini, a real Firebase/GCS account, Resend email delivery, Stripe/subscriptions, team/admin workflows, cloud deployment, real-device accessibility and soak/load/backup scenarios were not newly verified in this run. Route rendering does not establish those workflows. Video remains deferred.
