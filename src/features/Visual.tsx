import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Camera, Check, LayoutGrid, Pause, Play, Plus, RotateCcw, Trash2, Volume2, X } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import type { ScheduleKind, Step, VisualSchedule } from "../lib/schema";
import { addImage, remove, uid, upsert, useData } from "../lib/store";
import { isTauri } from "../lib/storage";
import { chime, resizeImage, speak } from "../lib/util";
import { Chips, Empty, Field, Modal, Page, ask } from "../components/ui";

const EMOJI =
  "☀️ 🌙 🚽 🧼 🪥 🛁 🚿 👕 👖 🧦 👟 🧥 🎒 🥣 🍎 🥪 🍽️ 🥤 💊 🚌 🚗 🏫 🏠 🛏️ 📖 📚 ✏️ 📝 🔢 🎨 🎵 🧩 🧸 ⚽ 🛝 🏊 🚶 📱 📺 🎮 🤫 🙌 👋 🤝 🧘 🫧 ⏰ ⭐ 🎉 👍 ✋ 🧑‍⚕️ 🦷 💇 🛒 🌳 🐶 🍪 🍕 🧃 💤".split(" ");

const KINDS: { value: ScheduleKind; label: string }[] = [
  { value: "schedule", label: "Daily schedule" },
  { value: "routine", label: "Step-by-step routine" },
  { value: "firstThen", label: "First – then" },
];

const step = (emoji: string, label: string, minutes: number | null = null): Step => ({ id: uid(), emoji, label, minutes });

const TEMPLATES: { title: string; kind: ScheduleKind; steps: () => Step[] }[] = [
  {
    title: "Morning routine",
    kind: "schedule",
    steps: () => [step("🚽", "Toilet"), step("👕", "Get dressed"), step("🥣", "Breakfast"), step("🪥", "Brush teeth"), step("👟", "Shoes on"), step("🚌", "Go to school")],
  },
  {
    title: "Wash hands",
    kind: "routine",
    steps: () => [step("🚰", "Water on"), step("🧼", "Soap"), step("🙌", "Rub hands"), step("💦", "Rinse"), step("🧻", "Dry hands")],
  },
  { title: "First – then", kind: "firstThen", steps: () => [step("📚", "Homework", 10), step("📱", "Tablet time", 10)] },
  {
    title: "Bedtime",
    kind: "schedule",
    steps: () => [step("🛁", "Bath"), step("👕", "Pajamas"), step("🪥", "Brush teeth"), step("📖", "Story"), step("🛏️", "Bed")],
  },
];

export function VisualPage() {
  const { t } = useI18n();
  const data = useData();
  const { child } = useChild();
  const nav = useNavigate();
  const list = data.schedules.filter((s) => s.childId === child!.id);

  const create = (tpl?: (typeof TEMPLATES)[number]) => {
    const s = upsert("schedules", {
      childId: child!.id,
      title: tpl ? t(tpl.title) : t("New schedule"),
      kind: tpl?.kind ?? "schedule",
      steps: tpl ? tpl.steps().map((s) => ({ ...s, label: t(s.label) })) : [],
    });
    nav(`/visual/${s.id}`);
  };

  return (
    <Page
      title={t("Visual supports")}
      subtitle={`${child!.firstName} · ${t("schedules, routines and first–then boards")}`}
      actions={
        <button className="btn primary" onClick={() => create()}>
          <Plus size={18} /> {t("New")}
        </button>
      }
    >
      <div className="stack">
        {list.length === 0 && <Empty icon={<LayoutGrid size={48} />} title={t("No schedules yet")} text={t("Start from a template below or make your own.")} />}
        <div className="grid">
          {list.map((s) => (
            <div key={s.id} className="card stack-sm">
              <div className="spread">
                <strong>{s.title}</strong>
                <span className="badge">{t(KINDS.find((k) => k.value === s.kind)!.label)}</span>
              </div>
              <div style={{ fontSize: "1.8rem" }}>
                <StepIcons steps={s.steps} />
              </div>
              <div className="row">
                <button className="btn primary" onClick={() => nav(`/visual/${s.id}/show`)}>
                  <Play size={18} /> {t("Show")}
                </button>
                <button className="btn" onClick={() => nav(`/visual/${s.id}`)}>
                  {t("Edit")}
                </button>
              </div>
            </div>
          ))}
        </div>
        <h2>{t("Templates")}</h2>
        <div className="grid">
          {TEMPLATES.map((tpl) => (
            <button key={tpl.title} className="card link stack-sm" onClick={() => create(tpl)}>
              <strong>{t(tpl.title)}</strong>
              <span style={{ fontSize: "1.6rem" }}>{tpl.steps().map((s) => s.emoji).join(" ")}</span>
            </button>
          ))}
        </div>
      </div>
    </Page>
  );
}

function StepIcons({ steps }: { steps: Step[] }) {
  const { images } = useData();
  return (
    <span className="row" style={{ gap: 4 }}>
      {steps.map((s) =>
        s.imageId && images[s.imageId] ? <img key={s.id} src={images[s.imageId]} alt="" width={32} height={32} style={{ borderRadius: 6, objectFit: "cover" }} /> : <span key={s.id}>{s.emoji}</span>,
      )}
    </span>
  );
}

