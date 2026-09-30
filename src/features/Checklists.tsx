import { useState } from "react";
import { ListChecks, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import type { Checklist } from "../lib/schema";
import { remove, uid, upsert, useData } from "../lib/store";
import { Empty, Page, ask } from "../components/ui";

// Built-in templates. More can be added here as { title, items }.
export const CHECKLIST_TEMPLATES: { title: string; items: string[] }[] = [
  {
    title: "Before an IEP / plan meeting",
    items: [
      "Ask for the draft plan and reports a few days before",
      "Print the progress report from this app",
      "Write down my child's strengths and what is going well",
      "List my top 3 concerns",
      "List the supports or services I want to ask about",
      "Bring the All About Me page",
      "Ask who is responsible for each goal and how progress will be shared",
      "Ask for a copy of the meeting notes",
      "Don't sign on the day if I need time to think",
    ],
  },
  {
    title: "Starting a new school or class",
    items: [
      "Visit the school together before the first day",
      "Take photos of the classroom, teacher and bathroom for a visual story",
      "Share the All About Me page with the teacher",
      "Agree how home and school will communicate",
      "Share the calming strategies that work",
      "Check medication and allergy plans are on file",
      "Practice the new morning routine for a week",
    ],
  },
  {
    title: "Doctor or dentist visit",
    items: [
      "Show a visual schedule of the visit",
      "Call ahead to ask for a quiet waiting area or first appointment",
      "Bring comfort items and headphones",
      "Bring a list of questions and current medications",
      "Bring snacks and a favorite activity for waiting",
      "Plan a reward for afterwards",
    ],
  },
  {
    title: "Sensory-friendly outing",
    items: [
      "Check opening times for quieter hours",
      "Pack ear defenders or headphones",
      "Pack sunglasses or a cap",
      "Pack snacks and water",
      "Agree on a signal for 'I need a break'",
      "Know where the quiet spot and exits are",
      "Plan how long we stay and show it on the timer",
    ],
  },
  {
    title: "Meltdown safety plan",
    items: [
      "Stay calm and use few words",
      "Keep everyone safe and remove dangerous objects",
      "Reduce noise, light and people nearby",
      "Offer the calm-down space or comfort item",
      "Wait. Don't ask questions or give demands yet",
      "When calm, reconnect warmly",
      "Log what happened before and after in the Behavior section",
    ],
  },
];

export function ChecklistsPage() {
  const { t } = useI18n();
  const data = useData();
  const { child } = useChild();
  const lists = data.checklists.filter((c) => c.childId === child!.id);
  const [openId, setOpenId] = useState<string | null>(lists[0]?.id ?? null);
  const open = lists.find((l) => l.id === openId) ?? null;

  const create = (tpl?: (typeof CHECKLIST_TEMPLATES)[number]) => {
    const c = upsert("checklists", {
      childId: child!.id,
      title: tpl ? t(tpl.title) : t("New checklist"),
      items: (tpl?.items ?? [""]).map((text) => ({ id: uid(), text: t(text), done: false })),
    });
    setOpenId(c.id);
  };

  return (
    <Page
      title={t("Checklists")}
      subtitle={`${child!.firstName} · ${t("for meetings, visits, transitions and routines")}`}
      actions={
        <button className="btn primary" onClick={() => create()}>
          <Plus size={18} /> {t("New checklist")}
        </button>
      }
    >
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="stack">
          {lists.length === 0 && <Empty icon={<ListChecks size={48} />} title={t("No checklists yet")} text={t("Start from a template or make your own.")} />}
          {lists.length > 0 && (
            <div className="card stack-sm no-print">
              <h2>{t("My checklists")}</h2>
              <div className="list">
                {lists.map((l) => {
                  const done = l.items.filter((i) => i.done).length;
                  return (
                    <button key={l.id} className="btn ghost spread" style={{ fontWeight: l.id === openId ? 700 : 500 }} onClick={() => setOpenId(l.id)}>
                      <span>{l.title}</span>
                      <span className="badge">
                        {done}/{l.items.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="card stack-sm no-print">
            <h2>{t("Templates")}</h2>
            <div className="list">
              {CHECKLIST_TEMPLATES.map((tpl) => (
                <button key={tpl.title} className="btn ghost spread" onClick={() => create(tpl)}>
                  <span>{t(tpl.title)}</span>
                  <Plus size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
        {open && <ChecklistEditor key={open.id} list={open} onDeleted={() => setOpenId(null)} />}
      </div>
    </Page>
  );
}

function ChecklistEditor({ list, onDeleted }: { list: Checklist; onDeleted: () => void }) {
  const { t } = useI18n();
  const save = (patch: Partial<Checklist>) => upsert("checklists", { ...list, ...patch });
  const setItem = (id: string, patch: Partial<Checklist["items"][number]>) => save({ items: list.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const del = async () => {
    if (await ask(t("Delete this checklist?"))) {
      remove("checklists", list.id);
      onDeleted();
    }
  };

  return (
    <div className="card stack">
      <input value={list.title} onChange={(e) => save({ title: e.target.value })} style={{ fontSize: "1.2rem", fontWeight: 700 }} aria-label={t("Title")} />
      <div className="stack-sm">
        {list.items.map((i) => (
          <div key={i.id} className="row" style={{ flexWrap: "nowrap" }}>
            <input type="checkbox" checked={i.done} onChange={(e) => setItem(i.id, { done: e.target.checked })} aria-label={i.text} />
            <input
              value={i.text}
              onChange={(e) => setItem(i.id, { text: e.target.value })}
              style={{ textDecoration: i.done ? "line-through" : undefined, opacity: i.done ? 0.6 : 1 }}
            />
            <button className="btn ghost icon no-print" aria-label={t("Remove")} onClick={() => save({ items: list.items.filter((x) => x.id !== i.id) })}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="row no-print">
        <button className="btn" onClick={() => save({ items: [...list.items, { id: uid(), text: "", done: false }] })}>
          <Plus size={18} /> {t("Add item")}
        </button>
        <button className="btn" onClick={() => save({ items: list.items.map((i) => ({ ...i, done: false })) })}>
          <RotateCcw size={18} /> {t("Untick all")}
        </button>
        <button className="btn" onClick={() => window.print()}>
          <Printer size={18} /> {t("Print")}
        </button>
        <button className="btn danger" onClick={del}>
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
