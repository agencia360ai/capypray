# Analytics and privacy — launch configuration

## Decision
Do not embed Firebase Analytics / GA4 in the child-facing app for launch. Apple's Kids Category generally disallows third-party analytics, with narrow exceptions requiring careful provider/data review. A parent-only button inside a child-directed app does not by itself establish compliance. Current CLAUDE.md and GDD also require no third-party analytics. This release disables first-party event upload and Supabase account/backup in production as well.

GA4 can measure the adult-facing Looplab marketing website, with suitable consent where required. Use a separate web data stream and events such as store_link_click (store=apple/google), campaign_landing_view and support_link_click. Never include child names, prayer selections, religious profile data, RevenueCat IDs, transaction IDs, or native app events. Do not proxy children's app events into GA4 via Measurement Protocol. No GA4 property or stream has been changed by this task.

Use App Store Connect / Play Console aggregated download reports and RevenueCat subscription reports for launch measurement. Do not enable RevenueCat Firebase, advertising, attribution, or other outbound integrations without a separate privacy review.

## Draft store disclosures — verify against final binaries and account settings
- Local child profile/progress: stays on the device in this release. Do not confuse local-only data with data transmitted off-device.
- Purchase history: processed by stores and RevenueCat for app functionality.
- RevenueCat pseudonymous user identifier: review as User ID/identifier and linkage according to the exact configuration. Anonymous is not the same as no data collected.
- Technical SDK/network data: inspect RevenueCat's current disclosure guide and final traffic. Do not claim 'Data Not Collected' merely because no analytics SDK is installed.
- Support email: parent-provided address and message, separately handled by Looplab.
- No advertising ID, tracking across apps, microphone recording, location, contacts, or ads in intended release.
- Complete Google Data Safety purposes, optional/required and encryption answers using the final vendor configuration; review SDK data sharing exceptions rather than guessing.
- Complete Apple App Privacy for purchase history and identifiers, and review privacy manifests of every native SDK in the signed build.
- No account creation in release: local erase is available. If cloud accounts are enabled later, add in-app account deletion, Google's deletion URL, consent, and server-side deletion before shipping.

Sources checked 2026-09-25:
- https://developer.apple.com/app-store/review/guidelines/ (1.3 and 5.1)
- https://support.google.com/googleplay/android-developer/answer/9893335
- https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy
- https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-play-data-safety
