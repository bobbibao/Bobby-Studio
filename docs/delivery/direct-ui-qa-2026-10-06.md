# Direct Chrome UI verification — 2026-10-06

## Verdict

Follow-up: the [branding update](../product/branding-assets.md) replaced the legacy logo/gallery and verified both auth forms at 390 pixels, resolving the observed auth clipping and branding mismatch. Other findings below remain open. The original findings are retained as historical evidence.

Not ready for production. This session exercised the application through the connected Chrome browser, using visible controls and native keyboard/pointer input. No test script files, test suites, direct API requests, injected application actions, or authentication bypasses were used for acceptance checks.

Environment: frontend 4200, API 3000, official Firebase Authentication Emulator, PostgreSQL/Redis, worker and HTTP image simulator. This is local simulated inference, not production Firebase/email delivery or live OpenAI/Gemini verification. The API was rebuilt with `node node_modules/@nestjs/cli/bin/nest.js build` and its owned compiled process restarted because the running artifact predated the cherry-picked source. Build passed. The initial email-verification HTTP 500 disappeared after restart and is not reported as a current source defect.

## Findings

| Priority | Finding and direct reproduction |
| --- | --- |
| High | Logout does not keep the session signed out. On Profile, click Log out: the UI navigates to Sign in. Navigate to `/projects` without entering credentials: the owned QA project reappears. This demonstrates continued access after the apparent logout; it does not establish cross-account access. |
| High | A browser-console Axios error included the request Authorization bearer token inside its serialized config. Observed during the initial stale-API failure. Error logging must redact credentials even on unexpected backend failures. No token is included in this report or screenshots. |
| High | At a measured 390-pixel viewport, Sign in clips the form off the left edge while the gallery occupies the right side. Labels, heading and inputs are cut off. This is clipping, not a demonstrated horizontal document overflow. |
| Medium | Profile locale is inconsistent after reload: the form and navigation switch to Vietnamese while the Language select still displays English. Reproduced after saving only First Name and Last Name. |
| Medium | Profile Overview says Generated Images = 5 but Recently Created Images = No Image Yet, despite visible recent generation history and a saved library image. |
| Low | Wrong-password login shows only “Login failed”; the user receives no useful explanation. Auth branding displays Vizera while the product and footer use Bobby. Project/folder timestamps include `-/-` placeholders. |

## Observed working behavior

- Anonymous opening of the initial home route reached Sign in. An unverified account could not enter Studio.
- Signup created a local emulator QA account. After the API restart, sign-in opened the verification modal; clicking “I'm Verified” before verification showed an explicit warning. Resend showed success and an enforced countdown.
- An existing owned, verified QA account signed in using the normal form. Language selection and the light/dark toggle changed the visible login UI.
- An empty project list showed an honest empty state. Required project name kept Create disabled. Creating and renaming a project persisted after reload. A child folder also persisted after reload. Free-plan project creation became disabled at its displayed limit.
- Settings explicitly identified the model as simulated OpenAI-protocol inference, with size and quality/credit options.
- Prompt generation transitioned from Waiting to start to Result ready, with a visible image, Final label, and credit change 99 to 98. Save version changed to Saved.
- Realtime prompt editing produced a Preview with the edited prompt, a second version, and credit change 98 to 97. Realtime was then turned off.
- A real pointer stroke enabled sketch Undo/Clear. Undo enabled Redo; Redo restored the stroke. Sketch generation returned a Final result and changed credits 97 to 96. Compare with input displayed both input/result and its comparison slider.
- History listed the prompt and sketch jobs as Ready. Returning to Studio restored final versions and the editor inputs; the transient preview was not restored.
- The saved prompt image appeared in Unassigned. Its Info panel matched the prompt, creation time and simulated model. Favoriting it placed an image in the Favorite page.
- Profile first/last name changes displayed a success toast and survived reload.

## Unverified boundaries and tool limitations

- Download was clicked, but the browser download event did not complete within the tool deadline. File delivery is inconclusive, not a confirmed application failure. Browser policy blocked inspection of `chrome://downloads`; no bypass was attempted.
- Reference mode correctly disabled Generate until an image was supplied. Upload was blocked because the Chrome extension lacks file URL access. The permission was not expanded; upload/generation in Reference mode remain unverified.
- A Stop attempt lost its target because the simulator finished the job before the next browser action. Cancellation/refund behavior remains unverified.
- Verification warning and resend UI were checked; actual new-user email delivery and verification completion were not. Continued product checks used a previously verified owned QA account through normal sign-in.
- A later Studio viewport override did not change the measured browser viewport (still 1150 pixels). No mobile Studio pass is claimed; the temporary override was reset. The earlier mobile Sign in evidence is a separate measured 390-pixel capture.
- Permanent deletion, paid subscription flows, Google OAuth, deployed HTTPS, real email, live provider inference, cross-account ownership rejection, fault recovery and retry/idempotency were not established by this UI-only session. Historical scripted results in `browser-qa.md` are separate evidence and were not rerun.

## Evidence and retained QA data

Screenshots are saved under `.data/ui-qa-direct/`: `mobile-sign-in.jpg`, `generation-saved.jpg`, `project-folder-persisted.jpg`, `profile-empty-recent-images.jpg`, `profile-locale-after-reload.jpg`, and `projects-accessible-after-logout.jpg`.

The local QA project `UI QA Renamed 2026-10-06`, folder `Direct UI QA`, saved simulated image/favorite and QA profile name remain available for inspection. No permanent data deletion or paid inference was performed.
