import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HashRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { BarChart3, BookOpen, Heart, Home as HomeIcon, Lock, Settings as SettingsIcon, Target, Timer, Users, Activity, LayoutGrid, Globe, ListChecks } from "lucide-react";
import { APP_NAME, DONATE_URL } from "./lib/app";
import { I18nContext, makeI18n, rememberCountry, savedCountry, useI18n } from "./lib/i18n";
import { closeStore, flush, useData, useSaveState } from "./lib/store";
import { isTauri, storage } from "./lib/storage";
import { parseFile, type VaultFile } from "./lib/crypto";
import type { Settings as SettingsT } from "./lib/schema";
import { ChildContext, useChild } from "./lib/childContext";
import { Setup, Unlock } from "./features/Welcome";
import { Home } from "./features/Home";
import { ChildrenPage, ChildEditor, AllAboutMe } from "./features/Children";
import { GoalsPage, GoalDetail } from "./features/Goals";
import { BehaviorPage } from "./features/Behavior";
import { NotebookPage } from "./features/Notebook";
import { VisualPage, ScheduleEditor, ShowSchedule, VisualTimer } from "./features/Visual";
import { ReportPage } from "./features/Reports";
import { CommunityPage } from "./features/Community";
import { ChecklistsPage } from "./features/Checklists";
import { SettingsPage, openLink } from "./features/Settings";
import { fullName } from "./lib/util";

type Phase = { name: "loading" } | { name: "setup" } | { name: "locked"; file: VaultFile } | { name: "open" };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [country, setCountry] = useState(savedCountry);
  const i18n = useMemo(() => makeI18n(country), [country]);

  const load = async () => {
    const text = await storage.load();
    const file = text && parseFile(text);
    setPhase(file && file.format === "handinhand-vault" ? { name: "locked", file } : { name: "setup" });
  };

  useEffect(() => {
    void load();
  }, []);

  const lock = async () => {
    setPhase({ name: "loading" });
    await closeStore();
    await load();
  };

  const changeCountry = (c: typeof country) => {
    rememberCountry(c);
    setCountry(c);
  };

  return (
    <I18nContext.Provider value={i18n}>
      {phase.name === "loading" && <div className="center-screen muted">…</div>}
      {phase.name === "setup" && <Setup country={country} onCountry={changeCountry} onDone={() => setPhase({ name: "open" })} />}
      {phase.name === "locked" && <Unlock file={phase.file} onDone={() => setPhase({ name: "open" })} />}
      {phase.name === "open" && <Unlocked onLock={lock} onCountry={changeCountry} />}
    </I18nContext.Provider>
  );
}

function useAppearance(s: SettingsT) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = s.theme;
    root.style.setProperty("--scale", String(s.textScale));
    root.classList.toggle("readable", s.readableFont);
    root.classList.toggle("reduce-motion", s.reduceMotion);
  }, [s.theme, s.textScale, s.readableFont, s.reduceMotion]);
}

function useAutoLock(minutes: number, onLock: () => void) {
  useEffect(() => {
    if (!minutes) return;
    let t: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(onLock, minutes * 60_000);
    };
    const events = ["pointerdown", "keydown", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes, onLock]);
}

