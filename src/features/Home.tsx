import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, BookOpen, CalendarClock, LayoutGrid, MessageSquare, MessageSquareText, Sparkles, Star, Target, TrendingDown, TrendingUp, UserPlus } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import { useData } from "../lib/store";
import { age, daysAgo, fullName, today } from "../lib/util";
import { Avatar, Empty, Group, Page, Tile } from "../components/ui";
import { upcomingAppointments } from "./Health";
import { FEELINGS } from "./Calm";

export function Home() {
  const { t, date, time } = useI18n();
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
          icon={<UserPlus size={52} />}
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
  const appts = upcomingAppointments(data.health, child.id, 14);
  const charts = data.rewardCharts.filter((r) => r.childId === child.id);
  const feeling = data.feelings.filter((f) => f.childId === child.id).sort((a, b) => b.at.localeCompare(a.at))[0];
  const years = age(child.birthDate);

  const actions: [string, string, string, ReactNode][] = [
    ["/behavior", "Log a behavior", "#ff3b30", <Activity size={20} />],
    ["/goals", "Record progress", "#34c759", <Target size={20} />],
    ["/notebook", todayLogged ? "Today's notebook ✓" : "Write today's notebook", "#ff9f0a", <BookOpen size={20} />],
    ["/visual", "Show a schedule", "#5856d6", <LayoutGrid size={20} />],
    ["/talk", "Talking board", "#30b0c7", <MessageSquareText size={20} />],
    ["/calm", "Calm corner", "#64d2ff", <Sparkles size={20} />],
  ];

  return (
    <Page title={title} subtitle={date(today(), { weekday: "long", day: "numeric", month: "long" })}>
      <div className="stack">
        <div className="hero row" style={{ background: `linear-gradient(135deg, ${child.color}, ${child.color}cc 60%, ${child.color}88)`, gap: 20 }}>
          <Avatar child={child} size="lg" />
          <div className="stack-sm grow" style={{ minWidth: 220 }}>
            <h1 style={{ fontSize: "1.9rem" }}>{fullName(child)}</h1>
            <p className="muted">{[years != null && `${years} ${t("years old")}`, child.school].filter(Boolean).join(" · ")}</p>
            {child.strengths && <p style={{ maxWidth: 560 }}>✨ {child.strengths}</p>}
          </div>
          <div className="row" style={{ gap: 28 }}>
            <Stat label={t("Active goals")} value={goals.length} />
            <Stat label={t("Behaviors this week")} value={thisWeek} trend={thisWeek === lastWeek ? null : thisWeek < lastWeek ? "down" : "up"} />
            {feeling && <Stat label={t("Last feeling")} value={FEELINGS.find(([, n]) => n === feeling.feeling)?.[0] ?? "🙂"} />}
          </div>
        </div>

        <div className="grid-3">
          {actions.map(([to, label, color, icon]) => (
            <button key={to} className="card link row" style={{ gap: 14, padding: 16, flexWrap: "nowrap" }} onClick={() => nav(to)}>
              <Tile color={color} size="lg">
                {icon}
              </Tile>
              <strong>{t(label)}</strong>
            </button>
          ))}
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="stack">
            {lastMessage && (
              <Group title={t(lastMessage.setting === "school" ? "Latest message from school" : "Latest message from home")}>
                <div className="cell" style={{ alignItems: "flex-start" }}>
                  <MessageSquare size={18} color="var(--primary)" style={{ marginTop: 3 }} />
                  <span className="label">
                    {lastMessage.message}
                    <span className="tiny muted" style={{ display: "block", marginTop: 4 }}>
                      {date(lastMessage.date)} · {lastMessage.author}
                    </span>
                  </span>
                </div>
              </Group>
            )}
            <Group title={t("Coming up")}>
              {appts.length === 0 && (
                <div className="cell">
                  <span className="label small muted">{t("No appointments in the next 2 weeks.")}</span>
                </div>
              )}
              {appts.map((a) => (
                <button key={a.id} className="cell indent" onClick={() => nav("/health")}>
                  <Tile color="#007aff">
                    <CalendarClock size={15} />
                  </Tile>
                  <span className="label">
                    {a.title}
                    <span className="tiny muted" style={{ display: "block" }}>
                      {date(a.at, { weekday: "short", day: "numeric", month: "short" })} · {time(a.at)}
                    </span>
                  </span>
                </button>
              ))}
            </Group>
          </div>
          <div className="stack">
            <Group title={t("Needs attention")}>
              {stale.length === 0 ? (
                <div className="cell">
                  <span className="label small muted">{t("All goals are up to date. Great work!")}</span>
                </div>
              ) : (
                stale.map((g) => (
                  <button key={g.id} className="cell indent" onClick={() => nav(`/goals/${g.id}`)}>
                    <Tile color="#ff9500">
                      <Target size={15} />
                    </Tile>
                    <span className="label">
                      {g.title}
                      <span className="tiny muted" style={{ display: "block" }}>
                        {t("No data for 2 weeks")}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </Group>
            {charts.length > 0 && (
              <Group title={t("Reward charts")}>
                {charts.map((c) => (
                  <button key={c.id} className="cell indent" onClick={() => nav(`/rewards/${c.id}`)}>
                    <Tile color="#ffcc00">
                      <Star size={15} />
                    </Tile>
                    <span className="label">
                      {c.title}
                      <span className="tiny" style={{ display: "block" }}>
                        {c.token.repeat(c.earned)}
                        <span style={{ opacity: 0.25 }}>{c.token.repeat(Math.max(0, c.goal - c.earned))}</span> → {c.rewardEmoji}
                      </span>
                    </span>
                  </button>
                ))}
              </Group>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

function Stat({ label, value, trend }: { label: string; value: ReactNode; trend?: "up" | "down" | null }) {
  return (
    <div className="stack-sm" style={{ gap: 0 }}>
      <span className="stat row" style={{ gap: 4 }}>
        {value}
        {trend === "down" && <TrendingDown size={20} />}
        {trend === "up" && <TrendingUp size={20} />}
      </span>
      <span className="tiny muted">{label}</span>
    </div>
  );
}
