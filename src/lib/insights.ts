import type { BehaviorEvent, DailyLog } from "./schema";
import { countBy, mean } from "./util";

export const PARTS_OF_DAY = ["Morning", "Afternoon", "Evening", "Night"] as const;
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function partOfDay(iso: string): (typeof PARTS_OF_DAY)[number] {
  const h = new Date(iso).getHours();
  return h >= 6 && h < 12 ? "Morning" : h >= 12 && h < 17 ? "Afternoon" : h >= 17 && h < 21 ? "Evening" : "Night";
}

export interface SleepLink {
  threshold: number;
  shortNights: number;
  longNights: number;
  perDayShort: number;
  perDayLong: number;
}

/** Compares behaviors per day after shorter vs longer sleep (split at the median). */
export function sleepLink(events: BehaviorEvent[], logs: DailyLog[]): SleepLink | null {
  const sleep = new Map<string, number>();
  for (const l of logs) if (l.sleepHours != null) sleep.set(l.date, l.sleepHours);
  if (sleep.size < 6) return null;
  const hours = [...sleep.values()].sort((a, b) => a - b);
  const threshold = hours[Math.floor(hours.length / 2)];
  const perDay = countBy(events, (e) => e.at.slice(0, 10));
  const count = new Map(perDay);
  const short = [...sleep].filter(([, h]) => h < threshold).map(([d]) => count.get(d) ?? 0);
  const long = [...sleep].filter(([, h]) => h >= threshold).map(([d]) => count.get(d) ?? 0);
  if (short.length < 3 || long.length < 3) return null;
  return { threshold, shortNights: short.length, longNights: long.length, perDayShort: mean(short)!, perDayLong: mean(long)! };
}

export function summarize(events: BehaviorEvent[]) {
  return {
    total: events.length,
    byPart: PARTS_OF_DAY.map((p) => [p, events.filter((e) => partOfDay(e.at) === p).length] as [string, number]),
    byDay: WEEKDAYS.map((d, i) => [d, events.filter((e) => new Date(e.at).getDay() === i).length] as [string, number]),
    behaviors: countBy(events, (e) => e.behavior).slice(0, 6),
    antecedents: countBy(events, (e) => e.antecedent).slice(0, 6),
    consequences: countBy(events, (e) => e.consequence).slice(0, 6),
    settings: countBy(events, (e) => e.setting),
    avgIntensity: mean(events.map((e) => e.intensity)),
  };
}
