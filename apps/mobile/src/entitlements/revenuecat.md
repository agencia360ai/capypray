# RevenueCat adapter

See `release/setup-and-submission.md` for platform products, entitlement, offering and environment setup.

Native builds now use react-native-purchases. Expo Go/web development retains an explicitly labeled preview; release builds cannot grant Premium through that preview. Live keys and store validation are still required.

- `default` offering, annual/monthly packages, `premium` entitlement.
- Store-localized prices in native paywall; system sheet shows eligible trial terms. Intro offers: 3-day free trial on `capy_monthly`, 7-day on `capy_annual`, configured in the stores; `TRIAL_DAYS` mirrors them for the sandbox preview copy.
- Purchases/restore require an active parent gate; cancellation does not grant access.
- Anonymous RevenueCat identity, no child subscriber attributes, automatic device identifier collection disabled.
- `Purchases.configure` runs once at app start (`configurePurchases()` in `app/_layout.tsx`), as RevenueCat recommends, so purchases completed outside the paywall (pending payments, Play Store promo codes) are processed and acknowledged. Access is re-read after saved progress loads and on every foreground; listener updates that arrive before hydration are not written to the store.
- Production ignores previously persisted debug Premium/free-play flags.
- Legacy Supabase webhook is not enabled or compatible with this anonymous adapter. Do not deploy it for this release.
