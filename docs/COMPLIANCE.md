# Kids Category / COPPA checklist (GDD §11)

Status as of the S3 skeleton. ✅ done in code · ⏳ pending · 🧑 manual (consoles, legal).

| Requirement | Status | Where |
|---|---|---|
| No third-party analytics or ads SDKs | ✅ | none in `apps/mobile/package.json`; production event upload disabled (`src/backend/events.ts`). Launch analytics: store consoles + RevenueCat. See `release/analytics-and-data-safety.md` |
| No `localStorage`, no runtime LLM talking to the child | ✅ | store uses AsyncStorage/MMKV; no LLM dependency |
| No kid PII: no photos, voice, location, contacts | ✅ | only nickname (≤ 20 chars), age band, progress |
| Parental gate before paywall, settings, Parent Corner, links | ✅ | `src/parent/gate.ts`, `app/parent/gate.tsx` (math + 3 s hold, 5-min window, in-memory only) |
| No purchase nudges in the kid zone | ✅ | locked lessons show a lock; tapping goes to the gate, not a store |
| Delete child's data in one tap | ✅ | Parent Corner → Delete (local); `delete_kid()` RPC cascades server-side |
| Notifications only with parent permission | ✅ | reminder toggle lives in Parent Corner; permission requested there |
| Bedtime Prayer free forever | ✅ | `bedtime-w1.free = true` |
| RevenueCat without device identifiers | ✅ | `src/entitlements/purchase.ts`: anonymous RC id, `automaticDeviceIdentifierCollectionEnabled: false`, no attributes/integrations |
| Paywall shows price, period, trial, auto-renew terms, Terms + Privacy links, Restore | ✅ | `app/parent/paywall.tsx`, `src/parent/legal.ts` |
| No microphone / camera / location / AD_ID permissions | ✅ | `app.json` blockedPermissions; expo-audio mic permission off |
| Parent account | ✅ | v1 has no account (decision 2026-09-25): everything is on-device, purchases restore through the store account. Supabase stays optional |
| Privacy policy specific to kids + URL in App Store Connect | 🧑 | draft text in Parent Corner (`P.corner.privacy`); legal review needed |
| Age rating 4+, Kids Category band "Ages 6–8" | 🧑 | App Store Connect |
| Google Play "Designed for Families" | 🧑 | Play Console |
| Bible text licensing (WEB/KJV only) | ✅ | pack uses traditional PD prayers; no NIV/ESV text |
| Music / SFX licensed for commercial use | ⏳ | none yet |
| Review by 2 pastors / kids ministry (evangelical + catholic) | 🧑 | before v1 submit |
| No ATT prompt (no tracking) | ✅ | `NSUserTrackingUsageDescription` removed from `app.json` |
