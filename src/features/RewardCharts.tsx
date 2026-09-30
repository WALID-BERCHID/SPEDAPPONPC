import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Play, Plus, RotateCcw, Star, Trash2 } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import type { RewardChart } from "../lib/schema";
import { remove, upsert, useData } from "../lib/store";
import { chime, speak } from "../lib/util";
import { Chips, Empty, Field, Modal, Page, ask } from "../components/ui";
import { HoldToExit, fullscreen } from "./Visual";

const TOKENS = ["⭐", "🚂", "🦖", "😊", "🏆", "❤️", "⚽", "🌈"];

type Draft = Omit<RewardChart, "id" | "createdAt" | "updatedAt"> & Partial<Pick<RewardChart, "id" | "createdAt">>;

export function RewardChartsPage() {
  const { t } = useI18n();
  const data = useData();
  const { child } = useChild();
  const nav = useNavigate();
  const [editing, setEditing] = useState<Draft | null>(null);
  const charts = data.rewardCharts.filter((c) => c.childId === child!.id);
  const blank = (): Draft => ({ childId: child!.id, title: t("Good listening"), goal: 5, earned: 0, token: "⭐", reward: t("Park time"), rewardEmoji: "🛝", completedCount: 0 });

  return (
    <Page
      title={t("Reward charts")}
      subtitle={t("Earn tokens for the behavior you want to see more of, then get the reward.")}
      actions={
        <button className="btn primary" onClick={() => setEditing(blank())}>
          <Plus size={18} /> {t("New chart")}
        </button>
      }
    >
      {charts.length === 0 ? (
        <Empty icon={<Star size={48} />} title={t("No reward charts yet")} text={t("Pick one small goal and a reward your child really wants.")} action={<button className="btn primary" onClick={() => setEditing(blank())}>{t("Make a reward chart")}</button>} />
      ) : (
        <div className="grid-2">
          {charts.map((c) => (
            <div key={c.id} className="card stack">
              <div className="spread">
                <h2>{c.title}</h2>
                <span className="badge ok">
                  {c.completedCount}× {t("earned")}
                </span>
              </div>
              <div className="row" style={{ gap: 6, fontSize: "1.8rem" }}>
                {Array.from({ length: c.goal }, (_, i) => (
                  <span key={i} style={{ opacity: i < c.earned ? 1 : 0.18 }}>
                    {c.token}
                  </span>
                ))}
                <span style={{ marginInlineStart: 8 }}>→ {c.rewardEmoji}</span>
              </div>
              <p className="muted">
                {c.earned}/{c.goal} · {t("Reward")}: {c.reward}
              </p>
              <div className="row">
                <button className="btn primary" onClick={() => nav(`/rewards/${c.id}`)}>
                  <Play size={16} /> {t("Show")}
                </button>
                <button className="btn" disabled={c.earned >= c.goal} onClick={() => upsert("rewardCharts", { ...c, earned: c.earned + 1 })}>
                  <Plus size={16} /> {t("Add token")}
                </button>
                <button className="btn ghost icon" onClick={() => setEditing(c)} aria-label={t("Edit")}>
                  <Pencil size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <ChartForm chart={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
}

function ChartForm({ chart, onClose }: { chart: Draft; onClose: () => void }) {
  const { t } = useI18n();
  const [c, setC] = useState(chart);
  const del = async () => {
    if (c.id && (await ask(t("Delete this reward chart?")))) {
      remove("rewardCharts", c.id);
      onClose();
    }
  };
  return (
    <Modal
      title={c.id ? t("Edit reward chart") : t("New reward chart")}
      onClose={onClose}
      footer={
        <>
          {c.id && (
            <button className="btn danger" onClick={del}>
              <Trash2 size={16} />
            </button>
          )}
          <button className="btn primary" disabled={!c.title.trim()} onClick={() => { upsert("rewardCharts", { ...c, earned: Math.min(c.earned, c.goal) }); onClose(); }}>
            {t("Save")}
          </button>
        </>
      }
    >
      <div className="stack">
        <Field label={t("What earns a token?")} hint={t("one clear behavior")}>
          <input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} autoFocus />
        </Field>
        <Field label={t("Tokens needed")}>
          <Chips options={[3, 4, 5, 6, 8, 10].map((n) => ({ value: n, label: String(n) }))} value={c.goal} onChange={(goal) => setC({ ...c, goal })} />
        </Field>
        <Field label={t("Token picture")}>
          <Chips options={TOKENS.map((x) => ({ value: x, label: x }))} value={c.token} onChange={(token) => setC({ ...c, token })} />
        </Field>
        <div className="grid-2">
          <Field label={t("Reward")}>
            <input value={c.reward} onChange={(e) => setC({ ...c, reward: e.target.value })} />
          </Field>
          <Field label={t("Reward picture")}>
            <input value={c.rewardEmoji} onChange={(e) => setC({ ...c, rewardEmoji: e.target.value })} maxLength={4} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export function ShowRewardChart() {
  const { t } = useI18n();
  const { id } = useParams();
  const data = useData();
  const nav = useNavigate();
  const c = data.rewardCharts.find((x) => x.id === id);
  useEffect(() => {
    void fullscreen(true);
    return () => void fullscreen(false);
  }, []);
  if (!c) return null;
  const done = c.earned >= c.goal;

  const tap = (i: number) => {
    if (i !== c.earned || done) return;
    const earned = c.earned + 1;
    upsert("rewardCharts", { ...c, earned });
    if (earned >= c.goal) {
      chime();
      speak(`${t("You did it!")} ${c.reward}`);
    }
  };

  return (
    <div className="show" style={{ alignItems: "center" }}>
      <div className="spread" style={{ width: "100%" }}>
        <h1>{c.title}</h1>
        <HoldToExit onExit={() => nav("/rewards")} />
      </div>
      <div className="grow stack" style={{ alignItems: "center", justifyContent: "center", gap: 36 }}>
        {done ? (
          <>
            <div className="celebrate">{c.rewardEmoji}</div>
            <h1 style={{ fontSize: "3rem" }}>{t("You did it!")}</h1>
            <p style={{ fontSize: "1.6rem" }}>{c.reward}</p>
            <button className="btn big primary" onClick={() => upsert("rewardCharts", { ...c, earned: 0, completedCount: c.completedCount + 1 })}>
              <RotateCcw size={20} /> {t("Start a new chart")}
            </button>
          </>
        ) : (
          <>
            <div className="tokens">
              {Array.from({ length: c.goal }, (_, i) => (
                <button key={i} className={"token" + (i < c.earned ? " on" : "")} onClick={() => tap(i)} aria-label={`${i + 1}`}>
                  {i < c.earned ? c.token : ""}
                </button>
              ))}
            </div>
            <p style={{ fontSize: "1.6rem", fontWeight: 600 }}>
              {t("Working for")}: {c.rewardEmoji} {c.reward}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
