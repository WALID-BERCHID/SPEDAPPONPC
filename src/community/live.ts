import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Author, Certificate, CommunityApi, CommunityEvent, Post, PostQuery, Profile, ProfileInput, Reply, Stats, Template, TemplateKind } from "./types";

const AUTHOR = "id, display_name, role, verified, points, specialty";

type Result<T> = { data: T | null; error: { message: string } | null };

function ok<T>(r: Result<T>): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

/** Talks to the community server (Supabase). All permissions are enforced by the database. */
export class LiveCommunity implements CommunityApi {
  readonly mode = "live" as const;
  private sb: SupabaseClient;

  constructor(url: string, key: string) {
    this.sb = createClient(url, key, { auth: { persistSession: true, storageKey: "hih.community", detectSessionInUrl: false } });
  }

  private async uid(): Promise<string> {
    const { data } = await this.sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error("Please sign in to the community first.");
    return id;
  }

  async getSession() {
    const { data } = await this.sb.auth.getSession();
    const u = data.session?.user;
    return u ? { userId: u.id, email: u.email ?? "" } : null;
  }

  async sendCode(email: string) {
    ok(await this.sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }));
  }

  async verifyCode(email: string, code: string) {
    ok(await this.sb.auth.verifyOtp({ email, token: code.trim(), type: "email" }));
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async me(): Promise<Profile | null> {
    const s = await this.getSession();
    if (!s) return null;
    return ok(await this.sb.from("profiles").select("*").eq("id", s.userId).maybeSingle()) as Profile | null;
  }

  async saveProfile(p: ProfileInput): Promise<Profile> {
    const id = await this.uid();
    const exists = await this.me();
    if (exists) ok(await this.sb.from("profiles").update(p).eq("id", id));
    else ok(await this.sb.from("profiles").insert({ id, ...p }));
    return (await this.me())!;
  }

  async groups() {
    return ok(await this.sb.from("groups").select("id, name, description, icon").order("sort"));
  }

  async posts(q: PostQuery): Promise<Post[]> {
    let query = this.sb.from("posts").select(`*, author:profiles(${AUTHOR})`).order("created_at", { ascending: false }).limit(60);
    if (q.groupId) query = query.eq("group_id", q.groupId);
    if (q.kind) query = query.eq("kind", q.kind);
    const term = q.search?.replace(/[%_,()*]/g, " ").trim();
    if (term) query = query.ilike("title", `%${term}%`);
    return ok(await query) as Post[];
  }

  async thread(id: string) {
    const post = ok(await this.sb.from("posts").select(`*, author:profiles(${AUTHOR})`).eq("id", id).single()) as Post;
    const replies = ok(await this.sb.from("replies").select(`*, author:profiles(${AUTHOR})`).eq("post_id", id).order("created_at")) as Reply[];
    const s = await this.getSession();
    const mine = s && replies.length ? (ok(await this.sb.from("helpful_votes").select("reply_id").eq("voter_id", s.userId).in("reply_id", replies.map((r) => r.id))) as { reply_id: string }[]) : [];
    const voted = new Set(mine.map((v) => v.reply_id));
    return { post, replies: replies.map((r) => ({ ...r, voted: voted.has(r.id) })) };
  }

  async createPost(p: { group_id: string; kind: Post["kind"]; title: string; body: string }) {
    return ok(await this.sb.from("posts").insert(p).select(`*, author:profiles(${AUTHOR})`).single()) as Post;
  }

  async reply(postId: string, body: string) {
    ok(await this.sb.from("replies").insert({ post_id: postId, body }));
  }

  async setHelpful(replyId: string, on: boolean) {
    const uid = await this.uid();
    if (on) ok(await this.sb.from("helpful_votes").insert({ reply_id: replyId }));
    else ok(await this.sb.from("helpful_votes").delete().eq("reply_id", replyId).eq("voter_id", uid));
  }

  async acceptAnswer(postId: string, replyId: string) {
    ok(await this.sb.rpc("accept_answer", { p_post: postId, p_reply: replyId }));
  }

  async report(target: { postId?: string; replyId?: string }, reason: string) {
    ok(await this.sb.from("reports").insert({ post_id: target.postId ?? null, reply_id: target.replyId ?? null, reason }));
  }

  async deletePost(id: string) {
    ok(await this.sb.from("posts").delete().eq("id", id));
  }

  async leaderboard() {
    return ok(await this.sb.from("profiles").select(AUTHOR).order("points", { ascending: false }).limit(10)) as Author[];
  }

  async specialists() {
    return ok(await this.sb.from("profiles").select(AUTHOR).eq("verified", true).order("points", { ascending: false }).limit(12)) as Author[];
  }

  async stats(): Promise<Stats> {
    const rows = ok(await this.sb.rpc("my_stats")) as Stats[];
    const s = rows[0];
    return { ...s, hours: Number(s?.hours ?? 0) };
  }

  async ledger() {
    return ok(await this.sb.from("points_ledger").select("amount, reason, created_at").order("created_at", { ascending: false }).limit(40));
  }

  async templates(kind?: TemplateKind) {
    let q = this.sb.from("templates").select(`*, author:profiles(${AUTHOR})`).order("import_count", { ascending: false }).limit(60);
    if (kind) q = q.eq("kind", kind);
    return ok(await q) as Template[];
  }

  async shareTemplate(t: Pick<Template, "kind" | "title" | "description" | "content">) {
    ok(await this.sb.from("templates").insert(t));
  }

  async recordImport(id: string) {
    ok(await this.sb.rpc("record_template_import", { p_template: id }));
  }

  async events(): Promise<CommunityEvent[]> {
    const since = new Date(Date.now() - 86400000).toISOString();
    const rows = ok(await this.sb.from("events").select(`*, host:profiles(${AUTHOR}), event_rsvps(count)`).gte("starts_at", since).order("starts_at")) as (CommunityEvent & { event_rsvps: { count: number }[] })[];
    const s = await this.getSession();
    const mine = s ? (ok(await this.sb.from("event_rsvps").select("event_id").eq("user_id", s.userId)) as { event_id: string }[]) : [];
    const going = new Set(mine.map((m) => m.event_id));
    return rows.map((e) => ({ ...e, rsvp_count: e.event_rsvps?.[0]?.count ?? 0, going: going.has(e.id) }));
  }

  async createEvent(e: Pick<CommunityEvent, "title" | "description" | "starts_at" | "duration_minutes" | "link">) {
    ok(await this.sb.from("events").insert(e));
  }

  async rsvp(id: string, going: boolean) {
    const uid = await this.uid();
    if (going) ok(await this.sb.from("event_rsvps").insert({ event_id: id }));
    else ok(await this.sb.from("event_rsvps").delete().eq("event_id", id).eq("user_id", uid));
  }

  async certificates() {
    return ok(await this.sb.from("certificates").select("*").order("issued_at", { ascending: false })) as Certificate[];
  }

  async issueCertificate() {
    return ok(await this.sb.rpc("issue_certificate")) as Certificate;
  }

  async requestVerification(r: { profession: string; license_number: string; issuing_body: string; evidence_url: string }) {
    ok(await this.sb.from("verification_requests").insert(r));
  }

  async reports() {
    const rows = ok(await this.sb.from("reports").select("id, reason, created_at, post:posts(title), reply:replies(body)").eq("resolved", false).order("created_at")) as unknown as {
      id: string;
      reason: string;
      created_at: string;
      post: { title: string } | null;
      reply: { body: string } | null;
    }[];
    return rows.map((r) => ({ id: r.id, reason: r.reason, created_at: r.created_at, excerpt: r.post?.title ?? r.reply?.body ?? "" }));
  }

  async resolveReport(id: string, hide: boolean) {
    ok(await this.sb.rpc("resolve_report", { p_report: id, p_hide: hide }));
  }

  async verificationRequests() {
    const rows = ok(await this.sb.from("verification_requests").select("*, user:profiles(display_name)").eq("status", "pending").order("created_at")) as unknown as (Omit<
      import("./types").VerificationItem,
      "display_name"
    > & { user: { display_name: string } })[];
    return rows.map((r) => ({ ...r, display_name: r.user?.display_name ?? "" }));
  }

  async reviewVerification(id: string, approve: boolean) {
    ok(await this.sb.rpc("review_verification", { p_request: id, p_approve: approve }));
  }

  async completeEvent(id: string) {
    ok(await this.sb.rpc("complete_event", { p_event: id }));
  }
}
