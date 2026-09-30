import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Award, BadgeCheck, CalendarDays, CheckCircle2, Download, Globe, Library, LogOut, MessageCircle, MessagesSquare, PenSquare, Plus, ShieldCheck, Sparkles, Users } from "lucide-react";
import { levelFor } from "../../community/levels";
import { communityConfigured, refreshCommunity, signOutCommunity, startPreview, useCommunity } from "../../community/state";
import type { Author, CommunityEvent, Group, Post, PostKind, Template, TemplateContent, TemplateKind } from "../../community/types";
import { DONATE_URL } from "../../lib/app";
import { useChild } from "../../lib/childContext";
import { useI18n } from "../../lib/i18n";
import { uid, upsert, useData } from "../../lib/store";
import { Empty, Field, Modal, Page, Ring, SearchBox, Segmented, Tile, tell } from "../../components/ui";
import { openLink } from "../Settings";
import { AuthorAvatar, AuthorLine, SignInSheet, timeAgo, usePrivacyCheck } from "./parts";
import { RewardsTab } from "./Rewards";

type Tab = "home" | "groups" | "ask" | "library" | "events" | "rewards";

export function CommunityHub() {
  const { t } = useI18n();
  const data = useData();
  const { api, profile, signedIn, ready } = useCommunity();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "home";
  const [signIn, setSignIn] = useState(false);
  const setTab = (v: Tab) => setParams({ tab: v });

  useEffect(() => {
    if (api && !ready) void refreshCommunity();
  }, [api, ready]);

  if (!api) return <Landing onPreview={() => startPreview(data.profile.name || "You")} />;
  if (!ready) return <Page title={t("Community")}>{t("Loading…")}</Page>;
  if (!signedIn || !profile) {
    return (
      <>
        <Landing onJoin={() => setSignIn(true)} />
        {signIn && <SignInSheet onClose={() => setSignIn(false)} />}
      </>
    );
  }

  const lvl = levelFor(profile.points);
  return (
    <Page
      title={t("Community")}
      subtitle={t("Families, teachers and specialists helping each other. Free, forever.")}
      actions={
        <button className="btn ghost row" onClick={() => setTab("rewards")} style={{ gap: 10 }}>
          <AuthorAvatar a={profile} size="sm" />
          <span className="stack-sm" style={{ gap: 0, textAlign: "start" }}>
            <strong style={{ color: "var(--text)" }}>{profile.display_name}</strong>
            <span className="tiny muted">
              {lvl.level.emoji} {t(lvl.level.name)} · <span className="num">{profile.points}</span> {t("points")}
            </span>
          </span>
        </button>
      }
    >
      <div className="stack">
        {api.mode === "preview" && (
          <div className="preview-banner">
            <span className="row">
              <Sparkles size={18} /> {t("Preview with sample posts. Nothing you do here is sent or saved.")}
            </span>
            <button className="btn" onClick={() => void signOutCommunity()}>
              {t("Leave preview")}
            </button>
          </div>
        )}
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "home", label: t("Home") },
            { value: "groups", label: t("Groups") },
            { value: "ask", label: t("Ask a specialist") },
            { value: "library", label: t("Library") },
            { value: "events", label: t("Live sessions") },
            { value: "rewards", label: t("Rewards") },
          ]}
        />
        {tab === "home" && <HomeTab groupId={params.get("group") ?? ""} onGroup={(g) => setParams(g ? { tab: "home", group: g } : { tab: "home" })} />}
        {tab === "groups" && <GroupsTab onOpen={(g) => setParams({ tab: "home", group: g })} />}
        {tab === "ask" && <AskTab />}
        {tab === "library" && <LibraryTab />}
        {tab === "events" && <EventsTab />}
        {tab === "rewards" && <RewardsTab />}
      </div>
    </Page>
  );
}

