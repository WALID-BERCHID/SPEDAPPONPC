import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { BookHeart, CornerDownLeft, LayoutGrid, ListChecks, MessageSquareText, Star, Target, User } from "lucide-react";
import { NAV } from "../lib/nav";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import { useData } from "../lib/store";
import { fullName } from "../lib/util";
import { SearchBox, Tile } from "../components/ui";

interface Item {
  key: string;
  label: string;
  detail: string;
  icon: ReactNode;
  go: () => void;
}

/** Spotlight-style search across pages and everything in the vault (Ctrl+K). */
export function QuickSearch({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const data = useData();
  const nav = useNavigate();
  const { setChildId } = useChild();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const childName = (id: string) => data.children.find((c) => c.id === id)?.firstName ?? "";

  const items = useMemo<Item[]>(() => {
    const open = (childId: string, path: string) => () => {
      setChildId(childId);
      nav(path);
    };
    return [
      ...NAV.flatMap((s) => s.links).map(([to, label, color, icon]) => ({ key: to, label: t(label), detail: t("Page"), icon: <Tile color={color}>{icon}</Tile>, go: () => nav(to) })),
      { key: "settings", label: t("Settings"), detail: t("Page"), icon: <Tile color="#8e8e93"><User size={15} /></Tile>, go: () => nav("/settings") },
      ...data.children.map((c) => ({ key: c.id, label: fullName(c), detail: t("Child profile"), icon: <Tile color={c.color}><User size={15} /></Tile>, go: open(c.id, `/children/${c.id}`) })),
      ...data.goals.map((g) => ({ key: g.id, label: g.title, detail: `${t("Goal")} · ${childName(g.childId)}`, icon: <Tile color="#34c759"><Target size={15} /></Tile>, go: open(g.childId, `/goals/${g.id}`) })),
      ...data.schedules.map((s) => ({ key: s.id, label: s.title, detail: `${t("Schedule")} · ${childName(s.childId)}`, icon: <Tile color="#5856d6"><LayoutGrid size={15} /></Tile>, go: open(s.childId, `/visual/${s.id}/show`) })),
      ...data.stories.map((s) => ({ key: s.id, label: s.title, detail: `${t("Social story")} · ${childName(s.childId)}`, icon: <Tile color="#af52de"><BookHeart size={15} /></Tile>, go: open(s.childId, `/stories/${s.id}/read`) })),
      ...data.boards.map((b) => ({ key: b.id, label: b.title, detail: `${t("Talking board")} · ${childName(b.childId)}`, icon: <Tile color="#30b0c7"><MessageSquareText size={15} /></Tile>, go: open(b.childId, "/talk") })),
      ...data.rewardCharts.map((r) => ({ key: r.id, label: r.title, detail: `${t("Reward chart")} · ${childName(r.childId)}`, icon: <Tile color="#ffcc00"><Star size={15} /></Tile>, go: open(r.childId, `/rewards/${r.id}`) })),
      ...data.checklists.map((c) => ({ key: c.id, label: c.title, detail: `${t("Checklist")} · ${childName(c.childId)}`, icon: <Tile color="#32d74b"><ListChecks size={15} /></Tile>, go: open(c.childId, "/checklists") })),
    ];
  }, [data]);

  const shown = items.filter((i) => !q || `${i.label} ${i.detail}`.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  useEffect(() => setSel(0), [q]);

  const pick = (i: Item | undefined) => {
    if (!i) return;
    i.go();
    onClose();
  };

  return (
    <div
      className="backdrop palette-wrap"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowDown") (e.preventDefault(), setSel((s) => Math.min(s + 1, shown.length - 1)));
        if (e.key === "ArrowUp") (e.preventDefault(), setSel((s) => Math.max(s - 1, 0)));
        if (e.key === "Enter") pick(shown[sel]);
      }}
    >
      <div className="palette" role="dialog" aria-label={t("Search")}>
        <div className="search-wrap" ref={(el) => el?.querySelector("input")?.focus()}>
          <SearchBox value={q} onChange={setQ} placeholder={t("Search pages, children, goals, schedules, stories…")} />
        </div>
        <div className="results" role="listbox">
          {shown.map((i, n) => (
            <button key={i.key} role="option" aria-selected={n === sel} className="cell" onMouseEnter={() => setSel(n)} onClick={() => pick(i)}>
              {i.icon}
              <span className="label">
                {i.label}
                <span className="tiny muted" style={{ display: "block" }}>
                  {i.detail}
                </span>
              </span>
              {n === sel && <CornerDownLeft size={14} />}
            </button>
          ))}
          {!shown.length && <p className="muted small" style={{ padding: 12 }}>{t("No results")}</p>}
        </div>
      </div>
    </div>
  );
}
