# Generation contracts v1

**v1 is frozen in code**: typed contracts in [`server-api/src/application/generation/contracts`](../../server-api/src/application/generation/contracts) (mirrored byte-for-byte into the worker and frontend, checked by a test) with shared fixtures in [`contracts/v1`](../../contracts/v1). The HTTP endpoints below are implemented in A3; the schema migration and identity/ownership layer exist already. The legacy SDXL routes are interim-locked and removed in A3.

Authentication summary: browser routes require a Firebase ID token (`Authorization: Bearer`); `/api/internal/*` routes require the worker service credential (`Authorization: Bearer <WORKER_SERVICE_SECRET>`, constant-time check); asset delivery to `<img>` uses short-lived signed `access` tokens minted inside authorized responses. Socket.IO handshakes carry the ID token in `auth.token`; each socket joins `user:<uid>` automatically and may join a job room only for its own jobs.

## 1. Separate three boundaries

1. Browser → Bobby Studio: authenticated asynchronous jobs; submit returns 202, followed by event/snapshot reads.
2. API → worker: versioned queue payload and authenticated claim/callback. No provider secrets in queue messages.
3. Worker → provider: the selected provider's HTTP protocol. The image simulator responds to the same adapter over HTTP; it does not bypass application jobs or generate Bobby callbacks itself.

Do not reuse one DTO across these boundaries. The application selects capabilities and prices; adapters serialize the provider request. Both OpenAI and Gemini adapters and simulator facades are required for the intended product. Compatibility is limited to the operations Bobby actually supports.

## 2. Catalog and provider port

Catalog fields: id, displayName, provider, isSimulated, capabilities, limits, creditEstimate. Never expose credentials, internal endpoints or executable connector names to the browser. Capabilities cover modes, sizes, quality, negativePrompt, seed, sketchStrength, controlNet, lora, cancellation and partialImages. Unsupported requested fields return 422 with field errors rather than silently disappearing.

Sketch input to OpenAI/Gemini is image guidance, not automatically ControlNet conditioning. Do not invent a control-scale parameter. Python-specific settings stay in its optional adapter; advanced controls follow actual model capabilities.

~~~typescript
type ImageGenerationInput = {
  modelId: string;
  mode: 'text_to_image' | 'sketch_to_image' | 'image_to_image';
  prompt: string;
  inputImage?: { bytes: Uint8Array; mimeType: string };
  width: number;
  height: number;
  quality: 'preview' | 'standard';
};
type ProviderContext = {
  signal: AbortSignal;
  correlationId: string;
  deadlineAt: string;
};
type ImageGenerationOutput = {
  images: Array<{ bytes: Uint8Array; mimeType: string }>;
  providerRequestId?: string;
  usage?: { unit: string; quantity: number; simulated: boolean };
};
~~~

These are design types for the existing worker port, not a new SDK. Bytes only exist at adapter/storage boundaries. Queue/checkpoint/callback use owned asset IDs/object keys. Provider-specific additional settings require a validated discriminated type, not an untyped metadata bag.

## 3. Public API

All routes use the API prefix. Keep legacy SDXL routes only through a compatibility mapper during migration, with caller inventory and removal gate.

| Method / target path | Behavior |
| --- | --- |
| GET /api/models | Reuse catalog module; return entitled capabilities and simulation indicator |
| POST /api/studio-sessions | Create an editing session owned by the authenticated user |
| POST /api/uploads | Reuse upload module; validate image, persist owned asset, return assetId |
| POST /api/generations | Immutable snapshot + Idempotency-Key; 202 durable job |
| GET /api/generations/:id | Durable snapshot, result, error and timestamps; owner/team ACL |
| GET /api/generations?cursor=...&limit=... | Principal-scoped final/saved history with stable createdAt + id cursor |
| POST /api/generations/:id/cancel | Idempotent cancel; 200 accepted, 409 if already completed |
| POST /api/generations/:id/retry | New intent/key, revalidate permissions/balance/capabilities, link previous job |
| POST /api/generations/:id/save | Retain completed preview without reinference; idempotent |
| GET /api/assets/:id | Authorized view/download or short-lived access URL |

A1 confirms actual existing catalog/upload paths and adds aliases if needed, not duplicate modules. Unauthorized resource access returns a non-disclosing 404; unauthenticated requests return 401. Team access is explicit, never inferred from a shared project name.