function Landing(props: { onPreview?: () => void; onJoin?: () => void }) {
  const { t } = useI18n();
  const item = (color: string, icon: ReactNode, title: string, text: string) => (
    <div className="card stack-sm">
      <Tile color={color} size="lg">
        {icon}
      </Tile>
      <h3>{t(title)}</h3>
      <p className="small muted">{t(text)}</p>
    </div>
  );
  return (
    <Page title={t("Community")}>
      <div className="stack">
        <div className="hero stack" style={{ background: "linear-gradient(135deg, #5856d6 0%, #007aff 55%, #34c759 100%)", gap: 14 }}>
          <Globe size={40} />
          <h1 style={{ fontSize: "2.2rem" }}>{t("You're not alone.")}</h1>
          <p className="muted" style={{ fontSize: "1.1rem", maxWidth: 620 }}>
            {t("A free space where parents, teachers and verified specialists help each other. Your child's private records never leave this computer.")}
          </p>
          <div className="row">
            {props.onJoin && (
              <button className="btn big" style={{ background: "#fff", color: "#007aff" }} onClick={props.onJoin}>
                {t("Join the community")}
              </button>
            )}
            {props.onPreview && (
              <button className="btn big" style={{ background: "#fff", color: "#007aff" }} onClick={props.onPreview}>
                <Sparkles size={18} /> {t("Explore a preview")}
              </button>
            )}
          </div>
          {!communityConfigured && <p className="small muted">{t("The live community is being set up. The preview shows how it will work, with sample posts.")}</p>}
        </div>
        <div className="grid">
          {item("#007aff", <MessagesSquare size={22} />, "Groups and forums", "Talk with people who understand, by topic, age and need.")}
          {item("#34c759", <BadgeCheck size={22} />, "Ask a specialist", "Free answers from verified volunteer SLPs, OTs, BCBAs, psychologists and teachers.")}
          {item("#ff9500", <Library size={22} />, "Template library", "Schedules, stories, boards and checklists, imported into your app with one click.")}
          {item("#af52de", <CalendarDays size={22} />, "Live sessions", "Free online Q&As and workshops hosted by volunteers.")}
          {item("#ff2d55", <Award size={22} />, "Points and certificates", "Helpers earn levels, badges and verifiable contribution certificates.")}
          {item("#5856d6", <ShieldCheck size={22} />, "Safe by design", "Adults only, verified specialists, moderators, and privacy checks before you post.")}
        </div>
        {DONATE_URL && (
          <div className="card spread">
            <p>{t("Donations keep the app and the community free for everyone.")}</p>
            <button className="btn primary" onClick={() => openLink(DONATE_URL)}>
              {t("Support this project")}
            </button>
          </div>
        )}
      </div>
    </Page>
  );
}

export function PostItem({ p, groups }: { p: Post; groups: Group[] }) {
  const nav = useNavigate();
  const { t } = useI18n();
  const g = groups.find((x) => x.id === p.group_id);
  return (
    <button className="cell post-item" onClick={() => nav(`/community/post/${p.id}`)}>
      <AuthorAvatar a={p.author} />
      <span className="label stack-sm" style={{ gap: 4 }}>
        <span className="row" style={{ gap: 6 }}>
          {p.kind === "question" && <span className={"badge " + (p.accepted_reply_id ? "ok" : "blue")}>{p.accepted_reply_id ? <><CheckCircle2 size={12} /> {t("Answered")}</> : t("Question")}</span>}
          {g && (
            <span className="tiny muted">
              {g.icon} {t(g.name)}
            </span>
          )}
        </span>
        <h3>{p.title}</h3>
        <span className="small muted clamp-2">{p.body}</span>
        <AuthorLine a={p.author} extra={<span className="tiny muted">· {t(timeAgo(p.created_at))}</span>} />
      </span>
      <span className="row muted small" style={{ flexShrink: 0 }}>
        <MessageCircle size={15} /> {p.reply_count}
      </span>
    </button>
  );
}

