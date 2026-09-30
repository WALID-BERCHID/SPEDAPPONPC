// Preview mode: a local, in-memory community with sample posts so people can
// explore how it works before the real server is connected. Nothing is sent or saved.
import type { Author, Certificate, CommunityApi, CommunityEvent, Group, LedgerEntry, Post, PostQuery, Profile, ProfileInput, Reply, Stats, Template, TemplateKind } from "./types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const inDays = (d: number, hour = 19) => {
  const x = new Date(Date.now() + d * 86400000);
  x.setHours(hour, 0, 0, 0);
  return x.toISOString();
};
const id = () => crypto.randomUUID();

const people: Record<string, Author> = {
  maya: { id: "maya", display_name: "Dr. Maya Patel", role: "specialist", verified: true, points: 1240, specialty: "Speech-language pathologist" },
  tom: { id: "tom", display_name: "Tom Reid", role: "specialist", verified: true, points: 610, specialty: "Occupational therapist" },
  priya: { id: "priya", display_name: "Priya S.", role: "specialist", verified: true, points: 455, specialty: "Board Certified Behavior Analyst" },
  jess: { id: "jess", display_name: "Jess (mom of 2)", role: "parent", verified: false, points: 330, specialty: "" },
  alvarez: { id: "alvarez", display_name: "Ms. Alvarez", role: "teacher", verified: false, points: 280, specialty: "" },
  liam: { id: "liam", display_name: "Liam", role: "parent", verified: false, points: 95, specialty: "" },
  noor: { id: "noor", display_name: "Noor", role: "parent", verified: false, points: 40, specialty: "" },
};

const GROUPS: Group[] = [
  ["welcome", "Welcome & introductions", "New here? Say hello.", "👋"],
  ["new-diagnosis", "Just diagnosed", "First steps, feelings and questions after a diagnosis.", "🌱"],
  ["school", "School, IEPs & EHCPs", "Plans, meetings, rights and working with school.", "🏫"],
  ["behavior", "Behavior & meltdowns", "What works, what doesn't, and support on hard days.", "🌊"],
  ["communication", "Speech & communication", "Speech, AAC, signing and picture systems.", "💬"],
  ["sensory", "Sensory & regulation", "Noise, textures, movement and calming ideas.", "🎧"],
  ["daily-life", "Sleep, food & daily life", "Routines, eating, toileting, sleep and outings.", "🏡"],
  ["teachers", "Teachers' lounge", "Classroom strategies and resources for educators.", "🍎"],
  ["teens", "Teens & transition", "Growing up, independence and life after school.", "🎓"],
  ["self-care", "Caring for yourself", "Parents and carers matter too.", "💛"],
].map(([gid, name, description, icon]) => ({ id: gid, name, description, icon }));

export class PreviewCommunity implements CommunityApi {
  readonly mode = "preview" as const;
  private profile: Profile | null = null;
  private posts_: Post[] = [];
  private replies_: Reply[] = [];
  private templates_: Template[] = [];
  private events_: CommunityEvent[] = [];
  private ledger_: LedgerEntry[] = [];
  private certs: Certificate[] = [];

