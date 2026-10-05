# Bobby Studio product and interface specification

**Target UX; the standalone [prototype](studio-prototype.html) is a review artifact, not the production React implementation.** Current implementation: [SDXL studio](../../frontend/src/features/admin/pages/admin/generate/components/SdxlStudio/SdxlStudio.tsx).

## 1. Product direction

Build a professional creative workspace with clear hierarchy, fast interaction and trustworthy state. The central loop is describe → preview → refine → keep. Prompt, sketch and reference input are first-class modes; architecture is an example use case, not a hardcoded product constraint.

Use the name **Bobby Studio** everywhere users encounter the product. New UI source copy is English through i18next. Existing Vietnamese hardcoded strings are migrated in A6; preserve actual localized catalogs and customer-authored content. English is the default/fallback, with explicit user language preference supported.

Do not place thesis content, provider implementation details, raw queue statistics, promotional banners or nonfunctional actions in the creative workspace. Video is future functionality and must not appear as an active generation workflow.

## 2. Information architecture

- Studio: input, canvas, preview, generation settings and current session versions.
- Library/projects: actual saved assets and folders, search/filter/pagination, organize, rename, delete and download.
- Account/settings: identity, preferences, language and actual usage/entitlement information.
- Optional billing/team/admin features: expose only when complete and authorized for the user; otherwise explicitly defer them. Never substitute fabricated data.

Retain useful routes with transitional redirects rather than breaking existing project links. Required studio/library/account behavior cannot be hidden to claim completion.

## 3. Workspace layout

~~~text
+------+----------------------------------------------------------+
|      | Bobby Studio / Project name             Account / Usage  |
| Nav  +----------------+-----------------------------------------+
|      | Prompt         | Input mode        Realtime [on/off]     |
|      |                +-------------------+---------------------+
|      | Model          | Sketch/reference  | Result              |
|      | Aspect ratio   | Drawing tools     | Local status        |
|      | Advanced       |                   | Compare/download    |
|      | Generate       +-------------------+---------------------+
|      |                | Saved versions / session history        |
+------+----------------+-----------------------------------------+
~~~

At desktop widths around 1280 px and above, use a compact navigation rail, approximately 280 px controls and a flexible input/result workspace. At intermediate widths collapse controls into a drawer/row instead of compressing three unreadable columns. Below 768 px use a single column with accessible input/result tabs and a reachable primary action; the keyboard must not cover essential controls.

The canvas is the work surface, not a decorative card. Keep input/output proportions comparable, preserve source aspect ratio, allow fit/zoom/pan and provide enough room for precise drawing. Session versions can scroll horizontally; the library uses pagination rather than loading all history.

## 4. Visual system

Reuse [Chakra theme](../../frontend/src/theme/index.ts) and [existing violet brand colors](../../frontend/src/theme/components/colors.ts). Do not introduce a competing component system for this redesign.

| Element | Direction |
| --- | --- |
| Surface | Quiet neutral background, white panels, clear canvas boundary |
| Text | High-contrast charcoal primary and readable muted secondary text |
| Accent | Existing violet, reserved for primary action/selection/focus |
| Typography | System sans initially; 14–16 px body, restrained 24 px headings |
| Spacing | Consistent 4/8/12/16/24/32 px scale |
| Shape | 8–12 px controls, approximately 16 px panels; avoid nested decorative cards |
| Motion | Brief 120–180 ms transitions, reduced-motion support |
| Status | Text/icon plus color; never color or animation alone |
| Target quality | WCAG 2.2 AA checks for the implemented screens, visible focus and practical touch targets |

Support the existing light/dark theme deliberately in production, including neutral canvas behavior and readable output controls. Prototype is a light-theme reference, not proof of dark-mode accessibility. Use logical CSS spacing/alignment where practical so later localization does not require a layout rewrite.

## 5. Feature decomposition

Proposed components: StudioPage, PromptPanel, SketchCanvas, ReferenceInput, ResultPanel, GenerationToolbar, VersionStrip. Proposed hooks: useGenerationDraft, useRealtimeGeneration, useGenerationEvents. Place them in the [generation feature](../../frontend/src/features/generation), migrating implementation out of admin routing wrappers incrementally.

TanStack Query owns server state; local hooks own draft/strokes/tool selection. Extract shared primitives only when reused. Avoid both Redux and a new store independently deciding which job/result is current.

## 6. Interaction and state contract