~~~http
POST /api/generations
Authorization: Bearer <firebase-id-token>
Idempotency-Key: <uuid-created-once-per-submit-intent>
Content-Type: application/json
~~~

~~~json
{
  "studioSessionId": "studio-uuid",
  "clientRevision": 12,
  "intent": "preview",
  "modelId": "simulated-openai-image",
  "mode": "sketch_to_image",
  "prompt": "A modern timber and glass home in soft morning light",
  "inputAssetId": "owned-asset-uuid",
  "size": { "width": 1024, "height": 1024 },
  "quality": "preview"
}
~~~

IDs above are illustrative; actual DTOs validate UUIDs. Reject body userId, prices/credits, API keys, arbitrary URLs and connectorFunction. Resolve actor, model and cost on the server. An obsolete upload completion cannot submit an outdated snapshot.

~~~json
{
  "id": "job-uuid",
  "requestId": "request-uuid",
  "studioSessionId": "studio-uuid",
  "clientRevision": 12,
  "intent": "preview",
  "status": "PENDING",
  "stateVersion": 1,
  "isSimulated": true,
  "pollAfterMs": 2000
}
~~~

PENDING means committed, awaiting dispatch or execution capacity. It does not mean inference started. Keep the existing COMPLETED public status rather than introducing another success spelling.

### Validation and admission

- Initial Bobby limits: prompt 1–4,000 trimmed characters, one input/output image, PNG/JPEG/WebP input up to 10 MiB and 16 decoded megapixels, metadata request up to 64 KiB. These are proposed product limits, not provider limits.
- Same user + idempotency key + input hash returns the same logical job. Same key with different input returns 409 IDEMPOTENCY_CONFLICT. Enforce with a database unique constraint, including concurrent requests; keep records at least 24 hours and through any nonterminal job.
- Fingerprint normalized prompt, input content digest, model, mode, size, quality and supported settings using deterministic serialization and SHA-256. Exclude timestamps and temporary URLs. Do not cache every manual request by prompt: Regenerate is a new intent/key.
- Same session revision with different content, or an older accepted revision, returns 409 STALE_REVISION. Separate tabs use separate sessions; user quotas apply across sessions.
- Start with a two-second minimum preview interval/user, one physical execution + one latest pending/session, and at most two active executions/user. Initial configurable deadlines: preview 30 seconds, final 120 seconds, adjusted to selected model characteristics. Enforce globally on the server; 429 includes Retry-After.
- The browser increments desiredRevision immediately on input change. The API only knows submitted revisions, so the browser must reject obsolete results even before its debounce fires.

## 4. Realtime scheduler

1. Prompt change, committed stroke, undo/redo, clear, upload, mode/model/size change increments desiredRevision before asynchronous work. Ignore unchanged values. Pointer moves draw locally; commit on pointer up/cancel/lost capture. Wait for IME compositionend.
2. Auto mode uses a 700 ms debounce initially. Do not export image data on every pointer move. If drawing is active at timer expiry, wait for stroke commit. Slider values commit on release.
3. Preprocessing, toBlob and upload carry the revision token. Old async completions cannot overwrite new input or submit.
4. Capture an immutable snapshot and idempotency key before POST. A timeout/lost response replays the same key to recover the accepted job. Aborting browser HTTP is not server cancellation.
5. Client keeps one submission request in flight and one latest unsent snapshot. It can submit a new debounced revision after acknowledgment even while inference runs. Server replaces the single pending preview, marks the prior pending one CANCELLED/SUPERSEDED, and does not expand execution capacity.
6. If the provider cannot abort, let the old execution finish and suppress stale display. Do not release its capacity early. If abort is supported, release only after confirmed termination. Logical cancellation must not accumulate paid calls outside application accounting.
7. Display a result only for the intended session/revision/job with a nonstale stateVersion. Preserve the last successful image while updating. A final result has its own history entry and cannot be overwritten by unrelated preview events.
8. Auto off clears local timers/pending work and cancels submitted pending/active previews as supported; it never cancels an explicit final. Auto on schedules at most one valid current snapshot, avoiding a duplicate if that snapshot is already current/in flight.
9. Hidden/offline tabs stop new automatic submissions and retain the draft. On return, reconcile snapshots before scheduling the latest change. Unmount/logout removes timers/listeners/subscriptions and scopes cache to identity.
10. Manual Generate flushes current input, replaces pending auto work and pauses auto while the final runs. Stop uses cancel API; retain the last successful image. Final completion does not trigger another preview unless input changed.

