import { interpolate } from "@capy/content";
import english from "./locales/en-US.json";

export type AppLocale = "en-US";
export const DEFAULT_LOCALE: AppLocale = "en-US";
export const SUPPORTED_LOCALES: readonly AppLocale[] = ["en-US"];
type Copy = typeof english;
const catalogs: Record<AppLocale, Copy> = { "en-US": english };

export function getCopy(locale: string = DEFAULT_LOCALE): Copy {
  return catalogs[locale as AppLocale] ?? english;
}

export const formatCopy = (template: string, vars: Record<string, string | number>) =>
  interpolate(template, Object.fromEntries(Object.entries(vars).map(([key, value]) => [key, String(value)])));

export function formatHour(hour: number, locale: string = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hour));
}
