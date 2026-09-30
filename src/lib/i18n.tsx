import { createContext, useContext } from "react";
import { LOCALE, type Country } from "./schema";

// UI text is written in US English. The UK, Canada and Australia get
// Commonwealth spelling through a small set of word swaps. More languages can
// be added later as a map from the English string to the translation.

const COMMONWEALTH: [RegExp, string][] = [
  [/([Bb])ehavior/g, "$1ehaviour"],
  [/([Cc])olor/g, "$1olour"],
  [/([Cc])enter/g, "$1entre"],
  [/([Ff])avorite/g, "$1avourite"],
  [/([Pp])ediatric/g, "$1aediatric"],
  [/([Pp])ractice (?=at home)/g, "$1ractise "],
];

const cache = new Map<string, string>();

export function spell(text: string, country: Country): string {
  if (country === "US") return text;
  let out = cache.get(text);
  if (out === undefined) {
    out = COMMONWEALTH.reduce((s, [re, rep]) => s.replace(re, rep), text);
    cache.set(text, out);
  }
  return out;
}

export interface I18n {
  country: Country;
  t: (text: string) => string;
  date: (iso: string, opts?: Intl.DateTimeFormatOptions) => string;
  time: (iso: string) => string;
}

export function makeI18n(country: Country): I18n {
  const locale = LOCALE[country];
  return {
    country,
    t: (text) => spell(text, country),
    date: (iso, opts = { day: "numeric", month: "short", year: "numeric" }) =>
      iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString(locale, opts) : "",
    time: (iso) => new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
  };
}

export const I18nContext = createContext<I18n>(makeI18n("US"));
export const useI18n = () => useContext(I18nContext);

const COUNTRY_KEY = "hih.country";

export function savedCountry(): Country {
  try {
    const c = localStorage.getItem(COUNTRY_KEY) as Country | null;
    if (c && c in LOCALE) return c;
  } catch {
    /* storage unavailable */
  }
  const lang = navigator.language;
  if (lang.endsWith("GB")) return "UK";
  if (lang.endsWith("AU")) return "AU";
  if (lang.endsWith("CA")) return "CA";
  return "US";
}

export function rememberCountry(c: Country) {
  try {
    localStorage.setItem(COUNTRY_KEY, c);
  } catch {
    /* storage unavailable */
  }
}