export function ScheduleEditor() {
  const { t } = useI18n();
  const { id } = useParams();
  const data = useData();
  const nav = useNavigate();
  const original = data.schedules.find((s) => s.id === id);
  const [s, setS] = useState<VisualSchedule | undefined>(original);
  const [picking, setPicking] = useState<string | null>(null);
  if (!s) return null;

  const setStep = (sid: string, patch: Partial<Step>) => setS({ ...s, steps: s.steps.map((x) => (x.id === sid ? { ...x, ...patch } : x)) });
  const move = (i: number, d: number) => {
    const steps = [...s.steps];
    [steps[i], steps[i + d]] = [steps[i + d], steps[i]];
    setS({ ...s, steps });
  };
  const save = (then: string) => {
    upsert("schedules", s);
    nav(then);
  };
  const del = async () => {
    if (await ask(t("Delete this schedule?"))) {
      remove("schedules", s.id);
      nav("/visual");
    }
  };
  const photo = (sid: string) => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    input.onchange = async () => {
      const f = input.files?.[0];
      if (f) setStep(sid, { imageId: addImage(await resizeImage(f)) });
      setPicking(null);
    };
    input.click();
  };

  const canAdd = s.kind !== "firstThen" || s.steps.length < 2;

  return (
    <Page
      title={t("Edit schedule")}
      actions={
        <>
          <button className="btn danger" onClick={del}>
            <Trash2 size={18} />
          </button>
          <button className="btn" onClick={() => save(`/visual/${s.id}/show`)}>
            <Play size={18} /> {t("Save and show")}
          </button>
          <button className="btn primary" onClick={() => save("/visual")}>
            {t("Save")}
          </button>
        </>
      }
    >
      <div className="card stack">
        <div className="grid-2">
          <Field label={t("Title")}>
            <input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} />
          </Field>
          <Field label={t("Type")}>
            <Chips options={KINDS.map((k) => ({ ...k, label: t(k.label) }))} value={s.kind} onChange={(kind) => setS({ ...s, kind })} />
          </Field>
        </div>
        <h2>{t("Steps")}</h2>
        {s.steps.map((st, i) => (
          <div key={st.id} className="step-row">
            <span className="stack-sm" style={{ gap: 0 }}>
              <button className="btn ghost icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("Move up")}>
                <ArrowUp size={16} />
              </button>
              <button className="btn ghost icon" disabled={i === s.steps.length - 1} onClick={() => move(i, 1)} aria-label={t("Move down")}>
                <ArrowDown size={16} />
              </button>
            </span>
            <button className="emoji-btn" onClick={() => setPicking(st.id)} aria-label={t("Choose picture")}>
              {st.imageId && data.images[st.imageId] ? <img src={data.images[st.imageId]} alt="" /> : st.emoji}
            </button>
            <input value={st.label} onChange={(e) => setStep(st.id, { label: e.target.value })} placeholder={t("Label")} />
            <input
              type="number"
              min={0}
              placeholder={t("min")}
              aria-label={t("Minutes (optional)")}
              value={st.minutes ?? ""}
              onChange={(e) => setStep(st.id, { minutes: e.target.value === "" ? null : Number(e.target.value) })}
            />
            <button className="btn ghost icon" onClick={() => setS({ ...s, steps: s.steps.filter((x) => x.id !== st.id) })} aria-label={t("Remove")}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {canAdd && (
          <button className="btn" onClick={() => setS({ ...s, steps: [...s.steps, step("⭐", "")] })}>
            <Plus size={18} /> {t("Add step")}
          </button>
        )}
        <p className="small muted">{t("Tip: photos of the real place or object often work better than icons.")}</p>
      </div>
      {picking && (
        <Modal title={t("Choose picture")} onClose={() => setPicking(null)}>
          <div className="stack">
            <button className="btn" onClick={() => photo(picking)}>
              <Camera size={18} /> {t("Use a photo from this computer")}
            </button>
            <div className="emoji-grid">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  className="emoji-btn"
                  onClick={() => {
                    setStep(picking, { emoji: e, imageId: undefined });
                    setPicking(null);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}

async function fullscreen(on: boolean) {
  try {
    if (isTauri) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().setFullscreen(on);
    } else if (on) await document.documentElement.requestFullscreen?.();
    else if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* not allowed; stay windowed */
  }
}

/** Exit needs a 1.5 s press so a child does not leave by accident. */
function HoldToExit({ onExit }: { onExit: () => void }) {
  const { t } = useI18n();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [holding, setHolding] = useState(false);
  const start = () => {
    setHolding(true);
    timer.current = setTimeout(onExit, 1500);
  };
  const stop = () => {
    setHolding(false);
    clearTimeout(timer.current);
  };
  return (
    <button
      className="btn"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => e.key === "Escape" && onExit()}
      style={{ background: holding ? "var(--accent-soft)" : undefined }}
    >
      <X size={18} /> {t("Hold to exit")}
    </button>
  );
}

export function ShowSchedule() {
  const { t } = useI18n();
  const { id } = useParams();
  const data = useData();
  const nav = useNavigate();
  const s = data.schedules.find((x) => x.id === id);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState<number>(Date.now());
  const [, force] = useState(0);

  useEffect(() => {
    void fullscreen(true);
    const i = setInterval(() => force((x) => x + 1), 1000);
    return () => {
      clearInterval(i);
      void fullscreen(false);
    };
  }, []);

  if (!s) return null;
  const current = s.steps.find((x) => !done.has(x.id));
  const left = current?.minutes ? Math.max(0, current.minutes * 60 - Math.floor((Date.now() - started) / 1000)) : null;

  const toggle = (st: Step) => {
    const next = new Set(done);
    if (next.has(st.id)) next.delete(st.id);
    else {
      next.add(st.id);
      speak(st.label);
    }
    setDone(next);
    setStarted(Date.now());
    if (next.size === s.steps.length) chime();
  };

  return (
    <div className="show">
      <div className="spread">
        <h1>{s.title}</h1>
        <div className="row">
          {current && (
            <button className="btn" onClick={() => speak(current.label)}>
              <Volume2 size={18} /> {t("Read aloud")}
            </button>
          )}
          <button className="btn" onClick={() => setDone(new Set())}>
            <RotateCcw size={18} /> {t("Start over")}
          </button>
          <HoldToExit onExit={() => nav("/visual")} />
        </div>
      </div>
      <div className="show-cards" style={{ flexDirection: s.steps.length > 5 ? "row" : undefined, flexWrap: s.steps.length > 5 ? "wrap" : undefined }}>
        {s.steps.map((st, i) => (
          <button key={st.id} className={"show-card" + (st === current ? " current" : "") + (done.has(st.id) ? " done" : "")} onClick={() => toggle(st)}>
            {s.kind === "firstThen" && <span className="tag">{i === 0 ? t("First") : t("Then")}</span>}
            {done.has(st.id) && <Check className="tick" size={48} />}
            {st.imageId && data.images[st.imageId] ? <img className="pic" src={data.images[st.imageId]} alt="" /> : <span className="pic">{st.emoji}</span>}
            <span className="label">{st.label}</span>
            {st === current && left != null && (
              <span className="badge" style={{ fontSize: "1.2rem" }}>
                ⏳ {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
              </span>
            )}
          </button>
        ))}
      </div>
      {!current && s.steps.length > 0 && (
        <p className="stat" style={{ textAlign: "center" }}>
          🎉 {t("All done!")}
        </p>
      )}
    </div>
  );
}

export function VisualTimer() {
  const { t } = useI18n();
  const [total, setTotal] = useState(5 * 60);
  const [left, setLeft] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (!running) return;
    const end = Date.now() + left * 1000;
    const i = setInterval(() => {
      const l = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        setRunning(false);
        chime();
      }
    }, 250);
    return () => clearInterval(i);
  }, [running]);

  const pick = (min: number) => {
    setRunning(false);
    setTotal(min * 60);
    setLeft(min * 60);
  };

  const frac = total ? left / total : 0;
  const angle = frac * 2 * Math.PI;
  const r = 90;
  const x = 100 + r * Math.sin(angle);
  const y = 100 - r * Math.cos(angle);
  const path = frac >= 1 ? "" : `M100,100 L100,${100 - r} A${r},${r} 0 ${angle > Math.PI ? 1 : 0},1 ${x},${y} Z`;

  return (
    <Page title={t("Visual timer")} subtitle={t("The colored part shrinks as time passes.")}>
      <div className="stack" style={{ alignItems: "center" }}>
        <Chips options={[1, 2, 5, 10, 15, 20, 30].map((m) => ({ value: m, label: `${m} min` }))} value={total % 60 === 0 ? total / 60 : null} onChange={pick} />
        <div className="row">
          <input type="number" min={1} placeholder={t("Other (min)")} value={custom} onChange={(e) => setCustom(e.target.value)} style={{ width: 140 }} />
          <button className="btn" disabled={!Number(custom)} onClick={() => pick(Number(custom))}>
            {t("Set")}
          </button>
        </div>
        <svg viewBox="0 0 200 200" className="timer-face" role="img" aria-label={`${Math.ceil(left / 60)} ${t("minutes left")}`}>
          <circle cx={100} cy={100} r={96} fill="var(--surface)" stroke="var(--border)" strokeWidth={4} />
          {frac >= 1 ? <circle cx={100} cy={100} r={r} fill="#e04f3f" /> : <path d={path} fill="#e04f3f" />}
          <circle cx={100} cy={100} r={6} fill="var(--text)" />
        </svg>
        <p className="stat">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </p>
        <div className="row">
          <button className="btn primary big" onClick={() => setRunning(!running)} disabled={left === 0}>
            {running ? <Pause size={22} /> : <Play size={22} />} {running ? t("Pause") : t("Start")}
          </button>
          <button className="btn big" onClick={() => pick(total / 60)}>
            <RotateCcw size={22} /> {t("Reset")}
          </button>
        </div>
      </div>
    </Page>
  );
}
