# Image provider simulator and adapters

Implements contracts section 6 and 7 of [generation contracts](generation-contracts.md). The simulator replaces only image inference. The worker adapters in `worker/src/providers/` are the production code path and run unchanged against a simulator or a live endpoint.

**Compatibility claim.** The simulator and adapters support the documented subsets below, checked against the OpenAI Images reference as reflected in the `openai` SDK 7.28.0 type definitions and the Gemini `generateContent` reference as reflected in the `@google/genai` type definitions. The vendor documentation sites were not reachable when this was written, and no live call has been made. Simulator success does not prove live model availability, account permissions, quota, billing or exact vendor error behavior.

## Simulator (`image-simulator/`)

Plain Node + TypeScript, one dependency (`sharp`). Not a production dependency.

| Item | Value |
| --- | --- |
| Build / start | `yarn --cwd image-simulator build`, then `node dist/main.js` |
| Config (own `.env` or process env) | `SIMULATOR_API_KEY` (required, at least 16 chars, local `sim-local-...`), `SIMULATOR_PORT` (4010), `SIMULATOR_HOST` (127.0.0.1), `SIMULATOR_LATENCY_MS` (800, max 30000) |
| Health | `GET /health` returns `{"status":"ok","simulated":true}`; no key, no secrets |
| Limits | request body 16 MiB (413), input image 10 MiB and 16 megapixels (400), no outbound network, no URL inputs |
| Marking | every response carries `x-bobby-simulated: true`; images end in a hazard-stripe band |
| Models | `simulated-openai-image` (OpenAI facade), `simulated-gemini-image` (Gemini facade); other names return the native not-found error |

### OpenAI facade subset

- `POST /v1/images/generations`: JSON with `model`, `prompt` (non-empty, at most 32000 chars), `n` (must be 1), `size` (`1024x1024`, `1536x1024`, `1024x1536`), `quality` (`low`, `medium`, `high`, `auto`; `auto` renders as medium), `output_format` (`png` only).
- `POST /v1/images/edits`: multipart with the same text fields plus exactly one image in `image` or `image[]` (PNG/JPEG/WebP with matching MIME type).
- `Authorization: Bearer <key>`. Success: `{created, output_format, quality, size, data:[{b64_json}], usage}` with `x-request-id`. Usage token counts are synthetic.
- Rejected with 400 in `{error:{message,type,param,code}}`: unknown fields (`unknown_parameter`), documented-but-unimplemented fields such as `stream`, `response_format`, `mask`, `background`, `moderation`, `user` (`unsupported_parameter`), `n` other than 1, other sizes/qualities/formats, zero or several images. Missing/wrong key: 401 (`code` null / `invalid_api_key`).

### Gemini facade subset

- `POST /v1beta/models/{model}:generateContent`, key in `x-goog-api-key` (header wins) or `?key=`.
- Body: `contents` with exactly one entry (`role` `user` optional) holding one text part and at most one `inlineData` image part (`mimeType`, `data`; snake_case aliases accepted); optional `generationConfig` with only `responseModalities` (`["IMAGE"]` or `["TEXT","IMAGE"]`) and `imageConfig.aspectRatio`. Anything else (`tools`, `systemInstruction`, `imageSize`, OpenAI-style size/quality, unknown names) returns 400 `INVALID_ARGUMENT`.
- Aspect ratio to output size (Bobby fixture sizes modeled on the documented 1K outputs): `1:1` 1024x1024, `2:3` 832x1248, `3:2` 1248x832, `3:4` 864x1184, `4:3` 1184x864, `9:16` 768x1344, `16:9` 1344x768. Default `1:1`.
- Success: `candidates[0].content.parts` with an `inlineData` PNG (plus a text part when TEXT is requested), `finishReason: "STOP"`, `usageMetadata`, `responseId`. Errors: `{error:{code,message,status,details}}`; invalid key is 400 `INVALID_ARGUMENT` with `ErrorInfo.reason` `API_KEY_INVALID`, missing key is 403 `PERMISSION_DENIED`.

### Deterministic rendering

Output PNG bytes are a pure function of renderer version (`bobby-sim-render-1`), prompt hash, input image bytes, exact size and quality. A hash-seeded gradient and shapes are drawn into a raw buffer, the decoded input image is blended in when present, and Sharp encodes the PNG. No clock, `Math.random` or external assets. It verifies transport and lifecycle, not model behavior.

### Scenarios