~~~mermaid
sequenceDiagram
  participant E as Editor
  participant A as API
  participant W as Worker
  E->>E: Input revision 8; debounce/upload
  E->>A: Submit 8 + idempotency key
  A-->>E: 202 durable snapshot
  A->>W: Dispatch 8
  E->>A: New preview revision 9
  A->>A: Retain only pending 9
  W->>A: Complete 8 with attempt token
  A-->>E: Snapshot 8
  E->>E: Ignore obsolete revision 8
  A->>W: Dispatch 9 after execution slot is free
  W->>A: Complete 9
  A-->>E: Snapshot 9
  E->>E: Display current result
~~~

## 5. Lifecycle and delivery

| Current | Allowed next states | Meaning |
| --- | --- | --- |
| PENDING | QUEUED, FAILED, CANCELLED | Dispatch, permanent admission/deadline failure, cancel/supersede |
| QUEUED | PROCESSING, FAILED, CANCELLED | Claim, terminal failure, cancellation |
| PROCESSING | PROCESSING, COMPLETED, FAILED, CANCELLED | Progress/step retry, atomic finalize, terminal failure, cancellation |
| COMPLETED / FAILED / CANCELLED | Same terminal state | Duplicate events are no-ops; retry creates a new job |

The provider/post-processing/delivery stage is separate from public job status. A worker can promote PENDING directly to PROCESSING if it wins the race before outbox bookkeeping; the publisher may not overwrite that state with QUEUED.

Cancelled jobs may still have physical execution. Updating executionFinishedAt or provider usage does not resurrect status. New UI treats cancellation separately from failure; legacy status mapping is confined to the temporary facade.

Queue schema v1: schemaVersion, jobId, requestId, studioSessionId, clientRevision, intent, modelId, inputAssetId, inputHash, validated prompt/settings, deadlineAt, traceId. Unknown versions fail before provider invocation. Authoritative owner/cost are reloaded by finalization, not trusted from callback data.

Internal claim: POST /api/internal/generations/:id/claim with worker service credentials returns attemptId, runToken and checkpoint or skip reason. Heartbeats carry that token; recovery checks BullMQ execution state/lock and deadlines. The API must not assume a missing socket update proves a dead execution.

Callback envelope: schemaVersion, eventId, jobId, attemptId, runToken, sequence, type, occurredAt, small data. Required nonempty service secret, constant-time verification, TLS outside local environments. Never expose run tokens in browser payloads/logs. Event IDs remain stable for delivery retries; sequence is monotonic per attempt and resets only when the API grants a new attempt.

After commit, return 200 with acknowledged=true and applied=true/false; duplicates/stale events with valid auth can be acknowledged without effects. Invalid auth is 401/403, malformed schema is 400, uncommitted processing failures are 5xx. Worker completion requires a valid acknowledgment, not just any 2xx body.

Socket event generation.updated includes schemaVersion, jobId, session/revision, stateVersion, status, stage, nullable progress, result references/sanitized error. Do not present guessed percentages as measured inference progress. Subscribe with ownership acknowledgment, then GET a snapshot to close the race. Reconnect repeats this; active-job polling backs off from 2 to 10 seconds with jitter and stops at terminal/offline/unmount. Connection failure is a connection state, not FAILED.

## 6. Separate HTTP image simulator

The simulator emulates **documented subsets**, not full OpenAI/Gemini services. It shares deterministic rendering and fault controls, with separate protocol serializers. Both production adapters must call it over HTTP through their normal serialization/decoding path.

| Facade | Request | Successful response |
| --- | --- | --- |
| OpenAI POST /v1/images/generations | Bearer key; JSON model, prompt, n=1, size, quality, output_format=png | 200 with created, data containing b64_json; x-request-id |
| OpenAI POST /v1/images/edits | Bearer key; multipart image or one image[] plus supported fields | Same output shape, input bytes validated |
| Gemini POST /v1beta/models/{model}:generateContent | x-goog-api-key; contents/parts with text and optional inlineData; supported generationConfig | candidates with content.parts image inlineData and supported completion metadata |
| GET /health | No secret output | Simulator readiness only |

