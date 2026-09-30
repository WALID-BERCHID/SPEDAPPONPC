import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import type { DailyLog, Portion } from "../lib/schema";
import { upsert, useData } from "../lib/store";
import { today } from "../lib/util";
import { Chips, Field, Page } from "../components/ui";

export const MOODS = ["😢", "🙁", "😐", "🙂", "😄"];
const PORTIONS: { value: Portion; label: string }[] = [
  { value: "all", label: "All" },
  { value: "some", label: "Some" },
  { value: "none", label: "None" },
];

type Draft = Omit<DailyLog, "id" | "createdAt" | "updatedAt"> & Partial<Pick<DailyLog, "id" | "createdAt">>;

export function NotebookPage() {
  const { t, date } = useI18n();
  const data = useData();
  const { child } = useChild();
  const [day, setDay] = useState(today());
  const [where, setWhere] = useState<DailyLog["setting"]>(data.profile.role === "parent" ? "home" : "school");
  const existing = data.dailyLogs.find((l) => l.childId === child!.id && l.date === day && l.setting === where);
  const blank = (): Draft => ({
    childId: child!.id,
    date: day,
    setting: where,
    author: data.profile.name,
    mood: 0,
    sleepHours: null,
    meals: { breakfast: "", lunch: "", dinner: "" },
    toileting: "",
    medsGiven: "",
    activities: "",
    highlights: "",
    concerns: "",
    message: "",
  });
  const [d, setD] = useState<Draft>(() => existing ?? blank());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setD(existing ?? blank());
    setSaved(false);
  }, [day, where, child!.id]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    setSaved(false);
  };
  const save = () => {
    const r = upsert("dailyLogs", d);
    setD(r);
    setSaved(true);
  };
  const area = (k: keyof Draft, label: string, hint?: string) => (
    <Field label={t(label)} hint={hint && t(hint)}>
      <textarea value={d[k] as string} onChange={(e) => set(k, e.target.value as never)} />
    </Field>
  );

  const history = data.dailyLogs.filter((l) => l.childId === child!.id).sort((a, b) => b.date.localeCompare(a.date) || a.setting.localeCompare(b.setting));

  return (
    <Page title={t("Daily notebook")} subtitle={`${child!.firstName} · ${t("the home–school diary")}`}>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card stack">
          <div className="grid-2">
            <Field label={t("Date")}>
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </Field>
            <Field label={t("Written at")}>
              <Chips
                options={[
                  { value: "home" as const, label: t("Home") },
                  { value: "school" as const, label: t("School") },
                ]}
                value={where}
                onChange={setWhere}
              />
            </Field>
          </div>
          <Field label={t("Mood")}>
            <div className="faces" role="group">
              {MOODS.map((m, i) => (
                <button type="button" key={m} aria-pressed={d.mood === i + 1} aria-label={`${i + 1}/5`} onClick={() => set("mood", i + 1)}>
                  {m}
                </button>
              ))}
            </div>
          </Field>
          {where === "home" && (
            <Field label={t("Hours of sleep last night")}>
              <input type="number" min={0} max={24} step={0.5} value={d.sleepHours ?? ""} onChange={(e) => set("sleepHours", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>
          )}
          <Field label={t("Meals")}>
            <div className="stack-sm">
              {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                <div key={meal} className="row">
                  <span style={{ minWidth: 90 }}>{t(meal[0].toUpperCase() + meal.slice(1))}</span>
                  <Chips options={PORTIONS.map((p) => ({ ...p, label: t(p.label) }))} value={d.meals[meal]} onChange={(v) => set("meals", { ...d.meals, [meal]: d.meals[meal] === v ? "" : v })} />
                </div>
              ))}
            </div>
          </Field>
          <div className="grid-2">
            {area("toileting", "Toileting")}
            {area("medsGiven", "Medicine given")}
          </div>
          {area("activities", "What we did")}
          {area("highlights", "Good moments", "wins, big or small")}
          {area("concerns", "Concerns")}
          {area("message", where === "home" ? "Message for school" : "Message for home")}
          <button className="btn primary big" onClick={save}>
            {saved ? (
              <>
                <Check size={20} /> {t("Saved")}
              </>
            ) : (
              t("Save entry")
            )}
          </button>
        </div>

        <div className="card stack-sm">
          <h2>{t("Earlier entries")}</h2>
          <div className="list">
            {history.slice(0, 40).map((l) => (
              <button
                key={l.id}
                className="btn ghost"
                style={{ justifyContent: "flex-start", textAlign: "start", display: "block", fontWeight: 400 }}
                onClick={() => {
                  setDay(l.date);
                  setWhere(l.setting);
                }}
              >
                <div className="spread">
                  <strong>
                    {date(l.date, { weekday: "short", day: "numeric", month: "short" })} · {t(l.setting === "home" ? "Home" : "School")}
                  </strong>
                  <span style={{ fontSize: "1.4rem" }}>{l.mood ? MOODS[l.mood - 1] : ""}</span>
                </div>
                {l.highlights && <p className="small">⭐ {l.highlights}</p>}
                {l.concerns && <p className="small">⚠️ {l.concerns}</p>}
                {l.message && <p className="small">💬 {l.message}</p>}
              </button>
            ))}
            {!history.length && <p className="muted">{t("No entries yet.")}</p>}
          </div>
        </div>
      </div>
    </Page>
  );
}