  constructor(name = "You") {
    this.profile = { id: "me", display_name: name, role: "parent", verified: false, points: 120, specialty: "", country: "US", bio: "", is_moderator: false, is_admin: false, created_at: hoursAgo(500) };
    this.ledger_ = [
      { amount: 15, reason: "accepted_answer", created_at: hoursAgo(30) },
      { amount: 2, reason: "helpful_vote", created_at: hoursAgo(20) },
      { amount: 3, reason: "template_shared", created_at: hoursAgo(80) },
    ];
    const post = (author: Author, group_id: string, kind: Post["kind"], title: string, body: string, h: number, replies: [Author, string, number][], accepted = -1) => {
      const p: Post = { id: id(), author, group_id, kind, title, body, accepted_reply_id: null, reply_count: replies.length, created_at: hoursAgo(h) };
      replies.forEach(([a, text, helpful], i) => {
        const r: Reply = { id: id(), post_id: p.id, author: a, body: text, helpful_count: helpful, voted: false, created_at: hoursAgo(h - i - 1) };
        this.replies_.push(r);
        if (i === accepted) p.accepted_reply_id = r.id;
      });
      this.posts_.push(p);
    };
    const { maya, tom, priya, jess, alvarez, liam, noor } = people;
    post(liam, "behavior", "question", "Meltdowns every time we leave the park — any ideas?", "My 6-year-old loves the park but leaving is a daily battle. We've tried warnings. What else works?", 3, [
      [priya, "Try a visual timer plus a \"first park, then snack\" board, and give the 2-minute warning while showing the timer. Keep the transition item ready (a snack or toy for the car). Praise the leaving, not just the playing.", 14],
      [jess, "A \"goodbye slide\" helped us — one last slide is part of the routine, then we go. Predictable endings!", 6],
    ], 0);
    post(noor, "new-diagnosis", "discussion", "We got the autism diagnosis today", "Feeling a mix of relief and worry. Where did you all start?", 7, [
      [jess, "Welcome. Relief and worry are both normal. Start small: one routine at a time, and find your people (you just did 💛).", 9],
      [maya, "Congratulations on getting answers. Ask your team for a written plan with 2–3 first goals, and ask about speech and OT evaluations if they haven't been offered.", 11],
    ]);
    post(alvarez, "teachers", "discussion", "Calm corner setup that actually gets used", "Sharing what worked in my K-2 class: a small tent, headphones, a feelings chart and a 3-minute sand timer. Students choose it themselves now.", 20, [
      [tom, "Lovely. Add a heavy lap pad or a wall push-up sign — proprioceptive input helps many kids reset faster.", 8],
    ]);
    post(jess, "school", "question", "How do I prepare for our first EHCP review?", "It's our first annual review in the UK. What should I bring?", 30, [
      [alvarez, "Bring a one-page summary of what's changed at home, your top 3 concerns, and ask how each outcome was measured. The \"Before an IEP / plan meeting\" checklist in the app is great for this.", 12],
    ]);
    post(maya, "communication", "discussion", "Q&A: starting with picture communication", "I'm hosting a free live Q&A next week about starting AAC at home. Drop your questions here!", 44, [[liam, "Can we use AAC and still work on speech?", 3]]);

    const tpl = (author: Author, kind: TemplateKind, title: string, description: string, content: Template["content"], imports: number) =>
      this.templates_.push({ id: id(), author, kind, title, description, content, import_count: imports, created_at: hoursAgo(imports * 3) });
    tpl(alvarez, "schedule", "School day (K-2)", "Arrival to home time, with icons that match most classrooms.", { scheduleKind: "schedule", steps: [["🏫", "Arrive"], ["👋", "Circle time"], ["📝", "Work time"], ["🍎", "Snack"], ["🛝", "Recess"], ["🥪", "Lunch"], ["🎨", "Art"], ["🏠", "Home"]].map(([emoji, label]) => ({ emoji, label, minutes: null })) }, 132);
    tpl(maya, "board", "First 12 core words", "A starter board with the most useful core words.", { buttons: [["🤲", "want"], ["➕", "more"], ["✋", "stop"], ["🆘", "help"], ["👍", "yes"], ["👎", "no"], ["🧸", "play"], ["✅", "all done"], ["🏃", "go"], ["❤️", "like"], ["🍽️", "eat"], ["🥤", "drink"]].map(([emoji, label]) => ({ emoji, label, color: "#a5d8ff" })) }, 98);
    tpl(tom, "story", "Loud hand dryers", "For kids who fear public bathrooms.", { pages: [["🚻", "Some bathrooms have hand dryers."], ["🙉", "Hand dryers can be loud. I can cover my ears."], ["🧻", "I can use a paper towel instead."], ["😊", "I did it!"]].map(([emoji, text]) => ({ emoji, text })) }, 57);
    tpl(jess, "checklist", "Summer holiday packing", "Everything for a sensory-friendly trip.", { items: ["Ear defenders", "Favorite snacks", "Tablet + charger", "Comfort toy", "Visual schedule for travel day", "Sunglasses and cap"] }, 41);

    const ev = (host: Author, title: string, description: string, days: number, rsvps: number) =>
      this.events_.push({ id: id(), host, title, description, starts_at: inDays(days), duration_minutes: 60, link: "https://meet.example.org/hih", completed: false, going: false, rsvp_count: rsvps });
    ev(maya, "Starting picture communication at home", "Free live Q&A for parents. Bring your questions!", 5, 48);
    ev(priya, "Understanding meltdowns vs. tantrums", "What's different, and what helps in the moment.", 9, 63);
    ev(tom, "Sensory diets for busy families", "Simple movement breaks that fit into a school day.", 14, 21);
  }