function HomeTab({ groupId, onGroup }: { groupId: string; onGroup: (g: string) => void }) {
  const { t, date } = useI18n();
  const { api, profile } = useCommunity();
  const [groups, setGroups] = useState<Group[]>([]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [search, setSearch] = useState("");
  const [helpers, setHelpers] = useState<Author[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    void api!.groups().then(setGroups);
    void api!.leaderboard().then(setHelpers);
    void api!.events().then(setEvents);
  }, [api]);
  useEffect(() => {
    const h = setTimeout(() => void api!.posts({ groupId: groupId || undefined, search }).then(setPosts), search ? 250 : 0);
    return () => clearTimeout(h);
  }, [api, groupId, search, composing]);

  const lvl = levelFor(profile!.points);
  return (
    <div className="grid-2" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)", alignItems: "start" }}>
      <div className="stack">
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <div className="grow">
            <SearchBox value={search} onChange={setSearch} placeholder={t("Search discussions")} />
          </div>
          <button className="btn primary" onClick={() => setComposing(true)}>
            <PenSquare size={16} /> {t("New post")}
          </button>
        </div>
        <div className="chips scroll">
          <button className="chip" aria-pressed={!groupId} onClick={() => onGroup("")}>
            {t("All")}
          </button>
          {groups.map((g) => (
            <button key={g.id} className="chip" aria-pressed={groupId === g.id} onClick={() => onGroup(g.id)}>
              {g.icon} {t(g.name)}
            </button>
          ))}
        </div>
        {posts === null ? (
          <p className="muted">{t("Loading…")}</p>
        ) : posts.length ? (
          <div className="group">{posts.map((p) => <PostItem key={p.id} p={p} groups={groups} />)}</div>
        ) : (
          <Empty icon={<MessagesSquare size={44} />} title={t("No posts here yet")} text={t("Be the first to start a conversation.")} />
        )}
      </div>
      <div className="stack">
        <div className="card row" style={{ gap: 14 }}>
          <Ring value={lvl.progress} size={64} label={lvl.level.emoji} />
          <div className="stack-sm" style={{ gap: 2 }}>
            <strong>
              {t(lvl.level.name)} · <span className="num">{profile!.points}</span>
            </strong>
            <span className="tiny muted">{lvl.next ? `${lvl.next.min - profile!.points} ${t("points to")} ${t(lvl.next.name)}` : t("Highest level reached")}</span>
          </div>
        </div>
        <Side title={t("Top helpers")}>
          {helpers.slice(0, 5).map((a, i) => (
            <div key={a.id} className="cell">
              <span className="num muted" style={{ width: 16 }}>{i + 1}</span>
              <AuthorAvatar a={a} size="sm" />
              <span className="label small">
                <strong>{a.display_name}</strong> {a.verified && <BadgeCheck size={13} className="verified" />}
              </span>
              <span className="num small muted">{a.points}</span>
            </div>
          ))}
        </Side>
        {events.length > 0 && (
          <Side title={t("Coming up")}>
            {events.slice(0, 3).map((e) => (
              <div key={e.id} className="cell">
                <CalendarDays size={18} color="var(--purple)" />
                <span className="label small">
                  <strong>{e.title}</strong>
                  <span className="tiny muted" style={{ display: "block" }}>
                    {date(e.starts_at, { weekday: "short", day: "numeric", month: "short" })} · {e.host.display_name}
                  </span>
                </span>
              </div>
            ))}
          </Side>
        )}
      </div>
      {composing && <Composer groups={groups} defaultGroup={groupId || "welcome"} onClose={() => setComposing(false)} />}
    </div>
  );
}

function Side({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="stack-sm" style={{ gap: 6 }}>
      <div className="section-title">{title}</div>
      <div className="group">{children}</div>
    </div>
  );
}