References: [OpenAI generations](https://developers.openai.com/api/reference/resources/images/methods/generate), [OpenAI edits](https://developers.openai.com/api/reference/resources/images/methods/edit), [Gemini generateContent](https://ai.google.dev/api/generate-content). Pin fixtures to the selected contract/SDK version when A2 implements them.

Use explicitly named fixture model IDs such as simulated-openai-image and simulated-gemini-image; these are Bobby simulator identifiers, not actual vendor models. Configure the live provider model separately. OpenAI facade initially supports n=1 and sizes 1024x1024, 1536x1024, 1024x1536 with low/medium/high quality. Gemini facade validates its own supported image configuration; do not forward OpenAI size/quality fields unchanged. Unsupported streaming, masks, extra images or unknown fields fail explicitly until implemented.

For GPT Image output, decode base64; do not rely on response_format=url. Do not assume seed, negative prompt or cancellation capabilities without selected-model documentation. Gemini may return text/no image or safety-related outcomes; the adapter must not interpret any HTTP 200 as a generated image.

### Keys and deterministic output

- Simulator keys exist only in worker/simulator configuration and use a clearly local prefix. Validate nonempty keys without timing-sensitive string comparison; missing/wrong/revoked keys trigger the matching facade's native error shape. OpenAI uses its auth error form; Gemini invalid-key/permission scenarios preserve its distinct 400/403-style contract as verified for the chosen API.
- Sharp renders valid PNGs from licensed fixtures/geometric content, prompt hash, image bytes and settings. Same inputs and renderer version produce identical image bytes; request IDs/timestamps may differ. This verifies transport and lifecycle, not model reasoning or visual quality.
- No external downloads or arbitrary URL inputs. Bounded image decode, request size, latency and memory; cancellation interrupts timers/work when supported.
- Fault scenarios are server configuration or isolated test-key policies: success, validation, auth, permission, throttling with Retry-After, exhausted quota, transient 503, timeout, malformed output, connection reset, safety/no-image response. Deterministic scenarios/counters avoid random flaky tests.
- In-memory scenario counters are sufficient for a single local/CI simulator. Do not build a billing/key-management product for the simulator. It is not shipped as a production application dependency.
- Optional x-bobby-simulated diagnostics are Bobby extensions, not vendor standards. A fake idempotency extension cannot prove live provider idempotency.

### Switching profiles

IMAGE_PROVIDER selects openai or gemini; IMAGE_PROVIDER_MODE selects simulated or live; a validated profile supplies endpoint, model and capabilities; IMAGE_PROVIDER_API_KEY supplies the selected credential. The adapter implementation is unchanged. Never select by guessing a key prefix or silently fail over to another vendor.

Simulator completion does not prove live model availability, account permissions, quota, billing or exact vendor error behavior. Actual paid smoke is separately recorded and budgeted when authorized. No code changes should be necessary for that activation.

## 7. Error and retry policy

| Normalized error | Automatic retry | User behavior |
| --- | --- | --- |
| INVALID_INPUT / UNSUPPORTED_CAPABILITY | No | Field error, retain draft |
| PROVIDER_AUTH / PROVIDER_QUOTA_EXHAUSTED | No | Pause auto, actionable message, operational diagnostics |
| PROVIDER_RATE_LIMITED | Within deadline and Retry-After | Show retry timing, coalesce pending |
| PROVIDER_UNAVAILABLE | Only when the phase/provider policy makes retry safe | Bounded exponential backoff + jitter, at most three total attempts initially |
| PROVIDER_OUTCOME_UNKNOWN | No blind paid reinference | Reconcile; explicit user retry is a new intent |
| STORAGE_UNAVAILABLE / CALLBACK_UNAVAILABLE | Retry the failed step | Reuse inference checkpoint |
| CANCELLED / SUPERSEDED / STALE_REVISION | No | Do not show a generic failure toast |

Timeout/5xx does not always prove zero provider cost. Distinguish pre-dispatch failures from unknown external outcomes. [OpenAI error guidance](https://developers.openai.com/api/docs/guides/error-codes) also distinguishes rate limiting from exhausted quota; normalizing errors must preserve that decision.

## 8. Retention

Initial proposal: preview assets expire after 24 hours unless saved; save atomically promotes retention and does not call inference. Keep inputs/checkpoints while work/delivery remains unresolved; failed debug assets may have a seven-day bounded retention. Final library assets follow an explicit product policy, not automatic deletion inherited from queue TTL. Cleanup verifies references and a safety interval. Signed URL expiry does not erase a durable result.
