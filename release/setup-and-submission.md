# Build and account setup

Application ID (both stores): `com.looplab.capypray`. Display name: CapyPray. Version: 1.0.0.

## RevenueCat

SDK adapter is implemented. It is NOT connected until the real project/platform keys and store products are configured.

1. Create/select project CapyPray. Add App Store and Google Play apps, each with the exact ID above.
2. Apple: create auto-renewing subscriptions `capy_monthly` and `capy_annual` in one subscription group. Intended US prices $7.99/month and $49.99/year. Configure a 7-day introductory trial only if desired and eligible under store rules.
3. Google: create subscription products `capy_monthly` and `capy_annual`, with monthly/annual auto-renewing base plans. Add eligible trial offers. Use the exact imported product/base-plan identifiers in RevenueCat.
4. Create entitlement `premium`; attach both platforms' monthly and annual products.
5. Create offering with identifier `default`, packages `$rc_monthly` and `$rc_annual`; attach matching products for EACH platform.
6. Connect App Store Connect purchase credentials and Google service-account credentials with the roles RevenueCat requires. Keep private keys in those provider dashboards, never in this repository/chat.
7. Set the public SDK keys `EXPO_PUBLIC_RC_IOS_KEY` (appl_) and `EXPO_PUBLIC_RC_ANDROID_KEY` (goog_) in EAS environments. The app rejects test-store keys in release mode.
8. Use a development/internal build and store sandbox/test accounts to purchase, cancel, restore, expire, renew, simulate billing retry/pending purchase, and reinstall. Verify the `premium` entitlement after each transition.

This adapter deliberately uses RevenueCat's anonymous app user IDs and sends no child attributes. Do not connect the old `rc-webhook` to the release project: it assumes Supabase parent UUIDs and incorrectly treats billing issues as immediate expiration. Server mirroring is unnecessary for this local-only launch; it must be redesigned before future cloud accounts. No outbound analytics integrations.

Paywall uses store prices, not US constants, in native builds. The system purchase sheet displays eligible offers. No blanket 7-day-trial claim in production. Sandbox remains available only in development Expo Go/web previews. Parent Corner's debug toggles are absent in release.

## Expo / EAS

Run from `apps/mobile` with the owner's Expo account:

```
npx eas-cli login
npx eas-cli init
```

Put the resulting EAS project UUID in `EXPO_PUBLIC_EAS_PROJECT_ID`; configure the two public SDK keys for preview and production. Review and publish the CapyPray legal addendum, then set `CAPY_LEGAL_APPROVED=1` for the production build environment. Do not set that flag until the public pages actually cover this app.

```
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile ios-simulator
npx eas-cli build --platform all --profile production
```

The build hook downloads the current 465 recordings and builds the avatar WebView. Inspect the EAS upload archive before the first build: both `.easignore` files exclude checked-in native projects so EAS prebuild regenerates them with the new bundle ID and permissions. Do not use the old checked-in Android directory for a release; it has the earlier app ID and a debug signing configuration. Keep signing managed by EAS/store credentials. Android output must be AAB, not the preview APK. Submit only after device and purchase verification.

Build requirements checked September 25, 2026: Apple iOS/iPadOS 26 SDK or later (Xcode 26+); Google new apps/updates target Android 16/API 36 or later. Inspect actual build logs/manifest, not only app.json. Also check Play 16 KB page-size compatibility of all native libraries. Expo SDK alignment and JS typechecking are not proof of a signed binary's compliance.

## Store consoles

- Apple: register explicit bundle ID; App Store Connect record, SKU `capypray-ios-001`; English US primary language; categories Education / Kids, primary age band 6–8; complete age-rating questionnaire truthfully. Complete tax/banking/paid-apps agreements, subscriptions and review notes.
- Google: create CapyPray, app, free download with in-app purchases; English US; Education; declare child target age bands accurately (5 and under and 6–8); no ads. Complete Families, Data Safety, app access, content rating and developer verification. Confirm whether the developer account is subject to the closed-testing requirement before production access.
- Support and privacy URLs must function publicly. Current Looplab policies need the CapyPray addendum.
- Apple supportsTablet is true: iPad native verification and 13-inch screenshot set are required.
- Review/export-compliance answers must reflect final SDKs and encryption. App config declares only standard exempt transport encryption; confirm before submission.

Sources:
https://www.revenuecat.com/docs/getting-started/installation/expo
https://developer.apple.com/news/?id=ueeok6yw
https://support.google.com/googleplay/android-developer/answer/11926878?hl=es-419
https://developer.android.com/guide/practices/page-sizes
https://docs.expo.dev/build-reference/monorepos/
https://docs.expo.dev/build-reference/easignore/