export function Composer(props: { groups: Group[]; defaultGroup: string; kind?: PostKind; onClose: () => void }) {
  const { t } = useI18n();
  const { api } = useCommunity();
  const nav = useNavigate();
  const [groupId, setGroupId] = useState(props.defaultGroup);
  const [kind, setKind] = useState<PostKind>(props.kind ?? "discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const privacy = usePrivacyCheck();

  const post = async () => {
    try {
      const p = await api!.createPost({ group_id: groupId, kind, title: title.trim(), body: body.trim() });
      props.onClose();
      nav(`/community/post/${p.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Modal
      title={kind === "question" ? t("Ask a question") : t("New post")}
      onClose={props.onClose}
      footer={
        <button className="btn primary" disabled={title.trim().length < 5 || !body.trim()} onClick={() => privacy.check(`${title}\n${body}`, post)}>
          {t("Post")}
        </button>
      }
    >
      <div className="stack">
        <Segmented
          full
          value={kind}
          onChange={setKind}
          options={[
            { value: "discussion" as const, label: t("Discussion") },
            { value: "question" as const, label: t("Question for specialists") },
          ]}
        />
        <Field label={t("Group")}>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {props.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.icon} {t(g.name)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Title")}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} autoFocus placeholder={kind === "question" ? t("e.g. How can I help my 5-year-old with loud noises?") : ""} />
        </Field>
        <Field label={t("Details")}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 140 }} placeholder={t("Share the age, what you've tried and what you'd like to know. Please don't include names or photos.")} />
        </Field>
        {error && <p className="error">{error}</p>}
      </div>
      {privacy.dialog}
    </Modal>
  );
}

function GroupsTab({ onOpen }: { onOpen: (g: string) => void }) {
  const { t } = useI18n();
  const { api } = useCommunity();
  const [groups, setGroups] = useState<Group[]>([]);
  useEffect(() => void api!.groups().then(setGroups), [api]);
  return (
    <div className="grid">
      {groups.map((g) => (
        <button key={g.id} className="card link stack-sm" onClick={() => onOpen(g.id)}>
          <span style={{ fontSize: "2.2rem" }}>{g.icon}</span>
          <h3>{t(g.name)}</h3>
          <p className="small muted">{t(g.description)}</p>
        </button>
      ))}
    </div>
  );
}

function AskTab() {
  const { t } = useI18n();
  const { api } = useCommunity();
  const [groups, setGroups] = useState<Group[]>([]);
  const [questions, setQuestions] = useState<Post[]>([]);
  const [experts, setExperts] = useState<Author[]>([]);
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    void api!.groups().then(setGroups);
    void api!.specialists().then(setExperts);
  }, [api]);
  useEffect(() => void api!.posts({ kind: "question" }).then(setQuestions), [api, asking]);
  const open = questions.filter((q) => !q.accepted_reply_id);
  const answered = questions.filter((q) => q.accepted_reply_id);

  return (
    <div className="stack">
      <div className="hero spread" style={{ background: "linear-gradient(135deg, #34c759, #30b0c7)" }}>
        <div className="stack-sm">
          <h2 style={{ fontSize: "1.6rem" }}>{t("Ask a verified specialist")}</h2>
          <p className="muted">{t("Volunteer speech therapists, OTs, behavior analysts, psychologists and teachers answer for free.")}</p>
        </div>
        <button className="btn big" style={{ background: "#fff", color: "#248a3d" }} onClick={() => setAsking(true)}>
          <PenSquare size={18} /> {t("Ask a question")}
        </button>
      </div>
      {experts.length > 0 && (
        <>
          <div className="section-title">{t("Verified specialists")}</div>
          <div className="grid-3">
            {experts.map((a) => (
              <div key={a.id} className="card row" style={{ gap: 12 }}>
                <AuthorAvatar a={a} />
                <div className="stack-sm" style={{ gap: 0, minWidth: 0 }}>
                  <strong className="row" style={{ gap: 4 }}>
                    {a.display_name} <BadgeCheck size={15} className="verified" />
                  </strong>
                  <span className="tiny muted">{a.specialty}</span>
                  <span className="tiny muted">
                    {levelFor(a.points).level.emoji} <span className="num">{a.points}</span> {t("points")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="section-title">
        {t("Waiting for an answer")} ({open.length})
      </div>
      {open.length ? <div className="group">{open.map((p) => <PostItem key={p.id} p={p} groups={groups} />)}</div> : <p className="muted small">{t("Every question has an answer. 🎉")}</p>}
      {answered.length > 0 && (
        <>
          <div className="section-title">{t("Answered")}</div>
          <div className="group">{answered.map((p) => <PostItem key={p.id} p={p} groups={groups} />)}</div>
        </>
      )}
      {asking && <Composer groups={groups} defaultGroup="behavior" kind="question" onClose={() => setAsking(false)} />}
    </div>
  );
}

const KIND_LABEL: Record<TemplateKind, string> = { schedule: "Schedule", checklist: "Checklist", story: "Social story", board: "Talking board" };

function preview(c: TemplateContent): string {
  if ("steps" in c) return c.steps.map((s) => s.emoji).join(" ");
  if ("pages" in c) return c.pages.map((p) => p.emoji).join(" ");
  if ("buttons" in c) return c.buttons.map((b) => b.emoji).join(" ");
  return c.items.slice(0, 3).map((i) => "☑️ " + i).join("  ");
}

function LibraryTab() {
  const { t } = useI18n();
  const { api } = useCommunity();
  const { child } = useChild();
  const [kind, setKind] = useState<TemplateKind | "all">("all");
  const [list, setList] = useState<Template[]>([]);
  const [sharing, setSharing] = useState(false);
  useEffect(() => void api!.templates(kind === "all" ? undefined : kind).then(setList), [api, kind, sharing]);

  const importIt = async (tpl: Template) => {
    if (!child) return tell(t("Add a child first, then import."));
    const c = tpl.content;
    if ("steps" in c) upsert("schedules", { childId: child.id, title: tpl.title, kind: c.scheduleKind, steps: c.steps.map((s) => ({ ...s, id: uid() })) });
    else if ("pages" in c) upsert("stories", { childId: child.id, title: tpl.title, pages: c.pages.map((p) => ({ ...p, id: uid() })) });
    else if ("buttons" in c) upsert("boards", { childId: child.id, title: tpl.title, buttons: c.buttons.map((b) => ({ ...b, id: uid() })) });
    else upsert("checklists", { childId: child.id, title: tpl.title, items: c.items.map((text) => ({ id: uid(), text, done: false })) });
    await api!.recordImport(tpl.id).catch(() => {});
    setList((l) => l.map((x) => (x.id === tpl.id ? { ...x, import_count: x.import_count + 1 } : x)));
    await tell(`${t("Added to")} ${child.firstName}: ${tpl.title}`);
  };

  return (
    <div className="stack">
      <div className="spread">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[{ value: "all" as const, label: t("All") }, ...(Object.keys(KIND_LABEL) as TemplateKind[]).map((k) => ({ value: k, label: t(KIND_LABEL[k]) }))]}
        />
        <button className="btn primary" onClick={() => setSharing(true)}>
          <Plus size={16} /> {t("Share from my app")}
        </button>
      </div>
      <div className="grid">
        {list.map((tpl) => (
          <div key={tpl.id} className="card stack-sm">
            <span className="badge blue" style={{ alignSelf: "flex-start" }}>
              {t(KIND_LABEL[tpl.kind])}
            </span>
            <div style={{ fontSize: "1.5rem", minHeight: 36 }} className="clamp-2">
              {preview(tpl.content)}
            </div>
            <h3>{tpl.title}</h3>
            {tpl.description && <p className="small muted clamp-2">{tpl.description}</p>}
            <span className="tiny muted">
              {tpl.author.display_name} {tpl.author.verified && <BadgeCheck size={12} className="verified" />} · {tpl.import_count} {t("imports")}
            </span>
            <button className="btn tinted" onClick={() => importIt(tpl)}>
              <Download size={16} /> {child ? `${t("Add to")} ${child.firstName}` : t("Add to my app")}
            </button>
          </div>
        ))}
      </div>
      {!list.length && <Empty icon={<Library size={44} />} title={t("Nothing shared yet")} text={t("Share a schedule, story, board or checklist you made.")} />}
      {sharing && <ShareSheet onClose={() => setSharing(false)} />}
    </div>
  );
}

function ShareSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { api } = useCommunity();
  const data = useData();
  const { child } = useChild();
  const privacy = usePrivacyCheck();
  const mine = child
    ? [
        ...data.schedules.filter((x) => x.childId === child.id).map((x) => ({ key: "schedule:" + x.id, kind: "schedule" as const, title: x.title, content: { scheduleKind: x.kind, steps: x.steps.map((s) => ({ emoji: s.emoji, label: s.label, minutes: s.minutes })) } })),
        ...data.stories.filter((x) => x.childId === child.id).map((x) => ({ key: "story:" + x.id, kind: "story" as const, title: x.title, content: { pages: x.pages.map((p) => ({ emoji: p.emoji, text: p.text })) } })),
        ...data.boards.filter((x) => x.childId === child.id).map((x) => ({ key: "board:" + x.id, kind: "board" as const, title: x.title, content: { buttons: x.buttons.map((b) => ({ emoji: b.emoji, label: b.label, color: b.color })) } })),
        ...data.checklists.filter((x) => x.childId === child.id).map((x) => ({ key: "checklist:" + x.id, kind: "checklist" as const, title: x.title, content: { items: x.items.map((i) => i.text) } })),
      ]
    : [];
  const [key, setKey] = useState(mine[0]?.key ?? "");
  const item = mine.find((m) => m.key === key);
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const share = async () => {
    try {
      await api!.shareTemplate({ kind: item!.kind, title: title.trim(), description: description.trim(), content: item!.content as TemplateContent });
      onClose();
      await tell(t("Shared! Thank you for helping other families. (+3 points)"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Modal
      title={t("Share with the community")}
      onClose={onClose}
      footer={
        <button className="btn primary" disabled={!item || title.trim().length < 3} onClick={() => privacy.check(JSON.stringify(item?.content) + title + description, share)}>
          {t("Share")}
        </button>
      }
    >
      {mine.length === 0 ? (
        <p className="muted">{t("Make a schedule, story, talking board or checklist first. Then you can share it here.")}</p>
      ) : (
        <div className="stack">
          <Field label={t("What to share")}>
            <select
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setTitle(mine.find((m) => m.key === e.target.value)?.title ?? "");
              }}
            >
              {mine.map((m) => (
                <option key={m.key} value={m.key}>
                  {t(KIND_LABEL[m.kind])}: {m.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Title")}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
          </Field>
          <Field label={t("Description")} hint={t("who is it for, how to use it")}>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
          </Field>
          <p className="notice info small">{t("Photos are never shared, only the icons and words. Check that no names are included.")}</p>
          {error && <p className="error">{error}</p>}
        </div>
      )}
      {privacy.dialog}
    </Modal>
  );
}

function EventsTab() {
  const { t, date, time } = useI18n();
  const { api, profile } = useCommunity();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [hosting, setHosting] = useState(false);
  const load = () => void api!.events().then(setEvents);
  useEffect(load, [api, hosting]);
  const canHost = profile!.verified || profile!.points >= 200;

  const rsvp = async (e: CommunityEvent) => {
    await api!.rsvp(e.id, !e.going);
    load();
  };

  return (
    <div className="stack">
      <div className="spread">
        <p className="muted">{t("Free online sessions hosted by volunteers. Hosts earn 50 points and volunteer hours.")}</p>
        <button className="btn primary" disabled={!canHost} title={canHost ? "" : t("Available to verified specialists and Guides (200 points)")} onClick={() => setHosting(true)}>
          <Plus size={16} /> {t("Host a session")}
        </button>
      </div>
      {events.length === 0 && <Empty icon={<CalendarDays size={44} />} title={t("No sessions planned yet")} />}
      {events.map((e) => {
        const d = new Date(e.starts_at);
        return (
          <div key={e.id} className="card row" style={{ gap: 18, alignItems: "flex-start", flexWrap: "nowrap" }}>
            <div className="stack-sm" style={{ gap: 0, alignItems: "center", minWidth: 64, padding: "8px 0", borderRadius: 14, background: "var(--danger-soft)" }}>
              <span className="tiny" style={{ color: "var(--danger)", fontWeight: 700, textTransform: "uppercase" }}>
                {d.toLocaleDateString(undefined, { month: "short" })}
              </span>
              <span className="num" style={{ fontSize: "1.8rem", fontWeight: 700, lineHeight: 1 }}>
                {d.getDate()}
              </span>
            </div>
            <div className="stack-sm grow">
              <h3>{e.title}</h3>
              <AuthorLine a={e.host} />
              <p className="small muted">
                {date(e.starts_at, { weekday: "long" })} · {time(e.starts_at)} · {e.duration_minutes} min · <Users size={13} /> {e.rsvp_count} {t("going")}
              </p>
              {e.description && <p className="small">{e.description}</p>}
            </div>
            <div className="stack-sm" style={{ alignItems: "flex-end" }}>
              <button className={"btn " + (e.going ? "tinted" : "primary")} onClick={() => rsvp(e)}>
                {e.going ? <><CheckCircle2 size={16} /> {t("Going")}</> : t("I'll join")}
              </button>
              {e.going && e.link && (
                <button className="btn plain small" onClick={() => openLink(e.link)}>
                  {t("Open link")}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {hosting && <HostSheet onClose={() => setHosting(false)} />}
    </div>
  );
}

function HostSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { api } = useCommunity();
  const [e, setE] = useState({ title: "", description: "", starts_at: "", duration_minutes: 60, link: "" });
  const [error, setError] = useState("");
  const save = async () => {
    try {
      await api!.createEvent({ ...e, starts_at: new Date(e.starts_at).toISOString() });
      onClose();
    } catch (x) {
      setError(x instanceof Error ? x.message : String(x));
    }
  };
  return (
    <Modal title={t("Host a live session")} onClose={onClose} footer={<button className="btn primary" disabled={e.title.length < 5 || !e.starts_at} onClick={save}>{t("Publish")}</button>}>
      <div className="stack">
        <Field label={t("Title")}>
          <input value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} autoFocus />
        </Field>
        <div className="grid-2">
          <Field label={t("Date and time")}>
            <input type="datetime-local" value={e.starts_at} onChange={(x) => setE({ ...e, starts_at: x.target.value })} />
          </Field>
          <Field label={t("Length")}>
            <select value={e.duration_minutes} onChange={(x) => setE({ ...e, duration_minutes: Number(x.target.value) })}>
              {[30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t("Video link")} hint={t("Zoom, Teams or Google Meet (https://…)")}>
          <input value={e.link} onChange={(x) => setE({ ...e, link: x.target.value })} placeholder="https://" />
        </Field>
        <Field label={t("Description")}>
          <textarea value={e.description} onChange={(x) => setE({ ...e, description: x.target.value })} />
        </Field>
        {error && <p className="error">{error}</p>}
      </div>
    </Modal>
  );
}

export function SignOutButton() {
  const { t } = useI18n();
  return (
    <button className="btn danger" onClick={() => void signOutCommunity()}>
      <LogOut size={16} /> {t("Sign out of the community")}
    </button>
  );
}