| Situation | Required experience |
| --- | --- |
| Empty workspace | Clear prompt/sketch/upload entry points and optional labeled examples |
| Prompt-only | No required sketch; do not submit a blank canvas as reference |
| Sketch + prompt | Pointer drawing, brush size, eraser, undo/redo, clear, fit/zoom and export/upload |
| Reference + prompt | Preserve uploaded image color/content; preprocessing follows provider capability |
| Auto off | Editing makes no inference request; Generate uses the current immutable snapshot |
| Auto on | Debounce and latest-pending behavior from [contracts](../architecture/generation-contracts.md), visible usage control |
| Updating | Retain the previous successful image and mark it as being updated |
| Input changed during execution | Never display an obsolete result as the new input's output |
| Stop/cancel | Distinguish requested cancellation from confirmed execution termination; no false refund claim |
| Success | Keep preview, create final, compare with input, or download the selected version |
| Invalid input | Inline field feedback, retain prompt and sketch |
| Throttled | Explain wait/retry timing; no repeated toast storm |
| Connection loss | Reconnecting/offline status, retained draft/image and snapshot recovery |
| Provider auth/quota failure | Pause auto and show actionable sanitized feedback |
| Expired preview | Explicit expiry with regenerate option, not a broken image |
| Loading library | Real skeleton/empty/error state, never substitute fake assets |

Primary copy: Generate, Stop, Save version, Download, Realtime. Distinguish unsaved previews from retained library assets. Development/staging shows Simulated inference as environment metadata. Production UI shows the configured model and real usage estimate; never ask ordinary users to manage infrastructure keys inside the canvas flow.

Prompt enhancement is an explicit optional action. It must not run on each keystroke, mutate the draft into a generation loop or hide a paid dependency in local development.

Draft recovery is part of A6: persist bounded user/session-scoped drafts with owned input references, restore after navigation/reload and avoid mixing users. A draft save is not an inference submit. Do not store raw image base64 in global Redux/localStorage; use an appropriate bounded local draft store or server-backed session assets. Apply version checks to asynchronous draft saves.

## 7. Canvas, accessibility and global behavior

- Keep Pointer Events with normalized stroke coordinates and devicePixelRatio-aware rendering. Bound stroke history and exported pixels; no PNG serialization/preprocessing/global state update on each pointer move.
- Commit safely on pointer up/cancel/lost capture. Eraser behavior must be consistent with the chosen opaque sketch background. Clear/undo/upload participate in revision tracking.
- Keyboard: Ctrl/Cmd+Enter generates; canvas-focused Ctrl/Cmd+Z and Shift+Z undo/redo without intercepting textarea editing. Escape closes active dialogs/tools rather than deleting content.
- Accessible names on all controls; proper switch semantics, visible focus, modal focus management, polite state announcements and a non-drawing alternative through prompt/upload.
- Support composition events, Unicode text, long prompts and localized labels without overflow. Keep user prompts unchanged except documented normalization.
- Use Intl for viewer-local dates/numbers/file sizes; store timestamps in UTC. Do not use country flags as language controls. Preserve translation keys and test missing-key fallback.
- Do not rely only on screenshot snapshots to claim accessibility. Exercise keyboard, touch, zoom and screen-reader semantics where applicable.

## 8. Prototype scope

The [HTML prototype](studio-prototype.html) demonstrates responsive layout, prompt entry, drawing/undo/redo, optional debounce, latest pending input, cancellation, simulated errors, version saving and PNG download. The starting [reference image](../../frontend/src/assets/img/generate-styles/ModernStyle.jpg) is labeled as an existing sample; newly rendered images are procedural canvas illustrations, not model inference.

The prototype does not authenticate, call the HTTP simulator or persist after the page closes. Production reference upload, comparison/zoom, durable draft/library behavior, mobile tabs and dark mode belong to A4/A6. Verify asset provenance before public reuse. The prototype is never imported into the production app as a substitute for these features.

## 9. Production UI acceptance

At 390/768/1440 px: no horizontal overflow, reachable actions, usable keyboard/touch controls and no lost draft on failure. Verify current-result identity, auto off behavior, selected-version download, connection recovery, real project mutations and every visible action. Review both empty and populated screens, slow/failure states, long English/localized labels and light/dark themes. Use the [verification matrix](../delivery/verification.md) and automated browser evidence rather than routine manual sign-off.
