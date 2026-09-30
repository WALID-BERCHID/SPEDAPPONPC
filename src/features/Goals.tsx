import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Minus, Pencil, Play, Plus, Square, Target, Trash2, X } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import { PLAN_TYPES, type DataPoint, type Goal, type GoalArea, type Measure, type Prompt } from "../lib/schema";
import { remove, upsert, useData } from "../lib/store";
import { today, slope } from "../lib/util";
import { Chips, Empty, Field, Modal, Page, ask } from "../components/ui";
import { LineChart, Sparkline } from "../components/charts";

export const AREAS: { value: GoalArea; label: string }[] = [
  { value: "communication", label: "Communication" },
  { value: "social", label: "Social / play" },
  { value: "academic", label: "Academic" },
  { value: "behavior", label: "Behavior" },
  { value: "selfCare", label: "Self-care / daily living" },
  { value: "motor", label: "Motor skills" },
  { value: "sensory", label: "Sensory / regulation" },
  { value: "other", label: "Other" },
];

const MEASURES: { value: Measure; label: string; help: string }[] = [
  { value: "percent", label: "% correct", help: "Count correct and incorrect tries" },
  { value: "count", label: "Count", help: "How many times something happened" },
  { value: "duration", label: "Minutes", help: "How long something lasted" },
  { value: "rating", label: "Rating 1–5", help: "Your judgement on a 1 to 5 scale" },
];

export const PROMPTS: { value: Prompt; label: string }[] = [
  { value: "independent", label: "Independent" },
  { value: "gestural", label: "Gesture" },
  { value: "verbal", label: "Verbal" },
  { value: "model", label: "Model" },
  { value: "partial", label: "Partial physical" },
  { value: "full", label: "Full physical" },
];

export const unit = (m: Measure) => ({ percent: "%", count: "", duration: " min", rating: "/5" })[m];

export function goalProgress(g: Goal, latest: number | null): number | null {
  if (latest == null) return null;
  let p: number;
  if (g.baseline != null && g.baseline !== g.target) p = (latest - g.baseline) / (g.target - g.baseline);
  else if (g.lowerIsBetter) p = latest <= g.target ? 1 : g.target / latest;
  else p = g.target ? latest / g.target : 0;
  return Math.max(0, Math.min(1, p));
}

export function trend(g: Goal, values: number[]): "up" | "down" | "flat" {
  const s = slope(values.slice(-8));
  const good = g.lowerIsBetter ? -s : s;
  const scale = g.measure === "percent" ? 2 : g.measure === "rating" ? 0.1 : 0.2;
  return good > scale ? "up" : good < -scale ? "down" : "flat";
}

