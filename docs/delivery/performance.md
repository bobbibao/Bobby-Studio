# Performance evidence (simulated inference)

**Scope and honesty.** These are measurements of this repository's application code on one development machine with a *fixed-latency simulator*. They are not production capacity claims, not provider throughput, and not a statement about real model latency. No live provider was contacted.

## Environment

| Item | Value |
| --- | --- |
| Machine | 4 vCPU / 15 GB cloud sandbox; the load generator, simulator, API, worker, PostgreSQL 16, Redis 7 and the Auth Emulator all share it |
| Simulator | 800 ms fixed latency, deterministic Sharp rendering of 1024x1024 PNGs |
| Worker | 1 process, `WORKER_CONCURRENCY=8` (default 2) |
| API | 1 process, compiled build, one shared Prisma pool (default size), outbox poll 400 ms |
| Workload | `tools/load/generation-load.mjs`: closed loop, one account + one studio session per virtual user, explicit finals (`intent=final`), 500 ms think time, real Firebase Auth Emulator tokens |
| Date | 2026-10-05 |

Reproduce: start the stack (`WORKER_CONCURRENCY=8 node scripts/dev.mjs start`) and run `node tools/load/generation-load.mjs --users N --seconds 30` from `tools/`.

## Results

| Concurrent studio sessions | Accepted/s | Completed/s | Failed | Throttled | Submit p50 / p95 / p99 (ms) | Accepted → COMPLETED p50 / p95 / p99 (ms) | Oldest pending (peak) | Queue waiting (peak) | API / worker RSS (MB) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.51 | 0.51 | 0 | 0 | 23 / 38 / 38 | 1069 / 1203 / 1203 | 0.1 s | – | 176 / 121 |
| 10 | 4.97 | 4.97 | 0 | 0 | 19 / 27 / 37 | 1072 / 1416 / 1678 | 0.3 s | – | 194 / 164 |
| 50 | 7.28 | 7.28 | 0 | 0 | 26 / 87 / 104 | 5993 / 6515 / 6895 | 1.4 s | 40 | 346 / 183 |
| 100 | 5.91 | 5.91 | 0 | 0 | 160 / 234 / 253 | 15868 / 17731 / 18132 | 11.3 s | 75 | 367 / 184 |

Redis used memory stayed under 4 MB; PostgreSQL connections stayed at 10 (single pool).

## Reading the numbers

- **Acceptance** (the POST that returns 202) stayed below the 300 ms p95 budget at every level, including 100 sessions on a shared machine.
- **Ten active sessions** reach a visible result in about 1.1 s p50 / 1.4 s p95 end to end (800 ms simulator latency plus up to 400 ms outbox poll and callback overhead). The 3 s budget for a debounce-fire-to-visible path at ten sessions was met for this fixed-latency profile.
- **Saturation behavior.** Beyond ~10 sessions the single worker process (8 execution slots, simulator rendering competing for the same 4 CPUs) is the bottleneck: completed/s plateaus near 6–7 while queue age grows. Overload showed up as longer queueing, not as failures or lost work: no job failed, nothing was dropped, and the queue and per-user backlog stayed bounded (per-user limit of 6 unfinished jobs, one execution per session, two per user).
- The 100-session run also degraded below the 50-session rate, consistent with CPU contention from the load generator and simulator on the same host. Capacity planning must use measured service time and slots on separate hardware: for example, 10 jobs/s × 8 s mean service time implies roughly 80 I/O slots (a sizing illustration, not a benchmark).
- Throttling (HTTP 429 with `Retry-After`) did not occur because virtual users are closed-loop. Preview burst throttling and backlog bounds are covered by the integration suite instead.

## Not measured

Multi-process worker scaling, real provider latency and quota behavior, a separate database host, GCS storage latency, WebSocket fan-out at scale, and sustained multi-hour runs.
