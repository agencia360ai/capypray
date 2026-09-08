# RevenueCat adapter (dev build step)

`react-native-purchases` is a native module and is not in Expo Go, so it is wired only when we move to dev builds (EAS).

Kids Category rules (GDD §11) for the configuration:

- `Purchases.configure({ apiKey, appUserID: parentId })` with our own anonymous parent UUID. Never call `collectDeviceIdentifiers()`; no IDFA/GAID.
- Products: `capy_monthly` $7.99, `capy_annual` $49.99 (default, "$4.17/mo · save 48%"), 7-day trial via Offerings intro offer.
- Entitlement id: `premium`. Offering `default` with a Paywall template.
- On `customerInfo` updates: `useKid.getState().setPremium(!!info.entitlements.active.premium)`.
- Paywall is only reachable behind the parental gate (`app/parent/gate.tsx` → `app/parent/paywall.tsx`).
- Webhook → `supabase/functions/rc-webhook` mirrors into `entitlements` for the parent dashboard and weekly report.

Until then, Parent Corner has a "Premium (sandbox)" switch that flips the same store flag.
