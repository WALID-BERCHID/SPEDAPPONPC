import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from "react";
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Heart, Lock, Search, Settings as SettingsIcon } from "lucide-react";
import { NAV } from "./lib/nav";
import { APP_NAME, DONATE_URL } from "./lib/app";
import { I18nContext, makeI18n, rememberCountry, savedCountry, useI18n } from "./lib/i18n";
import { closeStore, flush, useData, useSaveState } from "./lib/store";
import { isTauri, storage } from "./lib/storage";
import { parseFile, type VaultFile } from "./lib/crypto";
import type { Settings as SettingsT } from "./lib/schema";
import { ChildContext, useChild } from "./lib/childContext";
import { fullName } from "./lib/util";
import { Avatar, Tile } from "./components/ui";
import { Setup, Unlock } from "./features/Welcome";
import { Home } from "./features/Home";
import { ChildrenPage, ChildEditor, AllAboutMe } from "./features/Children";
import { GoalsPage, GoalDetail } from "./features/Goals";
import { BehaviorPage } from "./features/Behavior";
import { NotebookPage } from "./features/Notebook";
import { VisualPage, ScheduleEditor, ShowSchedule, VisualTimer } from "./features/Visual";
import { ReportPage } from "./features/Reports";
import { ChecklistsPage } from "./features/Checklists";
import { StoriesPage, StoryEditor, StoryReader } from "./features/Stories";
import { TalkPage } from "./features/Talk";
import { CalmCorner } from "./features/Calm";
import { RewardChartsPage, ShowRewardChart } from "./features/RewardCharts";
import { HealthPage } from "./features/Health";
import { SettingsPage, openLink } from "./features/Settings";
import { QuickSearch } from "./features/QuickSearch";

// The community (and its server library) loads only when opened.
const CommunityHub = lazy(() => import("./features/community/Hub").then((m) => ({ default: m.CommunityHub })));
const PostView = lazy(() => import("./features/community/PostView").then((m) => ({ default: m.PostView })));
const CertificateView = lazy(() => import("./features/community/CertificateView").then((m) => ({ default: m.CertificateView })));

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
      {phase.name === "loading" && <div className="center-screen" />}
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
  const [searching, setSearching] = useState(false);
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
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("keydown", onKey);
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
          <Sidebar onLock={onLock} onSearch={() => setSearching(true)} />
          <Main>
            <Suspense fallback={null}>
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
                <Route path="/health" element={<NeedsChild><HealthPage /></NeedsChild>} />
                <Route path="/visual" element={<NeedsChild><VisualPage /></NeedsChild>} />
                <Route path="/visual/timer" element={<VisualTimer />} />
                <Route path="/visual/:id" element={<ScheduleEditor />} />
                <Route path="/visual/:id/show" element={<ShowSchedule />} />
                <Route path="/stories" element={<NeedsChild><StoriesPage /></NeedsChild>} />
                <Route path="/stories/:id" element={<StoryEditor />} />
                <Route path="/stories/:id/read" element={<StoryReader />} />
                <Route path="/talk" element={<NeedsChild><TalkPage /></NeedsChild>} />
                <Route path="/rewards" element={<NeedsChild><RewardChartsPage /></NeedsChild>} />
                <Route path="/rewards/:id" element={<ShowRewardChart />} />
                <Route path="/calm" element={<CalmCorner />} />
                <Route path="/checklists" element={<NeedsChild><ChecklistsPage /></NeedsChild>} />
                <Route path="/reports" element={<NeedsChild><ReportPage /></NeedsChild>} />
                <Route path="/community" element={<CommunityHub />} />
                <Route path="/community/post/:id" element={<PostView />} />
                <Route path="/community/certificate/:id" element={<CertificateView />} />
                <Route path="/settings" element={<SettingsPage onLock={onLock} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </Main>
        </div>
        {searching && <QuickSearch onClose={() => setSearching(false)} />}
      </HashRouter>
    </ChildContext.Provider>
  );
}

/** Scrolls to the top and replays the page animation on every navigation. */
function Main({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <main className="main" key={pathname}>
      {children}
    </main>
  );
}

function NeedsChild({ children }: { children: ReactNode }) {
  const { child } = useChild();
  return child ? <>{children}</> : <Navigate to="/children/new" />;
}

function Sidebar({ onLock, onSearch }: { onLock: () => void; onSearch: () => void }) {
  const { t } = useI18n();
  const data = useData();
  const saveState = useSaveState();
  const { child, setChildId } = useChild();
  const nav = useNavigate();
  return (
    <aside className="sidebar no-print">
      <div className="brand">
        <img src="/icon.svg" alt="" />
        {APP_NAME}
      </div>
      {child && (
        <label className="child-switch" title={t("Working with")}>
          <Avatar child={child} size="sm" />
          <select value={child.id} onChange={(e) => setChildId(e.target.value)} aria-label={t("Working with")}>
            {data.children.map((c) => (
              <option key={c.id} value={c.id}>
                {fullName(c)}
              </option>
            ))}
          </select>
        </label>
      )}
      <button className="btn ghost" style={{ justifyContent: "flex-start", color: "var(--muted)", fontWeight: 500, background: "var(--fill)" }} onClick={onSearch}>
        <Search size={15} /> <span className="grow" style={{ textAlign: "start" }}>{t("Search")}</span> <kbd>Ctrl K</kbd>
      </button>
      <nav className="nav" aria-label="Main">
        {NAV.map((section) => (
          <div key={section.title} className="nav">
            {section.title && <div className="nav-title">{t(section.title)}</div>}
            {section.links.map(([to, label, color, icon]) => (
              <NavLink key={to} to={to} end={to === "/" || to === "/visual"}>
                <Tile color={color}>{icon}</Tile>
                {t(label)}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="nav">
          <NavLink to="/settings">
            <Tile color="#8e8e93">
              <SettingsIcon size={15} />
            </Tile>
            {t("Settings")}
          </NavLink>
        </div>
        {DONATE_URL && (
          <button className="btn tinted" onClick={() => openLink(DONATE_URL)}>
            <Heart size={16} color="var(--pink)" /> {t("Support this project")}
          </button>
        )}
        <button className="btn" onClick={onLock}>
          <Lock size={15} /> {t("Lock")}
        </button>
        <span className={"save-state " + saveState} role="status" onClick={() => nav("/settings")}>
          {saveState === "saving" ? t("Saving…") : saveState === "error" ? t("Could not save!") : t("Saved and encrypted")}
        </span>
      </div>
    </aside>
  );
}
