import { useState } from "react";
import { CalendarClock, HeartPulse, Pill, Stethoscope, Thermometer, Moon, Trash2, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import type { HealthEvent, HealthType } from "../lib/schema";
import { remove, upsert, useData } from "../lib/store";
import { localDateTime } from "../lib/util";
import { Empty, Field, Modal, Page, Segmented, Tile } from "../components/ui";

export const HEALTH_TYPES: Record<HealthType, { label: string; color: string; icon: ReactNode; titleHint: string }> = {
  medication: { label: "Medicine", color: "#34c759", icon: <Pill size={16} />, titleHint: "Name and dose, e.g. Melatonin 1 mg" },
  seizure: { label: "Seizure", color: "#ff3b30", icon: <Zap size={16} />, titleHint: "Type, e.g. absence, tonic-clonic" },
  sleep: { label: "Sleep", color: "#5856d6", icon: <Moon size={16} />, titleHint: "e.g. Woke up 3 times" },
  illness: { label: "Illness", color: "#ff9500", icon: <Thermometer size={16} />, titleHint: "e.g. Fever 38.5°C" },
  appointment: { label: "Appointment", color: "#007aff", icon: <Stethoscope size={16} />, titleHint: "Who and where, e.g. Speech therapy, Dr Lee" },
  other: { label: "Other", color: "#8e8e93", icon: <HeartPulse size={16} />, titleHint: "" },
};

type Draft = Omit<HealthEvent, "id" | "createdAt" | "updatedAt"> & Partial<Pick<HealthEvent, "id" | "createdAt">>;

export function upcomingAppointments(list: HealthEvent[], childId: string, days = 14) {
  const now = new Date().toISOString();
  const until = new Date(Date.now() + days * 86400000).toISOString();
  return list.filter((h) => h.childId === childId && h.type === "appointment" && h.at >= now && h.at <= until).sort((a, b) => a.at.localeCompare(b.at));
}

export function HealthPage() {
  const { t, date, time } = useI18n();
  const data = useData();
  const { child } = useChild();
  const [filter, setFilter] = useState<HealthType | "all">("all");
  const [editing, setEditing] = useState<Draft | null>(null);
  const all = data.health.filter((h) => h.childId === child!.id).sort((a, b) => b.at.localeCompare(a.at));
  const now = new Date().toISOString();
  const upcoming = upcomingAppointments(data.health, child!.id, 60);
  const past = all.filter((h) => (filter === "all" || h.type === filter) && !(h.type === "appointment" && h.at >= now));
  const add = (type: HealthType) => setEditing({ childId: child!.id, type, at: localDateTime(), title: "", details: "", minutes: null });

  const row = (h: HealthEvent) => {
    const meta = HEALTH_TYPES[h.type];
    return (
      <div key={h.id} className="cell indent">
        <Tile color={meta.color}>{meta.icon}</Tile>
        <button className="label" style={{ background: "none", border: "none", font: "inherit", color: "inherit", textAlign: "start", cursor: "pointer", padding: 0 }} onClick={() => setEditing({ ...h, at: localDateTime(new Date(h.at)) })}>
          <strong>{h.title || t(meta.label)}</strong>
          <span className="tiny muted" style={{ display: "block" }}>
            {date(h.at)} · {time(h.at)}
            {h.minutes ? ` · ${h.minutes} min` : ""}
            {h.details && ` · ${h.details}`}
          </span>
        </button>
        <button className="btn ghost icon" aria-label={t("Delete")} onClick={() => remove("health", h.id)}>
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  return (
    <Page title={t("Health")} subtitle={`${child!.firstName} · ${t("medicine, seizures, sleep, illness and appointments")}`}>
      <div className="stack">
        <div className="grid-3">
          {(Object.keys(HEALTH_TYPES) as HealthType[]).filter((k) => k !== "other").map((k) => (
            <button key={k} className="card link row" style={{ gap: 12 }} onClick={() => add(k)}>
              <Tile color={HEALTH_TYPES[k].color} size="lg">
                {HEALTH_TYPES[k].icon}
              </Tile>
              <span className="stack-sm" style={{ gap: 0 }}>
                <strong>{t(HEALTH_TYPES[k].label)}</strong>
                <span className="tiny muted">{t(k === "appointment" ? "Add an appointment" : "Log now")}</span>
              </span>
            </button>
          ))}
        </div>

        {upcoming.length > 0 && (
          <div className="stack-sm">
            <div className="section-title">
              <CalendarClock size={13} /> {t("Coming up")}
            </div>
            <div className="group">{upcoming.map(row)}</div>
          </div>
        )}

        <div className="spread">
          <div className="section-title" style={{ margin: 0 }}>
            {t("History")}
          </div>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[{ value: "all" as const, label: t("All") }, ...(Object.keys(HEALTH_TYPES) as HealthType[]).map((k) => ({ value: k, label: t(HEALTH_TYPES[k].label) }))]}
          />
        </div>
        {past.length ? <div className="group">{past.slice(0, 80).map(row)}</div> : <Empty icon={<HeartPulse size={44} />} title={t("Nothing logged yet")} text={t("Use the buttons above to log medicine, seizures, sleep or illness.")} />}
      </div>
      {editing && <HealthForm entry={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
}

function HealthForm({ entry, onClose }: { entry: Draft; onClose: () => void }) {
  const { t } = useI18n();
  const [h, setH] = useState(entry);
  const meta = HEALTH_TYPES[h.type];
  const save = () => {
    upsert("health", { ...h, at: new Date(h.at).toISOString() });
    onClose();
  };
  return (
    <Modal title={t(meta.label)} onClose={onClose} footer={<button className="btn primary" onClick={save}>{t("Save")}</button>}>
      <div className="stack">
        <Segmented value={h.type} onChange={(type) => setH({ ...h, type })} options={(Object.keys(HEALTH_TYPES) as HealthType[]).map((k) => ({ value: k, label: t(HEALTH_TYPES[k].label) }))} />
        <Field label={t(h.type === "appointment" ? "With / where" : "What")} hint={meta.titleHint && t(meta.titleHint)}>
          <input value={h.title} onChange={(e) => setH({ ...h, title: e.target.value })} autoFocus />
        </Field>
        <div className="grid-2">
          <Field label={t("When")}>
            <input type="datetime-local" value={h.at} onChange={(e) => setH({ ...h, at: e.target.value })} />
          </Field>
          {(h.type === "seizure" || h.type === "sleep" || h.type === "appointment") && (
            <Field label={t("How long")} hint={t("minutes")}>
              <input type="number" min={0} value={h.minutes ?? ""} onChange={(e) => setH({ ...h, minutes: e.target.value === "" ? null : Number(e.target.value) })} />
            </Field>
          )}
        </div>
        <Field label={t("Notes")}>
          <textarea value={h.details} onChange={(e) => setH({ ...h, details: e.target.value })} />
        </Field>
        {h.type === "seizure" && <p className="notice small">{t("Call emergency services if a seizure lasts more than 5 minutes or follow your child's seizure plan.")}</p>}
      </div>
    </Modal>
  );
}