  async getSession() {
    return { userId: "me", email: "preview@example.org" };
  }
  async sendCode() {}
  async verifyCode() {}
  async signOut() {}
  async me() {
    return this.profile;
  }
  async saveProfile(p: ProfileInput) {
    this.profile = { ...this.profile!, ...p };
    return this.profile;
  }
  async groups() {
    return GROUPS;
  }
  async posts(q: PostQuery) {
    const s = q.search?.toLowerCase();
    return this.posts_
      .filter((p) => (!q.groupId || p.group_id === q.groupId) && (!q.kind || p.kind === q.kind) && (!s || p.title.toLowerCase().includes(s)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async thread(pid: string) {
    return { post: this.posts_.find((p) => p.id === pid)!, replies: this.replies_.filter((r) => r.post_id === pid) };
  }
  private award(amount: number, reason: string) {
    this.profile!.points += amount;
    this.ledger_.unshift({ amount, reason, created_at: new Date().toISOString() });
  }
  async createPost(p: { group_id: string; kind: Post["kind"]; title: string; body: string }) {
    const post: Post = { id: id(), author: this.profile!, accepted_reply_id: null, reply_count: 0, created_at: new Date().toISOString(), ...p };
    this.posts_.push(post);
    return post;
  }
  async reply(postId: string, body: string) {
    this.replies_.push({ id: id(), post_id: postId, author: this.profile!, body, helpful_count: 0, voted: false, created_at: new Date().toISOString() });
    const p = this.posts_.find((x) => x.id === postId)!;
    p.reply_count++;
    if (p.author.id !== "me") this.award(1, "reply");
  }
  async setHelpful(replyId: string, on: boolean) {
    const r = this.replies_.find((x) => x.id === replyId)!;
    if (r.author.id === "me") throw new Error("You cannot vote for your own reply");
    r.voted = on;
    r.helpful_count += on ? 1 : -1;
  }
  async acceptAnswer(postId: string, replyId: string) {
    this.posts_.find((x) => x.id === postId)!.accepted_reply_id = replyId;
  }
  async report() {}
  async deletePost(pid: string) {
    this.posts_ = this.posts_.filter((p) => p.id !== pid);
  }
  async leaderboard() {
    return [...Object.values(people), this.profile!].sort((a, b) => b.points - a.points).slice(0, 10);
  }
  async specialists() {
    return Object.values(people).filter((p) => p.verified);
  }
  async stats(): Promise<Stats> {
    const mine = this.replies_.filter((r) => r.author.id === "me");
    const points = this.profile!.points;
    return {
      points,
      level: "",
      answers: mine.length + 4,
      accepted: 1,
      helpful: mine.reduce((s, r) => s + r.helpful_count, 0) + 7,
      posts: this.posts_.filter((p) => p.author.id === "me").length + 2,
      templates: 1 + this.templates_.filter((t) => t.author.id === "me").length,
      sessions: 0,
      hours: 0,
    };
  }
  async ledger() {
    return this.ledger_;
  }
  async templates(kind?: TemplateKind) {
    return this.templates_.filter((t) => !kind || t.kind === kind).sort((a, b) => b.import_count - a.import_count);
  }
  async shareTemplate(t: Pick<Template, "kind" | "title" | "description" | "content">) {
    this.templates_.push({ id: id(), author: this.profile!, import_count: 0, created_at: new Date().toISOString(), ...t });
    this.award(3, "template_shared");
  }
  async recordImport(tid: string) {
    this.templates_.find((t) => t.id === tid)!.import_count++;
  }
  async events() {
    return this.events_;
  }
  async createEvent(e: Pick<CommunityEvent, "title" | "description" | "starts_at" | "duration_minutes" | "link">) {
    this.events_.push({ id: id(), host: this.profile!, completed: false, going: true, rsvp_count: 1, ...e });
  }
  async rsvp(eid: string, going: boolean) {
    const e = this.events_.find((x) => x.id === eid)!;
    e.going = going;
    e.rsvp_count += going ? 1 : -1;
  }
  async certificates() {
    return this.certs;
  }
  async issueCertificate() {
    const s = await this.stats();
    if (s.points < 50) throw new Error("Certificates start at the Helper level (50 points)");
    const p = this.profile!;
    const c: Certificate = { ...s, id: id(), code: "PREVIEW" + Math.floor(Math.random() * 900 + 100), display_name: p.display_name, role: p.role, specialty: p.specialty, verified: p.verified, level: "", issued_at: new Date().toISOString() };
    this.certs.unshift(c);
    return c;
  }
  async requestVerification() {}
  async reports() {
    return [];
  }
  async resolveReport() {}
  async verificationRequests() {
    return [];
  }
  async reviewVerification() {}
  async completeEvent() {}
}
