# RevenueCat

Wired in `purchase.ts` with `react-native-purchases`. In Expo Go, on web, or without `EXPO_PUBLIC_RC_IOS_KEY` /
`EXPO_PUBLIC_RC_ANDROID_KEY` the app uses the sandbox (Parent Corner switch, "Preview mode" note on the paywall).

Kids Category rules (GDD §11):

- `Purchases.configure({ apiKey })` with RevenueCat's own anonymous app user id. Never call `collectDeviceIdentifiers()`,
  never set subscriber attributes, no ad-network or attribution integrations in the RevenueCat dashboard.
- Products: `capy_monthly` $7.99, `capy_annual` $49.99, each with a 7-day free-trial introductory offer.
- Entitlement `premium`; offering `default` (current) with the `$rc_monthly` and `$rc_annual` packages.
- `customerInfo` updates flip `useKid().premium`; the paywall reads live localized prices from the current offering.
- The paywall is only reachable behind the parental gate and links Terms of Use + Privacy Policy (`src/parent/legal.ts`).
