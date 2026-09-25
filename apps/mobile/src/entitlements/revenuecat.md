# RevenueCat adapter

See `release/setup-and-submission.md` for platform products, entitlement, offering and environment setup.

Native builds now use react-native-purchases. Expo Go/web development retains an explicitly labeled preview; release builds cannot grant Premium through that preview. Live keys and store validation are still required.

- `default` offering, annual/monthly packages, `premium` entitlement.
- Store-localized prices in native paywall; system sheet shows eligible trial terms.
- Purchases/restore require an active parent gate; cancellation does not grant access.
- Anonymous RevenueCat identity, no child subscriber attributes, automatic device identifier collection disabled.
- Existing customers refresh on app foreground; the SDK is not initialized for a new child until an adult opens the offer.
- Production ignores previously persisted debug Premium/free-play flags.
- Legacy Supabase webhook is not enabled or compatible with this anonymous adapter. Do not deploy it for this release.