export function pointsFor(points: DataPoint[], goalId: string) {
  return points.filter((p) => p.goalId === goalId).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export function GoalsPage() {
  const { t } = useI18n();
  const data = useData();
  const { child } = useChild();
  const nav = useNavigate();
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const goals = data.goals.filter((g) => g.childId === child!.id);
  const order = { active: 0, paused: 1, met: 2 };

  const add = (
    <button className="btn primary" onClick={() => setEditing("new")}>
      <Plus size={18} /> {t("New goal")}
    </button>
  );

  return (
    <Page title={t("Goals & progress")} subtitle={`${child!.firstName} · ${t("tap a goal to record data and see the chart")}`} actions={add}>
      {goals.length === 0 ? (
        <Empty icon={<Target size={48} />} title={t("No goals yet")} text={t("Add goals from the IEP or plan, or your own home goals.")} action={add} />
      ) : (
        <div className="grid-2">
          {[...goals]
            .sort((a, b) => order[a.status] - order[b.status])
            .map((g) => {
              const pts = pointsFor(data.dataPoints, g.id);
              const latest = pts.at(-1)?.value ?? null;
              const prog = goalProgress(g, latest);
              const tr = trend(g, pts.map((p) => p.value));
              return (
                <button key={g.id} className="card link stack-sm" onClick={() => nav(`/goals/${g.id}`)}>
                  <div className="spread">
                    <span className="row">
                      <span className="badge">{t(AREAS.find((a) => a.value === g.area)?.label ?? "")}</span>
                      {g.plan && <span className="badge">{g.plan}</span>}
                      {g.status !== "active" && <span className={"badge " + (g.status === "met" ? "ok" : "warn")}>{t(g.status === "met" ? "Met" : "Paused")}</span>}
                    </span>
                    <Sparkline values={pts.slice(-12).map((p) => p.value)} />
                  </div>
                  <strong>{g.title}</strong>
                  <div className="progress" aria-label={t("Progress to target")}>
                    <div style={{ width: `${(prog ?? 0) * 100}%` }} />
                  </div>
                  <span className="small muted">
                    {latest != null ? `${t("Latest")}: ${latest}${unit(g.measure)} · ` : `${t("No data yet")} · `}
                    {t("Target")}: {g.target}
                    {unit(g.measure)}
                    {pts.length > 2 && ` · ${tr === "up" ? t("improving ↗") : tr === "down" ? t("slipping ↘") : t("steady →")}`}
                  </span>
                </button>
              );
            })}
        </div>
      )}
      {editing && <GoalForm goal={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </Page>
  );
}

function GoalForm({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { t } = useI18n();
  const data = useData();
  const { child } = useChild();
  const plans = PLAN_TYPES[data.settings.country];
  const [g, setG] = useState(
    () =>
      goal ?? {
        childId: child!.id,
        title: "",
        area: "communication" as GoalArea,
        plan: plans[0],
        description: "",
        measure: "percent" as Measure,
        lowerIsBetter: false,
        baseline: null as number | null,
        target: 80,
        targetDate: "",
        status: "active" as Goal["status"],
      },
  );
  const set = <K extends keyof typeof g>(k: K, v: (typeof g)[K]) => setG((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));

  const save = () => {
    if (!g.title.trim()) return;
    upsert("goals", g);
    onClose();
  };

  return (
    <Modal
      title={goal ? t("Edit goal") : t("New goal")}
      onClose={onClose}
      footer={
        <button className="btn primary" onClick={save} disabled={!g.title.trim()}>
          {t("Save goal")}
        </button>
      }
    >
      <div className="stack">
        <Field label={t("Goal")} hint={t("what the child will do")}>
          <textarea value={g.title} onChange={(e) => set("title", e.target.value)} autoFocus placeholder={t("e.g. Asks for help using a word, sign or picture")} />
        </Field>
        <div className="grid-2">
          <Field label={t("Area")}>
            <select value={g.area} onChange={(e) => set("area", e.target.value as GoalArea)}>
              {AREAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {t(a.label)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Plan")}>
            <input list="plans" value={g.plan} onChange={(e) => set("plan", e.target.value)} />
            <datalist id="plans">
              {plans.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label={t("How will you measure it?")}>
          <Chips options={MEASURES.map((m) => ({ value: m.value, label: t(m.label) }))} value={g.measure} onChange={(m) => set("measure", m)} />
          <span className="small muted">{t(MEASURES.find((m) => m.value === g.measure)!.help)}</span>
        </Field>
        {(g.measure === "count" || g.measure === "duration") && (
          <label className="check">
            <input type="checkbox" checked={g.lowerIsBetter} onChange={(e) => set("lowerIsBetter", e.target.checked)} />
            {t("Lower is better (e.g. fewer meltdowns, shorter tantrums)")}
          </label>
        )}
        <div className="grid-2">
          <Field label={t("Starting point")} hint={t("optional")}>
            <input type="number" value={g.baseline ?? ""} onChange={(e) => set("baseline", num(e.target.value))} />
          </Field>
          <Field label={t("Target")}>
            <input type="number" value={g.target} onChange={(e) => set("target", Number(e.target.value))} />
          </Field>
          <Field label={t("Target date")} hint={t("optional")}>
            <input type="date" value={g.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
          </Field>
          <Field label={t("Status")}>
            <select value={g.status} onChange={(e) => set("status", e.target.value as Goal["status"])}>
              <option value="active">{t("Active")}</option>
              <option value="paused">{t("Paused")}</option>
              <option value="met">{t("Met")}</option>
            </select>
          </Field>
        </div>
        <Field label={t("Notes / how to practice")} hint={t("optional")}>
          <textarea value={g.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export function GoalDetail() {
  const { t, date } = useI18n();
  const { id } = useParams();
  const data = useData();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const g = data.goals.find((x) => x.id === id);
  if (!g) return null;
  const pts = pointsFor(data.dataPoints, g.id);

  const del = async () => {
    if (await ask(t("Delete this goal and all its data?"))) {
      data.dataPoints.filter((p) => p.goalId === g.id).forEach((p) => remove("dataPoints", p.id));
      remove("goals", g.id);
      nav("/goals");
    }
  };

  return (
    <Page
      title={g.title}
      subtitle={[g.plan, t(AREAS.find((a) => a.value === g.area)?.label ?? ""), g.targetDate && `${t("by")} ${date(g.targetDate)}`].filter(Boolean).join(" · ")}
      actions={
        <>
          <button className="btn" onClick={() => nav("/goals")}>
            {t("Back")}
          </button>
          <button className="btn" onClick={() => setEditing(true)}>
            <Pencil size={18} /> {t("Edit")}
          </button>
          <button className="btn danger" onClick={del}>
            <Trash2 size={18} />
          </button>
        </>
      }
    >
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="stack">
          <div className="card stack-sm">
            <h2>{t("Progress")}</h2>
            {pts.length ? (
              <LineChart points={pts} target={g.target} baseline={g.baseline} unit={unit(g.measure).trim() === "%" ? "%" : ""} max={g.measure === "percent" ? 100 : g.measure === "rating" ? 5 : undefined} />
            ) : (
              <p className="muted">{t("Record the first session to see the chart.")}</p>
            )}
            {g.description && <p className="small muted" style={{ whiteSpace: "pre-wrap" }}>{g.description}</p>}
          </div>
          <div className="card stack-sm">
            <h2>{t("History")}</h2>
            <div className="list">
              {[...pts].reverse().map((p) => (
                <div key={p.id} className="spread">
                  <span>
                    <strong>
                      {p.value}
                      {unit(g.measure)}
                    </strong>
                    {p.total ? ` (${p.correct}/${p.total})` : ""} · {date(p.date)}
                    {p.prompt && ` · ${t(PROMPTS.find((x) => x.value === p.prompt)!.label)}`}
                    {p.note && <span className="muted"> · {p.note}</span>}
                  </span>
                  <button className="btn ghost icon" aria-label={t("Delete")} onClick={() => remove("dataPoints", p.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {!pts.length && <p className="muted">{t("No data yet")}</p>}
            </div>
          </div>
        </div>
        <DataEntry goal={g} />
      </div>
      {editing && <GoalForm goal={g} onClose={() => setEditing(false)} />}
    </Page>
  );
}

function DataEntry({ goal }: { goal: Goal }) {
  const { t } = useI18n();
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [value, setValue] = useState<number | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [day, setDay] = useState(today());
  const [note, setNote] = useState("");
  const [running, setRunning] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (running == null) return;
    const i = setInterval(() => setTick((x) => x + 1), 500);
    return () => clearInterval(i);
  }, [running]);

  const total = correct + wrong;
  const computed = goal.measure === "percent" && total ? Math.round((correct / total) * 100) : value;
  const elapsed = running != null ? (Date.now() - running) / 60000 : 0;
  void tick;

  const reset = () => {
    setCorrect(0);
    setWrong(0);
    setValue(null);
    setPrompt(null);
    setNote("");
  };

  const save = () => {
    if (computed == null || Number.isNaN(computed)) return;
    upsert("dataPoints", {
      goalId: goal.id,
      childId: goal.childId,
      date: day,
      value: computed,
      ...(goal.measure === "percent" && total ? { correct, total } : {}),
      ...(prompt ? { prompt } : {}),
      note: note.trim(),
    });
    reset();
  };

  return (
    <div className="card stack">
      <h2>{t("Record a session")}</h2>
      {goal.measure === "percent" && (
        <>
          <div className="trial-btns">
            <button className="btn" style={{ background: "var(--green-soft)", color: "var(--ok)" }} onClick={() => setCorrect((c) => c + 1)}>
              <Check size={28} /> {t("Correct")} ({correct})
            </button>
            <button className="btn" style={{ background: "var(--danger-soft)", color: "var(--danger)" }} onClick={() => setWrong((c) => c + 1)}>
              <X size={28} /> {t("Not yet")} ({wrong})
            </button>
          </div>
          <p className="stat" style={{ textAlign: "center" }}>
            {total ? `${computed}%` : "–"}
            <span className="small muted"> {total ? `${correct}/${total}` : ""}</span>
          </p>
          <Field label={t("Or type the percentage")}>
            <input type="number" min={0} max={100} value={total ? "" : (value ?? "")} disabled={total > 0} onChange={(e) => setValue(e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
        </>
      )}
      {goal.measure === "count" && (
        <div className="counter">
          <button className="btn big icon" aria-label={t("Less")} onClick={() => setValue(Math.max(0, (value ?? 0) - 1))}>
            <Minus size={28} />
          </button>
          <span className="value">{value ?? 0}</span>
          <button className="btn big icon primary" aria-label={t("More")} onClick={() => setValue((value ?? 0) + 1)}>
            <Plus size={28} />
          </button>
        </div>
      )}
      {goal.measure === "duration" && (
        <>
          <div className="counter">
            <span className="value">{running != null ? `${Math.floor(elapsed)}:${String(Math.floor((elapsed % 1) * 60)).padStart(2, "0")}` : `${value ?? 0}`}</span>
            {running == null ? (
              <button className="btn big primary" onClick={() => setRunning(Date.now())}>
                <Play size={22} /> {t("Start")}
              </button>
            ) : (
              <button
                className="btn big"
                onClick={() => {
                  setValue(Math.round(elapsed * 10) / 10);
                  setRunning(null);
                }}
              >
                <Square size={22} /> {t("Stop")}
              </button>
            )}
          </div>
          <Field label={t("Minutes")}>
            <input type="number" min={0} step="0.1" value={value ?? ""} onChange={(e) => setValue(e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
        </>
      )}
      {goal.measure === "rating" && (
        <Chips
          label={t("Rating")}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: "★".repeat(n) }))}
          value={value}
          onChange={setValue}
        />
      )}
      <Field label={t("Help needed")} hint={t("optional")}>
        <Chips options={PROMPTS.map((p) => ({ value: p.value, label: t(p.label) }))} value={prompt} onChange={(p) => setPrompt(p === prompt ? null : p)} />
      </Field>
      <div className="grid-2">
        <Field label={t("Date")}>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label={t("Note")} hint={t("optional")}>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="row">
        <button className="btn primary big" style={{ flex: 1 }} onClick={save} disabled={computed == null || running != null}>
          {t("Save session")}
        </button>
        <button className="btn big" onClick={reset}>
          {t("Clear")}
        </button>
      </div>
    </div>
  );
}
