import { useMemo, useState } from "react";
import { Activity, Trash2 } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import { sleepLink, summarize } from "../lib/insights";
import type { BehaviorFunction, Setting } from "../lib/schema";
import { remove, upsert, useData } from "../lib/store";
import { countBy, daysAgo, localDateTime } from "../lib/util";
import { Chips, Field, Page, Segmented, Suggest } from "../components/ui";
import { Bars } from "../components/charts";

const PRESET_BEHAVIORS = ["Meltdown", "Hitting", "Throwing things", "Running away", "Screaming", "Refusing", "Self-injury", "Crying"];
const PRESET_BEFORE = ["Asked to do a task", "Transition", "Told no", "Loud noise", "Waiting", "Change in routine", "Tired", "Hungry"];
const PRESET_AFTER = ["Break given", "Redirected", "Calm-down space", "Planned ignoring", "Task removed", "Comforted", "Got the item"];

export const SETTINGS: { value: Setting; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "school", label: "School" },
  { value: "community", label: "Out and about" },
  { value: "therapy", label: "Therapy" },
  { value: "other", label: "Other" },
];

const FUNCTIONS: { value: BehaviorFunction; label: string }[] = [
  { value: "unknown", label: "Not sure" },
  { value: "attention", label: "To get attention" },
  { value: "escape", label: "To get out of something" },
  { value: "tangible", label: "To get an item or activity" },
  { value: "sensory", label: "Sensory / feels good" },
];

export function BehaviorPage() {
  const { t } = useI18n();
  const { child } = useChild();
  const data = useData();
  const [tab, setTab] = useState<"log" | "patterns">("log");
  const events = data.behaviors.filter((b) => b.childId === child!.id).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Page title={t("Behavior")} subtitle={`${child!.firstName} · ${t("what happened before, the behavior, and what happened after")}`}>
      <div className="tabs">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "log" as const, label: t("Log") },
            { value: "patterns" as const, label: t("Patterns (last 30 days)") },
          ]}
        />
      </div>
      {tab === "log" ? <LogTab key={child!.id} events={events} /> : <Patterns events={events} />}
    </Page>
  );
}

function withPresets(used: [string, number][], presets: string[]) {
  return [...new Set([...used.map(([v]) => v), ...presets])];
}