function Unlocked({ onLock, onCountry }: { onLock: () => void; onCountry: (c: SettingsT["country"]) => void }) {
  const data = useData();
  const [childId, setChildIdState] = useState(() => localStorage.getItem("hih.child") ?? "");
  useAppearance(data.settings);
  useAutoLock(data.settings.autoLockMinutes, onLock);

  useEffect(() => onCountry(data.settings.country), [data.settings.country]);
  useEffect(() => {
    // Save any pending change before the window closes.
    const save = () => void flush();
    window.addEventListener("beforeunload", save);
    let unlisten: (() => void) | undefined;
    if (isTauri) {
      void import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
        unlisten = await getCurrentWindow().onCloseRequested(() => flush());
      });
    }
    return () => {
      window.removeEventListener("beforeunload", save);
      unlisten?.();
    };
  }, []);

  const child = data.children.find((c) => c.id === childId) ?? data.children[0] ?? null;
  const setChildId = (id: string) => {
    localStorage.setItem("hih.child", id);
    setChildIdState(id);
  };

  return (
    <ChildContext.Provider value={{ child, setChildId }}>
      <HashRouter>
        <div className="shell">
          <Sidebar onLock={onLock} />
          <main className="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/children" element={<ChildrenPage />} />
              <Route path="/children/new" element={<ChildEditor />} />
              <Route path="/children/:id" element={<ChildEditor />} />
              <Route path="/children/:id/about" element={<AllAboutMe />} />
              <Route path="/goals" element={<NeedsChild><GoalsPage /></NeedsChild>} />
              <Route path="/goals/:id" element={<GoalDetail />} />
              <Route path="/behavior" element={<NeedsChild><BehaviorPage /></NeedsChild>} />
              <Route path="/notebook" element={<NeedsChild><NotebookPage /></NeedsChild>} />
              <Route path="/visual" element={<NeedsChild><VisualPage /></NeedsChild>} />
              <Route path="/visual/timer" element={<VisualTimer />} />
              <Route path="/visual/:id" element={<ScheduleEditor />} />
              <Route path="/visual/:id/show" element={<ShowSchedule />} />
              <Route path="/checklists" element={<NeedsChild><ChecklistsPage /></NeedsChild>} />
              <Route path="/reports" element={<NeedsChild><ReportPage /></NeedsChild>} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/settings" element={<SettingsPage onLock={onLock} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </ChildContext.Provider>
  );
}

function NeedsChild({ children }: { children: ReactNode }) {
  const { child } = useChild();
  return child ? <>{children}</> : <Navigate to="/children/new" />;
}

function Sidebar({ onLock }: { onLock: () => void }) {
  const { t } = useI18n();
  const data = useData();
  const saveState = useSaveState();
  const { child, setChildId } = useChild();
  const links: [string, string, ReactNode][] = [
    ["/", "Today", <HomeIcon size={20} />],
    ["/children", "Children", <Users size={20} />],
    ["/goals", "Goals & progress", <Target size={20} />],
    ["/behavior", "Behavior", <Activity size={20} />],
    ["/notebook", "Daily notebook", <BookOpen size={20} />],
    ["/visual", "Visual supports", <LayoutGrid size={20} />],
    ["/visual/timer", "Visual timer", <Timer size={20} />],
    ["/checklists", "Checklists", <ListChecks size={20} />],
    ["/reports", "Reports", <BarChart3 size={20} />],
    ["/community", "Community", <Globe size={20} />],
    ["/settings", "Settings", <SettingsIcon size={20} />],
  ];
  return (
    <aside className="sidebar no-print">
      <div className="brand">
        <img src="/icon.svg" alt="" />
        {APP_NAME}
      </div>
      {data.children.length > 0 && (
        <label className="field">
          <span className="small muted">{t("Working with")}</span>
          <select value={child?.id ?? ""} onChange={(e) => setChildId(e.target.value)}>
            {data.children.map((c) => (
              <option key={c.id} value={c.id}>
                {fullName(c)}
              </option>
            ))}
          </select>
        </label>
      )}
      <nav className="nav" aria-label="Main">
        {links.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end>
            {icon}
            {t(label)}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        {DONATE_URL && (
          <button className="btn" onClick={() => openLink(DONATE_URL)}>
            <Heart size={18} color="var(--accent)" /> {t("Support this project")}
          </button>
        )}
        <button className="btn" onClick={onLock}>
          <Lock size={18} /> {t("Lock")}
        </button>
        <span className="small muted" role="status" style={{ textAlign: "center" }}>
          {saveState === "saving" ? t("Saving…") : saveState === "error" ? t("Could not save!") : t("All changes saved")}
        </span>
      </div>
    </aside>
  );
}
