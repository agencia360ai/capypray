# Build and account setup

Application ID (both stores): `com.looplab.capypray`. Display name: CapyPray. Version: 1.0.0.

## RevenueCat

SDK adapter is implemented. Configured 2026-09-29 in project CapyPray (`projeaa8b335`): apps `CapyPray iOS` (`appe7e338a6c3`) and `CapyPray Android` (`appf36f4e256f`), entitlement `premium`, offering `default` with `$rc_monthly`/`$rc_annual` attached to both platforms' products, and the public keys set as EAS variables in development/preview/production. Still missing: store products themselves and the App Store Connect / Play service-account credentials in the RevenueCat dashboard.

1. Create/select project CapyPray. Add App Store and Google Play apps, each with the exact ID above.
2. Apple: create auto-renewing subscriptions `capy_monthly` and `capy_annual` in one subscription group. Intended US prices $7.99/month and $49.99/year. Configure introductory free trials matching `TRIAL_DAYS` in `apps/mobile/src/entitlements/purchase.ts`: 3 days on `capy_monthly`, 7 days on `capy_annual` (eligibility per store rules).
3. Google: create subscription products `capy_monthly` and `capy_annual`, with monthly/annual auto-renewing base plans. Add eligible trial offers matching `TRIAL_DAYS`: 3-day free trial on the monthly base plan, 7-day on the annual. Created in Play: subscription `capy_monthly` with base plan `monthly` (offer `trial-3d`) and subscription `annual` with base plan `yearly` (offer `yearly`); RevenueCat Android products are `capy_monthly:monthly` and `annual:yearly`. Play product IDs are permanent, so iOS keeps `capy_annual`. Play only unlocks subscription creation after an AAB with the billing permission is uploaded to a testing track.
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

EAS project: `@looplabgg/capy-prayer` (`aba8d137-9133-4610-b687-70a36c7602c6`, also in `app.json`). Put the EAS project UUID in `EXPO_PUBLIC_EAS_PROJECT_ID`; configure the two public SDK keys for preview and production. Review and publish the CapyPray legal addendum, then set `CAPY_LEGAL_APPROVED=1` for the production build environment. Do not set that flag until the public pages actually cover this app.

```
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile internal   # signed AAB for Play internal testing; no strict release check, purchases need live RC keys
npx eas-cli build --platform ios --profile ios-simulator
npx eas-cli build --platform all --profile production
```

The build hook downloads the current 465 recordings and builds the avatar WebView. Inspect the EAS upload archive before the first build: both `.easignore` files exclude checked-in native projects so EAS prebuild regenerates them with the new bundle ID and permissions. Do not use the old checked-in Android directory for a release; it has the earlier app ID and a debug signing configuration. Keep signing managed by EAS/store credentials. Android output must be AAB, not the preview APK. Submit only after device and purchase verification.

Build requirements checked September 25, 2026: Apple iOS/iPadOS 26 SDK or later (Xcode 26+); Google new apps/updates target Android 16/API 36 or later. Inspect actual build logs/manifest, not only app.json. Also check Play 16 KB page-size compatibility of all native libraries. Expo SDK alignment and JS typechecking are not proof of a signed binary's compliance.

## Automated submission (EAS Submit)

Android (configured 2026-09-29): service account `eas-submit@capypray.iam.gserviceaccount.com` is stored in EAS for submissions, with Play permissions to release to testing tracks. `npx eas-cli build --platform android --profile internal --auto-submit` builds and publishes to Play internal testing through the `internal` submit profile. `eas submit --platform android --profile internal --id <build id>` submits an existing build. Play rejects a versionCode it has already seen; the remote `autoIncrement` handles that.

iOS (not configured yet; EAS has no iOS credentials, Apple team or App Store Connect key):

1. The owner registers the explicit App ID `com.looplab.capypray` and creates the App Store Connect record: name CapyPray, English (U.S.), SKU `capypray-ios-001`. Apple's API cannot create app records.
2. The owner creates an App Store Connect **team** API key with Admin access. EAS needs Admin to create the distribution certificate and provisioning profile. The key goes into the cloud environment as `ASC_API_KEY_P8` (the .p8 contents), `ASC_KEY_ID`, `ASC_ISSUER_ID` and `APPLE_TEAM_ID`. Never commit it or paste it into chat. The environment's network policy must allow `api.appstoreconnect.apple.com` and `appstoreconnect.apple.com`.
3. The session writes the key to a temp file outside the repo and exports `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`, `EXPO_APPLE_TEAM_ID` and `EXPO_APPLE_TEAM_TYPE` (`COMPANY_OR_ORGANIZATION` or `INDIVIDUAL`). eas-cli then authenticates to Apple with the key. It only generates certificates in interactive mode, so run the first `eas credentials --platform ios` (build credentials for `internal`, then the App Store Connect key for EAS Submit) under a pseudo-terminal and accept generation of the distribution certificate and provisioning profile.
4. Add `submit.internal.ios.ascAppId`, the numeric Apple ID of the App Store Connect app, to `eas.json`. After that, `eas build --platform ios --profile internal --auto-submit --non-interactive` uploads to TestFlight; `--platform all` does both stores.

RevenueCat iOS still needs the subscriptions in App Store Connect and the in-app purchase key in the RevenueCat dashboard before purchases work on TestFlight.

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
