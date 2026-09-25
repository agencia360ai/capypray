// Store-required links (Apple 3.1.2: paywall must link Terms of Use and Privacy Policy). Set the hosted URLs through
// EXPO_PUBLIC_PRIVACY_URL / EXPO_PUBLIC_TERMS_URL; terms default to Apple's standard EULA.
export const LEGAL = {
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://capyprayer.com/privacy",
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "",
};
