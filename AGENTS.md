# AGENTS.md

## Extension
- Path: `DASH/jobTODashboard`
- Purpose: Extract jobs to dashboard + client-side job application autofill.
- Updated: April 6, 2026

## What Was Implemented
- Added SpeedyApply-style autopilot hooks on autofill action:
  - `autoClickNextPage: true` (default from panel)
  - `autoSubmit: false` (safety default; can be enabled later)
- Auto Fill response now includes:
  - `skippedExisting` count (fields intentionally not overwritten)
  - `autopilot.clickedNext`
  - `autopilot.clickedSubmit`
- Added hostname-level telemetry aggregation in background worker:
  - runs / detected / filled / skippedExisting / autopilotNext / autopilotSubmit / lastRunAt
  - message actions:
    - `recordAutofillTelemetry`
    - `getAutofillTelemetry`

- Added production safety and policy controls:
  - Manifest now includes `storage` permission (required for telemetry/settings).
  - New panel settings for autopilot:
    - `Auto-click Next/Continue`
    - `Auto-submit final step (High Risk)`
  - `Auto-submit` now requires explicit confirmation before each run.
  - Autopilot now executes only when:
    - likely application context is detected
    - at least 3 fields were detected
    - at least 1 field was actually filled
    - target button is in/near a real form context
    - target button is visibly clickable (size/style/center-point hit-test guard)
  - Telemetry input is sender-validated and clamped in background.

- Added analytics UX in panel:
  - New `Autofill Analytics` section showing top domains by runs/fill-rate.
  - Background summary endpoint: `getAutofillTelemetrySummary`.
  - Rendering is host-sanitized before `innerHTML`.

- Added response-memory learning system (SpeedyApply-style):
  - New background handlers:
    - `getResponseMemory`
    - `saveResponseMemory`
  - Memory store key: `ff_response_memory` with capped size and merge/update logic.
  - Content script now:
    - loads memory cache on startup
    - uses memory as fallback when normal field matching finds no definition
    - captures question→answer pairs on submit and next/review/apply clicks
    - saves deduplicated memory entries back to extension storage
  - Added quality controls:
    - blocked sensitive-question patterns
    - type-aware matching threshold for textarea/select memory fills
    - panel toggle: `Learn from my form answers`

- Added adapter-specific autopilot selectors for major ATS:
  - Workday, Greenhouse, Lever, iCIMS, SmartRecruiters, Ashby, BambooHR
  - Selector-first strategy + existing scoring/safety checks

- Fixed URL slot precision issue (production correctness):
  - Removed portfolio fallback to LinkedIn URL.
  - Added strict URL-field disambiguation in scorer:
    - `LinkedIn URL` only accepts LinkedIn value.
    - `GitHub URL` only accepts GitHub value.
    - `Portfolio/Other website` only accepts portfolio value.
  - For explicit URL fields without matching source data, autofill now leaves blank
    instead of inserting wrong URL.

- Added adapter recommendation telemetry:
  - tracks unmatched labels per host
  - analytics summary now includes `adapterCandidates` with top unmatched labels

- Added additional sensitive-field protection:
  - Excluded password fields from all fill and step-detection selectors.
  - Added explicit sensitive input skip by type/name/id/autocomplete:
    - password
    - OTP / verification code / token / captcha-like fields
    - payment/autocomplete secrets (`cc-number`, `cc-csc`, etc.)
  - Added `autocomplete`-hint mapping to improve field-type accuracy.

## Key Files
- `content.js`
  - `fillFormFields` message now accepts `autopilot` settings.
  - `fillApplicationForm()` now tracks `skippedExisting`.
  - Added autopilot engine:
    - button discovery
    - next/submit intent scoring
    - destructive-action safeguards
    - click execution
  - Added telemetry sender call.
- `panel.js`
  - Auto Fill button now sends `autopilot` settings with profile payload.
  - Status toast now reflects auto-next/submit outcomes.
- `background.js`
  - Added telemetry storage and retrieval handlers.

## Current Safety Rules
- Never auto-click destructive actions (`cancel`, `discard`, `delete`, etc.).
- `autoSubmit` remains OFF by default.
- Existing user-entered values are not overwritten.

## Next Recommended Steps (SpeedyApply parity roadmap)
1. Add per-site adapter table for autopilot selectors:
   - Workday, Greenhouse, Lever, SmartRecruiters, iCIMS, SuccessFactors.
2. Add response memory quality controls:
   - confidence thresholds by field type
   - blocked-question patterns to avoid noisy entries
   - optional “forget this answer” UI per key
3. Add DOM-fixture tests:
   - multi-step wizard
   - custom dropdown widgets
   - React controlled inputs
4. Add analytics drill-down:
   - low fill-rate domains
   - top unmatched question labels
   - adapter recommendation list from telemetry
