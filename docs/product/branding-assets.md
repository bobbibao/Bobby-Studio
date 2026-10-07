# Bobby Studio branding assets

Updated on 2026-10-06. The authentication welcome gallery is replaced by one decorative courtyard image. It is brand artwork, not a generated customer asset or a simulator inference result. Legacy background files are retained but are no longer imported by the auth layout.

## Assets

- `frontend/src/assets/img/auth/bobby-studio-courtyard.webp`: 1024 × 1536, 301,988 bytes. Created with the built-in imagegen tool and encoded as WebP (quality 88). The original generated PNG remains in the local Codex generated-images directory.
- `frontend/src/shared/icons/BobbyLogoIcon.tsx`: editable SVG violet B mark with a small sparkle.
- `frontend/src/shared/icons/BobbyTextIcon.tsx`: Bobby / STUDIO wordmark using text, replacing the legacy Vizera paths.
- `frontend/public/bobby-mark.svg`: matching browser favicon.

The shared logo is used by authentication, sidebar, loading and existing onboarding/survey consumers. The wordmark follows light/dark text colors; the violet mark remains consistent. The auth artwork is decorative and hidden from assistive technology. Below the desktop breakpoint, the artwork is hidden and the auth form uses the full available column with a bounded maximum width; short screens can scroll to all controls.

## Final generation prompt

> Use case: ads-marketing. Asset type: portrait welcome artwork for Bobby Studio, a professional image creation app with violet accent. Create a premium editorial architectural photograph: sculptural cream limestone creative studio opening into a quiet planted courtyard, graceful curved doorway, brushed violet glass sculpture on a low plinth, soft lavender and warm daylight, olive trees, subtle textured plaster and travertine. Refined realistic materials, spacious thoughtful composition, architectural photography, portrait 2:3 composition. Beautiful as a single full-height image on the right of a login screen. No UI, no letters, no logos, no watermark, no people, no collage. This is decorative brand artwork, not a user-generated result.

## Verification

- `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` in frontend: passed.
- Direct ESLint invocation on the eight touched TSX files: no errors, nine existing unused-variable warnings in SignIn/SignUp.
- `node node_modules/vite/bin/vite.js build` in frontend: passed; the new WebP is bundled. Existing large-chunk and outdated Browserslist-data warnings remain.
- Chrome UI: new artwork and logo visible on desktop; both auth forms fit a measured 390 × 844 viewport; dark theme inspected; shared loading mark and expanded/collapsed sidebar inspected. Temporary viewport override reset.
- Screenshots: `.data/ui-qa-direct/branding-desktop.jpg`, `branding-mobile.jpg`, `branding-dark.jpg`, `branding-sidebar.jpg`.

No test script files were run. These checks concern branding and auth layout only. The remaining authentication and product findings in [direct UI QA](../delivery/direct-ui-qa-2026-10-06.md) are not closed by this visual update.