function LogTab({ events }: { events: ReturnType<typeof useData>["behaviors"] }) {
  const { t, date, time } = useI18n();
  const { child } = useChild();
  const fresh = () => ({
    at: localDateTime(),
    behavior: "",
    antecedent: "",
    consequence: "",
    intensity: 3,
    minutes: null as number | null,
    setting: "home" as Setting,
    fn: "unknown" as BehaviorFunction,
    notes: "",
  });
  const [e, setE] = useState(fresh);
  const set = <K extends keyof typeof e>(k: K, v: (typeof e)[K]) => setE((p) => ({ ...p, [k]: v }));

  const suggestions = useMemo(
    () => ({
      behavior: withPresets(countBy(events, (x) => x.behavior), PRESET_BEHAVIORS),
      antecedent: withPresets(countBy(events, (x) => x.antecedent), PRESET_BEFORE),
      consequence: withPresets(countBy(events, (x) => x.consequence), PRESET_AFTER),
    }),
    [events],
  );

  const save = () => {
    if (!e.behavior.trim()) return;
    upsert("behaviors", { ...e, childId: child!.id, at: new Date(e.at).toISOString(), behavior: e.behavior.trim() });
    setE({ ...fresh(), setting: e.setting });
  };

  return (
    <div className="grid-2" style={{ alignItems: "start" }}>
      <div className="card stack">
        <h2>{t("Quick log")}</h2>
        <Field label={t("1. What happened before?")}>
          <Suggest value={e.antecedent} onChange={(v) => set("antecedent", v)} suggestions={suggestions.antecedent.map(t)} />
        </Field>
        <Field label={t("2. What did they do?")}>
          <Suggest value={e.behavior} onChange={(v) => set("behavior", v)} suggestions={suggestions.behavior.map(t)} />
        </Field>
        <Field label={t("3. What happened after?")}>
          <Suggest value={e.consequence} onChange={(v) => set("consequence", v)} suggestions={suggestions.consequence.map(t)} />
        </Field>
        <Field label={t("How strong?")}>
          <Chips
            options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} · ${t(["Mild", "Low", "Medium", "High", "Severe"][n - 1])}` }))}
            value={e.intensity}
            onChange={(v) => set("intensity", v)}
          />
        </Field>
        <Field label={t("Where?")}>
          <Chips options={SETTINGS.map((s) => ({ ...s, label: t(s.label) }))} value={e.setting} onChange={(v) => set("setting", v)} />
        </Field>
        <div className="grid-2">
          <Field label={t("When?")}>
            <input type="datetime-local" value={e.at} onChange={(x) => set("at", x.target.value)} />
          </Field>
          <Field label={t("How long?")} hint={t("minutes")}>
            <input type="number" min={0} value={e.minutes ?? ""} onChange={(x) => set("minutes", x.target.value === "" ? null : Number(x.target.value))} />
          </Field>
        </div>
        <Field label={t("Why do you think it happened?")} hint={t("optional")}>
          <select value={e.fn} onChange={(x) => set("fn", x.target.value as BehaviorFunction)}>
            {FUNCTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {t(f.label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Notes")} hint={t("optional")}>
          <textarea value={e.notes} onChange={(x) => set("notes", x.target.value)} />
        </Field>
        <button className="btn primary big" onClick={save} disabled={!e.behavior.trim()}>
          {t("Save")}
        </button>
      </div>

      <div className="card stack-sm">
        <h2>{t("Recent")}</h2>
        <div className="list">
          {events.slice(0, 30).map((b) => (
            <div key={b.id} className="spread" style={{ alignItems: "flex-start" }}>
              <div className="stack-sm" style={{ gap: 2 }}>
                <strong>
                  {b.behavior} <span className="badge">{b.intensity}/5</span>
                </strong>
                <span className="small muted">
                  {date(b.at)} {time(b.at)} · {t(SETTINGS.find((s) => s.value === b.setting)!.label)}
                  {b.minutes ? ` · ${b.minutes} min` : ""}
                </span>
                {(b.antecedent || b.consequence) && (
                  <span className="small">
                    {b.antecedent && `${t("Before")}: ${b.antecedent}`}
                    {b.antecedent && b.consequence && " → "}
                    {b.consequence && `${t("After")}: ${b.consequence}`}
                  </span>
                )}
                {b.notes && <span className="small muted">{b.notes}</span>}
              </div>
              <button className="btn ghost icon" aria-label={t("Delete")} onClick={() => remove("behaviors", b.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!events.length && <p className="muted">{t("Nothing logged yet.")}</p>}
        </div>
      </div>
    </div>
  );
}

function Patterns({ events }: { events: ReturnType<typeof useData>["behaviors"] }) {
  const { t } = useI18n();
  const data = useData();
  const { child } = useChild();
  const since = daysAgo(30);
  const recent = events.filter((e) => e.at.slice(0, 10) > since);
  const s = summarize(recent);
  const sleep = sleepLink(recent, data.dailyLogs.filter((l) => l.childId === child!.id && l.date > since));

  if (recent.length < 3) {
    return (
      <div className="card empty">
        <Activity size={48} />
        <p className="muted">{t("Log at least 3 behaviors to start seeing patterns.")}</p>
      </div>
    );
  }

  const tr = (rows: [string, number][]) => rows.map(([k, v]) => [t(k), v] as [string, number]);
  const busiest = [...s.byPart].sort((a, b) => b[1] - a[1])[0];
  const topBefore = s.antecedents[0];

  return (
    <div className="stack">
      <div className="card stack-sm">
        <h2>{t("What stands out")}</h2>
        <ul style={{ margin: 0, paddingInlineStart: 20 }}>
          <li>
            {s.total} {t("behaviors in the last 30 days, average strength")} {s.avgIntensity?.toFixed(1)}/5.
          </li>
          <li>
            {t("Most happen in the")} <strong>{t(busiest[0]).toLowerCase()}</strong> ({busiest[1]}).
          </li>
          {topBefore && (
            <li>
              {t("Most common trigger")}: <strong>{topBefore[0]}</strong> ({topBefore[1]}×).
            </li>
          )}
          {sleep && (
            <li>
              {t("After less than")} {sleep.threshold}h {t("of sleep")}: <strong>{sleep.perDayShort.toFixed(1)}</strong> {t("per day")}; {t("after")} {sleep.threshold}h+:{" "}
              <strong>{sleep.perDayLong.toFixed(1)}</strong> {t("per day")}.
            </li>
          )}
        </ul>
        <p className="small muted">{t("Patterns are hints to discuss with your team, not conclusions.")}</p>
      </div>
      <div className="grid-2">
        <div className="card stack-sm">
          <h3>{t("Time of day")}</h3>
          <Bars data={tr(s.byPart)} />
        </div>
        <div className="card stack-sm">
          <h3>{t("Day of week")}</h3>
          <Bars data={tr(s.byDay)} />
        </div>
        <div className="card stack-sm">
          <h3>{t("Most common behaviors")}</h3>
          <Bars data={s.behaviors} />
        </div>
        <div className="card stack-sm">
          <h3>{t("What happened before")}</h3>
          <Bars data={s.antecedents} />
        </div>
        <div className="card stack-sm">
          <h3>{t("What happened after")}</h3>
          <Bars data={s.consequences} />
        </div>
        <div className="card stack-sm">
          <h3>{t("Where")}</h3>
          <Bars data={s.settings.map(([k, v]) => [t(SETTINGS.find((x) => x.value === k)?.label ?? k), v])} />
        </div>
      </div>
    </div>
  );
}
