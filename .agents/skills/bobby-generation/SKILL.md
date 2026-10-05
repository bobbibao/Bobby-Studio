---
name: bobby-generation
description: Implement or diagnose Bobby Studio image generation across its React editor, NestJS API, BullMQ worker and HTTP image simulator. Use for realtime scheduling, provider adapters, job lifecycle or recovery; not for unrelated billing, marketing pages or video work.
---

# Bobby Studio generation workflow

Read [repository instructions](../../../AGENTS.md) and the assigned task in [agent plan](../../../docs/delivery/agent-plan.md). Establish whether you are editing current implementation or realizing a proposed contract; planned filenames and commands may not exist yet.

## Route by boundary

- Editor/UI: [studio design](../../../docs/product/studio-design.md), sections 3–5 of [contracts](../../../docs/architecture/generation-contracts.md), current generation hook and socket client.
- API/state/credits: [architecture](../../../docs/architecture/overview.md) sections 3–7 and [contracts](../../../docs/architecture/generation-contracts.md) sections 3/5/7.
- Worker/provider: [contracts](../../../docs/architecture/generation-contracts.md) sections 2/5–8, worker bootstrap, provider port and post-processing processor.
- Baseline diagnosis: [source audit](../../../docs/architecture/source-audit.md). Recheck the cited code; findings may already be resolved.
- Legacy replacement: [cleanup inventory](../../../docs/delivery/cleanup-plan.md). Remove bypasses and fake business behavior after real replacements pass.
- Environment and autonomous checks: [execution runbook](../../../docs/delivery/autonomous-execution.md). Use Firebase's official emulator locally and automate browser flows when needed.

## Implement one complete slice

1. Trace one request from input snapshot to durable output and visible result. Record which layer owns identity, validation, queue admission, retry and finalization.
2. State the invariant your change repairs. Example: “revision 12 finishes after revision 13; revision 12 must not replace the preview.” Debouncing input without checking result identity does not repair that invariant.
3. Reuse existing ports/processors. Exercise OpenAI and Gemini adapters against their corresponding simulator HTTP contracts with local server-side keys; validate actual serialization, image decoding and native error mapping. Live activation changes configuration, not application logic.
4. Preserve the previous contract through an explicit adapter while migrating callers. Update the contract and consumers together, including unknown-version behavior for queue messages.
5. Validate the smallest set of meaningful scenarios from [verification](../../../docs/delivery/verification.md). For a cancel/finalize race, verify both transaction orderings and one credit capture; a service method call-count test alone is insufficient.
6. Report changed behavior, executed checks, observed results and remaining gaps. Update the assigned task's status only when its acceptance criteria are evidenced.

## Failure modes to check when relevant

- Default generation export is a page, not an API client.
- Fast mock completion may arrive before socket join or Redis metadata; read a durable snapshot after subscribe.
- Concurrent completion handlers can both pass a read-before-write status check. Use a conditional transition and unique output/credit identity in one transaction.
- A provider call that timed out may already have succeeded externally. Do not retry a paid call just because its callback or post-processing failed.
- Input preprocessing/upload can finish out of order. Guard each asynchronous boundary, including clear/undo and IME composition.
- Local uploads previously relied on a sibling API directory and URL rewriting. Verify compiled/container paths and keep mock traffic local.

All new work uses English and the Bobby Studio product name. Complete the production behavior in the assigned slice; do not replace auth, persistence or project operations with fake success to make a demo pass. Account setup, publishing, paid inference and delegation follow the user's current assignment and actual tool permissions, not implied authority from this skill.
