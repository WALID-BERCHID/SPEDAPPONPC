import { useNavigate } from "react-router-dom";
import { Activity, BookOpen, LayoutGrid, Target, UserPlus, MessageSquare } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import { useData } from "../lib/store";
import { age, daysAgo, fullName, today } from "../lib/util";
import { Avatar, Empty, Page } from "../components/ui";

export function Home() {
  const { t, date } = useI18n();
  const data = useData();
  const { child } = useChild();
  const nav = useNavigate();
  const hour = new Date().getHours();
  const hello = t(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  const title = data.profile.name ? `${hello}, ${data.profile.name}` : hello;

  if (!child) {
    return (
      <Page title={title}>
        <Empty
          icon={<UserPlus size={48} />}
          title={t("Add your first child")}
          text={t("Start with a profile. You can add goals, notes and schedules after.")}
          action={
            <button className="btn primary big" onClick={() => nav("/children/new")}>
              {t("Add a child")}
            </button>
          }
        />
      </Page>
    );
  }

  const weekAgo = daysAgo(7);
  const twoWeeksAgo = daysAgo(14);
  const goals = data.goals.filter((g) => g.childId === child.id && g.status === "active");
  const points = data.dataPoints.filter((p) => p.childId === child.id);
  const behaviors = data.behaviors.filter((b) => b.childId === child.id);
  const thisWeek = behaviors.filter((b) => b.at.slice(0, 10) > weekAgo).length;
  const lastWeek = behaviors.filter((b) => b.at.slice(0, 10) > twoWeeksAgo && b.at.slice(0, 10) <= weekAgo).length;
  const stale = goals.filter((g) => !points.some((p) => p.goalId === g.id && p.date > twoWeeksAgo));
  const logs = data.dailyLogs.filter((l) => l.childId === child.id).sort((a, b) => b.date.localeCompare(a.date));
  const lastMessage = logs.find((l) => l.message.trim());
  const todayLogged = logs.some((l) => l.date === today());
  const years = age(child.birthDate);

  const actions = [
    { to: "/behavior", icon: <Activity size={28} />, label: "Log a behavior" },
    { to: "/goals", icon: <Target size={28} />, label: "Record progress" },
    { to: "/notebook", icon: <BookOpen size={28} />, label: todayLogged ? "Today's notebook ✓" : "Write today's notebook" },
    { to: "/visual", icon: <LayoutGrid size={28} />, label: "Show a schedule" },
  ];

  return (
    <Page title={title} subtitle={date(today(), { weekday: "long", day: "numeric", month: "long" })}>
      <div className="stack">
        <div className="card row" style={{ gap: 16 }}>
          <Avatar child={child} size="lg" />
          <div className="stack-sm">
            <h2>{fullName(child)}</h2>
            <p className="muted">
              {years != null && `${years} ${t("years old")}`}
              {child.school && ` · ${child.school}`}
            </p>
            {child.strengths && (
              <p>
                <strong>{t("Strengths")}:</strong> {child.strengths}
              </p>
            )}
          </div>
        </div>

        <div className="grid">
          {actions.map((a) => (
            <button key={a.to} className="card link row" onClick={() => nav(a.to)} style={{ gap: 14 }}>
              <span style={{ color: "var(--primary)" }}>{a.icon}</span>
              <strong>{t(a.label)}</strong>
            </button>
          ))}
        </div>

        <div className="grid">
          <div className="card stack-sm">
            <span className="muted">{t("Active goals")}</span>
            <span className="stat">{goals.length}</span>
            <span className="small muted">
              {points.filter((p) => p.date > weekAgo).length} {t("data entries this week")}
            </span>
          </div>
          <div className="card stack-sm">
            <span className="muted">{t("Behaviors this week")}</span>
            <span className="stat">{thisWeek}</span>
            <span className="small muted">
              {t("Last week")}: {lastWeek}
            </span>
          </div>
          <div className="card stack-sm">
            <span className="muted">{t("Goals without data for 2 weeks")}</span>
            <span className="stat" style={{ color: stale.length ? "var(--accent)" : undefined }}>
              {stale.length}
            </span>
            <span className="small muted">{stale.map((g) => g.title).join(", ") || t("All goals are up to date")}</span>
          </div>
        </div>

        {lastMessage && (
          <div className="card stack-sm">
            <div className="row">
              <MessageSquare size={20} color="var(--primary)" />
              <strong>
                {t(lastMessage.setting === "school" ? "Latest message from school" : "Latest message from home")}
              </strong>
              <span className="muted small">
                {date(lastMessage.date)} · {lastMessage.author}
              </span>
            </div>
            <p>{lastMessage.message}</p>
          </div>
        )}
      </div>
    </Page>
  );
}
