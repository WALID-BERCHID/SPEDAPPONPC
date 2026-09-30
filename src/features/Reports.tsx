import { useState } from "react";
import { Printer } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import { summarize } from "../lib/insights";
import { useData } from "../lib/store";
import { age, daysAgo, fullName, mean, today } from "../lib/util";
import { Avatar, Chips, Page } from "../components/ui";
import { Bars, LineChart } from "../components/charts";
import { AREAS, goalProgress, pointsFor, trend, unit } from "./Goals";
import { MOODS } from "./Notebook";
import { APP_NAME } from "../lib/app";

export function ReportPage() {
  const { t, date } = useI18n();
  const data = useData();
  const { child } = useChild();
  const [days, setDays] = useState(90);
  const c = child!;
  const from = days ? daysAgo(days) : "0000";
  const goals = data.goals.filter((g) => g.childId === c.id && g.status !== "paused");
  const behaviors = data.behaviors.filter((b) => b.childId === c.id && b.at.slice(0, 10) > from);
  const logs = data.dailyLogs.filter((l) => l.childId === c.id && l.date > from).sort((a, b) => b.date.localeCompare(a.date));
  const s = summarize(behaviors);
  const avgMood = mean(logs.filter((l) => l.mood).map((l) => l.mood));
  const weeks = Math.max(1, (days || 365) / 7);

  return (
    <Page
      title={t("Progress report")}
      subtitle={t("For IEP/EHCP meetings, therapy reviews or your own records.")}
      actions={
        <button className="btn primary" onClick={() => window.print()}>
          <Printer size={18} /> {t("Print or save as PDF")}
        </button>
      }
    >
      <div className="stack">
        <div className="no-print">
          <Chips
            options={[
              { value: 30, label: t("Last 30 days") },
              { value: 90, label: t("Last 3 months") },
              { value: 180, label: t("Last 6 months") },
              { value: 0, label: t("Everything") },
            ]}
            value={days}
            onChange={setDays}
          />
        </div>

        <div className="card row" style={{ gap: 16 }}>
          <Avatar child={c} size="lg" />
          <div className="stack-sm">
            <h2>{fullName(c)}</h2>
            <p className="muted">
              {[age(c.birthDate) != null && `${age(c.birthDate)} ${t("years old")}`, c.school, c.diagnoses].filter(Boolean).join(" · ")}
            </p>
            <p className="small muted">
              {t("Period")}: {days ? `${date(from)} – ${date(today())}` : t("all records")} · {t("Prepared by")} {data.profile.name} · {APP_NAME}
            </p>
          </div>
        </div>

        {c.strengths && (
          <div className="card stack-sm">
            <h3>{t("Strengths")}</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{c.strengths}</p>
          </div>
        )}

        <h2>{t("Goals")}</h2>
        {goals.length === 0 && <p className="muted">{t("No goals recorded.")}</p>}
        {goals.map((g) => {
          const all = pointsFor(data.dataPoints, g.id);
          const pts = all.filter((p) => p.date > from);
          const latest = all.at(-1)?.value ?? null;
          const prog = goalProgress(g, latest);
          const tr = trend(g, all.map((p) => p.value));
          return (
            <div key={g.id} className="card stack-sm">
              <div className="spread">
                <strong>{g.title}</strong>
                <span className="row">
                  <span className="badge">{t(AREAS.find((a) => a.value === g.area)?.label ?? "")}</span>
                  {g.plan && <span className="badge">{g.plan}</span>}
                  {g.status === "met" && <span className="badge ok">{t("Met")}</span>}
                </span>
              </div>
              <p className="small">
                {t("Starting point")}: {g.baseline ?? "–"}
                {g.baseline != null && unit(g.measure)} · {t("Latest")}: {latest ?? "–"}
                {latest != null && unit(g.measure)} · {t("Target")}: {g.target}
                {unit(g.measure)} · {pts.length} {t("sessions in period")}
                {prog != null && ` · ${Math.round(prog * 100)}% ${t("of the way")}`}
                {all.length > 2 && ` · ${tr === "up" ? t("improving ↗") : tr === "down" ? t("slipping ↘") : t("steady →")}`}
              </p>
              {pts.length > 1 && <LineChart points={pts} target={g.target} baseline={g.baseline} height={160} max={g.measure === "percent" ? 100 : g.measure === "rating" ? 5 : undefined} />}
            </div>
          );
        })}

        <h2>{t("Behavior")}</h2>
        <div className="card stack-sm">
          {behaviors.length === 0 ? (
            <p className="muted">{t("No behaviors logged in this period.")}</p>
          ) : (
            <>
              <p>
                {s.total} {t("logged")} ({(s.total / weeks).toFixed(1)} {t("per week")}), {t("average strength")} {s.avgIntensity?.toFixed(1)}/5.
              </p>
              <div className="grid-2">
                <div className="stack-sm">
                  <h3>{t("Most common behaviors")}</h3>
                  <Bars data={s.behaviors} />
                </div>
                <div className="stack-sm">
                  <h3>{t("What happened before")}</h3>
                  <Bars data={s.antecedents} />
                </div>
              </div>
            </>
          )}
        </div>

        <h2>{t("From the daily notebook")}</h2>
        <div className="card stack-sm">
          {logs.length === 0 ? (
            <p className="muted">{t("No notebook entries in this period.")}</p>
          ) : (
            <>
              <p>
                {logs.length} {t("entries")}
                {avgMood != null && ` · ${t("average mood")} ${MOODS[Math.round(avgMood) - 1]} (${avgMood.toFixed(1)}/5)`}
              </p>
              <div className="list">
                {logs
                  .filter((l) => l.highlights || l.concerns)
                  .slice(0, 12)
                  .map((l) => (
                    <div key={l.id} className="small">
                      <strong>{date(l.date)}</strong> · {t(l.setting === "home" ? "Home" : "School")}
                      {l.highlights && <div>⭐ {l.highlights}</div>}
                      {l.concerns && <div>⚠️ {l.concerns}</div>}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>

        <div className="card stack">
          <h3>{t("Notes and questions for the meeting")}</h3>
          <div style={{ minHeight: 120, borderBottom: "1px solid var(--border)" }} />
          <div className="grid-2">
            <p>{t("Signature")}: ____________________</p>
            <p>{t("Date")}: ____________________</p>
          </div>
        </div>
      </div>
    </Page>
  );
}