`success`, `auth`, `permission`, `validation`, `rate_limit`, `quota`, `unavailable`, `timeout`, `malformed` (valid base64 of non-image bytes), `malformed_base64`, `truncated_image` (half a PNG), `reset` (socket destroyed), `no_image`, `safety`.

| Scenario | OpenAI facade | Gemini facade |
| --- | --- | --- |
| auth | 401 `invalid_api_key` | 400 `INVALID_ARGUMENT`, reason `API_KEY_INVALID` |
| permission | 403 `permission_denied` | 403 `PERMISSION_DENIED` |
| validation | 400 `invalid_value` | 400 `INVALID_ARGUMENT` |
| rate_limit | 429 `rate_limit_exceeded`, `Retry-After: 1` | 429 `RESOURCE_EXHAUSTED`, `Retry-After: 1`, `RetryInfo` 1s |
| quota | 429 type/code `insufficient_quota` | 429 `RESOURCE_EXHAUSTED`, `QuotaFailure` per-day, no retry hint |
| unavailable | 503 `server_error` | 503 `UNAVAILABLE` |
| timeout | connection held until the client aborts (cap 120 s) | same |
| malformed, malformed_base64, truncated_image | 200 with bad `b64_json` | 200 with bad `inlineData.data` |
| reset | connection destroyed | same |
| no_image | 200 with `data: []` | 200 text-only candidate, `STOP` |
| safety | 400 `moderation_blocked` | 200, `finishReason` `IMAGE_SAFETY`, no content |

Real authentication and request validation always run first; the scenario applies to otherwise valid requests.

### Scenario control protocol

All control endpoints need the simulator key (`Authorization: Bearer <key>` or `x-goog-api-key`); otherwise 401. They are never reachable without it.

- `POST /__sim/scenario` with `{"scenario": "<name>", "times": N, "then": "<name>"}`. `times` (1 to 1000000) is optional; without it the scenario stays until reset. After `times` faulted requests the `then` scenario applies (default `success`). Setting replaces any earlier setting. Response: `{status:"ok", scenario:{scenario,remaining,then}}`.
- `POST /__sim/reset` restores `success`, clears counters and the request log.
- `GET /__sim/requests` returns `{received, byRoute, recent, scenario}`. `received` counts facade requests at arrival (routes `openai.generations`, `openai.edits`, `gemini.generateContent`); `recent` holds the last 100 `{route, scenario, status}` entries with `status: null` when the connection was cut or aborted. It never records prompts, keys or image data.
- Per-request override: header `x-bobby-simulator-scenario: <name>[:<n>]`. Without `:n` it applies to that request. With `:n` the first n requests that send the identical header value fault and later ones succeed (counted per header value, cleared by reset). It overrides the global scenario. A malformed value returns 400, never silent success.
- `x-bobby-simulator-latency-ms: <0..30000>` overrides the default latency for one request (400 when invalid). Latency timers and held connections stop when the client disconnects.

Production adapters never send Bobby headers, so adapter and end-to-end tests select scenarios with the global endpoint and run one simulator per test file.

## Adapters (`worker/src/providers/`)

`provider.port.ts` defines the neutral port, `ProviderError` and capabilities; `provider.registry.ts` exports `createImageProvider(config.imageProvider, logger?)`, a static switch on `config.id`. It never infers a provider from a key prefix and never falls back. Adapters use Node `fetch`, no vendor SDK, and perform zero retries: the caller is the single retry owner. Redirects are refused so traffic cannot move to another host. Responses are read with a 32 MiB cap (64 KiB for error bodies). Logs contain provider, correlation id, status and duration only. `ImageGenerationOutput.images[]` additionally carries measured `width` and `height`.

The wire model is `IMAGE_MODEL` from the validated profile; `input.modelId` is the Bobby catalog id and is not sent. Base URLs exclude the version path (`https://api.openai.com`, `https://generativelanguage.googleapis.com`).

### OpenAI mapping

| Bobby | Wire |
| --- | --- |
| no input image | `POST {base}/v1/images/generations`, JSON |
| `sketch_to_image` / `image_to_image` with input image | `POST {base}/v1/images/edits`, multipart, one `image` part |
| fields sent | `model`, `prompt`, `n=1`, `size`, `quality`, `output_format=png` (nothing else) |
| size | exact `WxH` from {1024x1024, 1536x1024, 1024x1536}; any other size is `UNSUPPORTED_CAPABILITY` (never silently changed) |
| quality | `preview` is `low`, `standard` is `medium` |
| auth | `Authorization: Bearer <key>` |
| output | `data[0].b64_json` decoded strictly; magic bytes (PNG/JPEG/WebP) and a full bounded decode; measured dimensions returned |

