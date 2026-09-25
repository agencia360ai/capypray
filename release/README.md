# CapyPray — release preparation, 2026-09-25

**Decision: NOT READY TO SUBMIT.** Local implementation and store materials are prepared; store credentials, app-specific public policies, signed builds, and real native purchase tests are outstanding. No store submission or production rollout was performed.

Source reviewed: `d272d47` (latest origin/main at review start): four new puzzle games and 465 newly recorded Capy Pirate narration files. Bundle/package: `com.looplab.capypray`; proposed first store version: `1.0.0`; English content pack: `0.13.0`.

## Deliverables

- `store-copy.en-US.md` / `store-metadata.en-US.json`: Apple name, subtitle, promotional copy, keywords, full description; Google title, short/full description; version notes, categories and target-audience proposal. Character limits checked.
- `store-assets/`: opaque 1024 Apple icon, 512 Google icon, 1024×500 Play feature graphic, generation prompts/provenance. Runtime icon configured.
- `screenshots/`: actual app web captures with a fictional Mia profile, candidate size exports, contact sheet. **Not native captures and not approved for upload.** Replace/compare with native builds before submission; do not claim simulator/device testing from these images.
- `setup-and-submission.md`: exact IDs, products, EAS setup, signing/build/upload sequence and console checklist.
- `reviewer-notes.en-US.md`: onboarding/free-access/subscription instructions for app reviewers.
- `analytics-and-data-safety.md`: GA4 decision and draft disclosure inventory.
- `legal-addendum-DRAFT.md`: app-specific privacy/terms text for owner review and publication.

## Implemented release protections

- RevenueCat native purchase/restore adapter with `premium` entitlement and `default` offering. No hardcoded US prices in native offers; no unconditional trial promise. Canceled purchases grant nothing.
- Direct paywall navigation and purchase functions enforce the parent gate. Leaving the offer closes the gate.
- Production cannot activate the Expo Go simulation, debug Premium switch, free-play switch or stale persisted debug entitlements.
- Child profile/progress stays local in production; existing Supabase backup/account UI and first-party event upload are disabled pending consent and account-deletion work. This intentionally narrows first-release scope; it is not a completed cloud account implementation.
- No GA4/Firebase Analytics or ad SDK added to the child app. Website GA4 plan included separately; no property configured.
- Microphone/storage/advertising-ID/overlay/background-service permissions explicitly blocked in Expo config; iOS tracking description removed. Final signed manifest still needs inspection.
- EAS build profiles, environment template and preflight that refuses production without platform keys, EAS ID and approved published policies.
- Fixed SVG accessibility-prop warning on the prayer screen and aligned Expo peer versions after discovering an actual web bundling failure.

## Verification evidence

- 84 mobile tests passed after the settings follow-up, including native-adapter mocked tests and notification failure tests.
- 26 content tests and 2 audio inventory tests passed.
- Mobile TypeScript check passed.
- Content schema: 52 lessons, 43 prayers, 25 lesson minigames, 457 pack audio references. 465 bundled recordings include 8 parent lines. Validator's pack-local audio warning does not inspect the separate bundled mobile audio folder.
- Downloaded all 465 current narration files successfully. This checks file completeness, not human listening approval of every line.
- Avatar-web production build passed.
- iOS and Android production JS/Hermes export passed. This is **not** an IPA/AAB, native compilation, signing, installation, purchase, or device-performance test.
- Browser UI: introduction, three-line first prayer and reward, grown-up handoff, nickname/time settings, gate arrival, stories/page changes, locked reward art, Memory Pond card flips, Color Pour entry, collapsible lobby, correct monthly offer text, free exit and direct-paywall redirect.
- 320px paywall: CTA and free exit visible; no horizontal page overflow. Phone screenshots inspected. iPad capture tooling did not provide a reliable full viewport; tablet verification remains open.

## Blocking checklist

1. **RevenueCat**: current browser session shows only mmaflow and TaeFlow. Need CapyPray project or permission to create it here, platform connections/keys, both store products, `premium` and `default`; no other app's keys reused.
2. **Apple access**: App Store Connect is at login. Need authenticated owner session, app record, agreements/banking, signing and sandbox tests.
3. **Google access**: Play Console stopped at pending Terms of Service. Owner must review/accept before console setup can continue; no agreement accepted by the agent.
4. **Policies**: https://www.looplab.gg/privacy and /terms currently cover the website only, refer to looplab.studio, and exclude an under-13 audience. Publish the reviewed CapyPray section before these are appropriate store links. Confirm support email (current site lists hello@looplab.studio).
5. **Native QA**: signed Android internal-test AAB and iOS TestFlight build; fresh install, relaunch, offline mode, notifications allowed/denied, purchase, canceled/pending purchase, restore, renewal, expiry/billing retry, erase local data, interruption/background audio, Android back button, small screens, iPad, screen reader and large fonts.
6. **Final screenshots**: native iPhone and iPad captures and Android captures from the exact submitted build. Existing candidates are web previews. No native safe-area or platform chrome certification.
7. **Ownership/content**: confirm distribution rights for the 3D source, illustrations and cloned voice; listen to representative current voice lines and approve suitability for young children.
8. **Accessibility follow-up**: Color Pour jar contents, Block Garden cells and selectable pieces now have localizable spoken labels and accessibility actions. Test them on actual VoiceOver/TalkBack devices before claiming accessibility support. Do not mark store accessibility features as supported without verification.

## Before submission

Run `node tools/release-check.mjs --strict` after configuring the EAS environment. Today its missing-key/project/legal failures are expected and deliberate. Re-run native and store tests after configuration. Do not deploy the legacy Supabase RevenueCat webhook: it expects a parent UUID while this adapter uses anonymous IDs and its event-based billing logic needs revision.

No false green-light: the app has a release preparation package, not a completed store release.

## Settings follow-up

Closed in code: direct Restore purchases button, verified subscription status with retry/unknown states, serialized parent actions, expired-gate checks for sensitive actions, localized notification permission/error guidance and a device-settings shortcut. Reminder changes no longer cancel the old reminder before replacement succeeds, and cancellation errors are surfaced. Removed narration diagnostics; added app version and an explicit local-only progress explanation. Added labels for profile, people, bedtime controls and two puzzle games.

Validated 84 mobile tests and TypeScript, then re-exported production iOS/Android Hermes bundles successfully. The unchanged content/audio suites contribute another 28 previously passing tests (112 total). Browser checked at 390px and 320px, including bedtime changes and subscription section; no horizontal document overflow. A temporary local QA route opened the parent gate for this inspection and was removed before the final export. This is not a native notification, store transaction, or screen-reader test. The development server still displayed its old startup version (0.1.0); release config remains 1.0.0.

Remaining release blockers above still apply. Cloud backup and GA4 in the child app are not part of this first production scope. Do not merge this review branch as a claim of store readiness.
