# Bobby Studio

A professional image creation workspace combining prompts, sketches, and reference images. Video generation is a future feature.

**Delivery target:** a production-quality application with real authentication, persistence, jobs, assets, library, and recovery. During development, only the external image inference service is replaced by a separately authenticated HTTP simulator. Official local infrastructure emulators support automated verification; they are not application-level bypasses.

The documents below describe the target and implementation plan after inspecting baseline commit **82958dc** on **2026-10-05**. Application implementation has not been completed by this planning change.

## Start here

| Purpose | Document |
| --- | --- |
| Architecture, boundaries, patterns, conventions | [Architecture overview](docs/architecture/overview.md) |
| Findings grounded in current source | [Source audit](docs/architecture/source-audit.md) |
| Public API, realtime, worker and provider protocols | [Generation contracts](docs/architecture/generation-contracts.md) |
| Legacy code removal and replacement inventory | [Cleanup plan](docs/delivery/cleanup-plan.md) |
| Implementation sequence and agent acceptance criteria | [Agent delivery plan](docs/delivery/agent-plan.md) |
| Environment, Firebase, credentials and autonomous verification | [Autonomous execution runbook](docs/delivery/autonomous-execution.md) |
| Checks, failure cases and release gates | [Verification](docs/delivery/verification.md) |
| Professional studio experience | [UI specification](docs/product/studio-design.md) · [Interactive prototype](docs/product/studio-prototype.html) |
| Repository instructions and reusable workflow | [AGENTS.md](AGENTS.md) · [Generation skill](.agents/skills/bobby-generation/SKILL.md) |

## Product commitments

- Prompt, sketch + prompt, and reference + prompt generation.
- Optional realtime with debounce, bounded in-flight work, cancellation, and protection against stale results.
- OpenAI and Gemini adapters, each exercised through the corresponding simulator protocol. No production UI or business-logic fork for simulated inference.
- Real account isolation, project/library operations, history, retry, save, and download. No fabricated business records or successful responses for unimplemented actions.
- English for all new code comments, documentation, UI source copy, errors, and logs. Existing Vietnamese content has a scheduled migration; retain translations and user-authored content.
- Automated setup, browser checks, failure recovery and release evidence; manual verification is an exception with a named reason.

## Switching to live inference

A fake key cannot authenticate to OpenAI or Gemini. The development simulator accepts a local key at its own endpoint. Live activation changes the selected provider profile, mode, model configuration and secret, without changing application code. Once a live profile is selected, routine key rotation changes only the secret. Never infer provider identity from a key prefix.

## Current verification status

The standalone prototype has been exercised in Chrome with Playwright. It illustrates the interaction design and creates procedural preview images in the browser; it is not the HTTP simulator or the production React feature.

The three application dependency directories were absent at audit time. Application builds, migrations and end-to-end execution have not been verified in this planning work. See the [audit](docs/architecture/source-audit.md) and the mandatory A0–A8 [delivery tasks](docs/delivery/agent-plan.md).

The current repository folder and historical package identifiers have not been renamed. The product name is **Bobby Studio**; product metadata, navigation and existing branding are included in the cleanup plan.