### Gemini mapping

| Bobby | Wire |
| --- | --- |
| request | `POST {base}/v1beta/models/{model}:generateContent` |
| parts | `{text: prompt}` then optional `{inlineData: {mimeType, data}}` |
| `generationConfig` | `responseModalities: ["IMAGE"]`, `imageConfig.aspectRatio` only |
| size | exact match to the table above, else `UNSUPPORTED_CAPABILITY`; the aspect ratio is derived, `imageSize` is never sent |
| quality | accepted but not sent (`qualityAffectsOutput: false`) |
| auth | `x-goog-api-key` header (never in the URL) |
| output | every `inlineData` image part decoded and verified; text-only, `promptFeedback.blockReason` or a non-`STOP` finish reason without an image is `PROVIDER_NO_IMAGE` |

### Error normalization

| Condition | Code | outcomeUnknown |
| --- | --- | --- |
| input rejected before sending (size, mode, prompt, image) | `INVALID_INPUT` / `UNSUPPORTED_CAPABILITY` | false |
| 401, 403, Gemini 400 `API_KEY_INVALID` | `PROVIDER_AUTH` | false |
| 429 `insufficient_quota` / `billing_hard_limit_reached`; Gemini 429 per-day quota without retry hint | `PROVIDER_QUOTA_EXHAUSTED` | false |
| other 429 | `PROVIDER_RATE_LIMITED` with `retryAfterMs` from `retry-after-ms`, `Retry-After` or Gemini `RetryInfo` | false |
| 404 | `UNSUPPORTED_CAPABILITY` | false |
| other 4xx | `INVALID_INPUT` | false |
| 502, 503 | `PROVIDER_UNAVAILABLE` | false |
| 500 | `PROVIDER_UNAVAILABLE` | true |
| 408, 504, deadline reached after send, connection reset or broken after send | `PROVIDER_OUTCOME_UNKNOWN` | true |
| connection refused, DNS failure, deadline already elapsed | `PROVIDER_UNAVAILABLE` | false |
| abort after send / before send | `CANCELLED` | true / false |
| bad JSON shape, invalid base64, non-image or truncated bytes, oversized body | `PROVIDER_MALFORMED_OUTPUT` | false |
| empty `data`, OpenAI `moderation_blocked`, Gemini text-only or blocked | `PROVIDER_NO_IMAGE` | false |

Messages and `providerErrorCode` never contain keys, prompts, base64 or provider free text. The Gemini quota-versus-rate-limit split is a heuristic over documented detail fields and is unverified against live behavior.

## Activation

Local development (done by `node scripts/setup.mjs`): `IMAGE_PROVIDER` is `openai` or `gemini`, `IMAGE_PROVIDER_MODE=simulated`, `IMAGE_PROVIDER_BASE_URL=http://127.0.0.1:4010`, `IMAGE_PROVIDER_API_KEY` equal to `SIMULATOR_API_KEY`, `IMAGE_MODEL=simulated-openai-image` or `simulated-gemini-image` (must match the selected facade). Start with `node scripts/dev.mjs start`.

Live profile: change only these worker settings, with no code change:

| Setting | OpenAI | Gemini |
| --- | --- | --- |
| `IMAGE_PROVIDER` | `openai` | `gemini` |
| `IMAGE_PROVIDER_MODE` | `live` | `live` |
| `IMAGE_PROVIDER_BASE_URL` | `https://api.openai.com` | `https://generativelanguage.googleapis.com` |
| `IMAGE_MODEL` | an OpenAI GPT Image model id | a Gemini image model id |
| `IMAGE_PROVIDER_API_KEY` | live key | live key |

Routine key rotation changes only `IMAGE_PROVIDER_API_KEY`. Configuration validation already requires a loopback URL in simulated mode and https in live mode. A live smoke test is separately authorized, budgeted and recorded; the simulator does not substitute for it. Whether a given live model honors the requested sizes or aspect ratios is verified at that time.

## Verification

```
yarn --cwd image-simulator install --frozen-lockfile --mutex file:/tmp/.yarn-mutex
yarn --cwd image-simulator build && yarn --cwd image-simulator test    # facades, scenarios, limits over real HTTP
yarn --cwd worker test                                                  # adapters against the built simulator process (V05, V06)
```

Both adapters run the same shared scenario table; each case asserts the normalized error, `outcomeUnknown`, `retryAfterMs` and that the simulator saw exactly one request.
