import type { Country, Role } from "../lib/schema";

export interface Author {
  id: string;
  display_name: string;
  role: Role;
  verified: boolean;
  points: number;
  specialty: string;
}

export interface Profile extends Author {
  country: Country;
  bio: string;
  is_moderator: boolean;
  is_admin: boolean;
  created_at: string;
}

export type ProfileInput = Pick<Profile, "display_name" | "role" | "country" | "bio" | "specialty">;

export interface Group {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export type PostKind = "discussion" | "question";

export interface Post {
  id: string;
  author: Author;
  group_id: string;
  kind: PostKind;
  title: string;
  body: string;
  accepted_reply_id: string | null;
  reply_count: number;
  created_at: string;
}

export interface Reply {
  id: string;
  post_id: string;
  author: Author;
  body: string;
  helpful_count: number;
  voted: boolean;
  created_at: string;
}

export type TemplateKind = "schedule" | "checklist" | "story" | "board";

export interface Template {
  id: string;
  author: Author;
  kind: TemplateKind;
  title: string;
  description: string;
  content: TemplateContent;
  import_count: number;
  created_at: string;
}

export type TemplateContent =
  | { steps: { emoji: string; label: string; minutes: number | null }[]; scheduleKind: "schedule" | "firstThen" | "routine" }
  | { items: string[] }
  | { pages: { emoji: string; text: string }[] }
  | { buttons: { emoji: string; label: string; color: string }[] };

export interface CommunityEvent {
  id: string;
  host: Author;
  title: string;
  description: string;
  starts_at: string;
  duration_minutes: number;
  link: string;
  completed: boolean;
  going: boolean;
  rsvp_count: number;
}

export interface Stats {
  points: number;
  level: string;
  answers: number;
  accepted: number;
  helpful: number;
  posts: number;
  templates: number;
  sessions: number;
  hours: number;
}

export interface Certificate extends Omit<Stats, "level"> {
  id: string;
  code: string;
  display_name: string;
  role: Role;
  specialty: string;
  verified: boolean;
  level: string;
  issued_at: string;
}

export interface LedgerEntry {
  amount: number;
  reason: string;
  created_at: string;
}

export interface ReportItem {
  id: string;
  reason: string;
  created_at: string;
  excerpt: string;
}

export interface VerificationItem {
  id: string;
  profession: string;
  license_number: string;
  issuing_body: string;
  evidence_url: string;
  created_at: string;
  display_name: string;
}

export interface PostQuery {
  groupId?: string;
  kind?: PostKind;
  search?: string;
}

export interface CommunityApi {
  readonly mode: "live" | "preview";
  getSession(): Promise<{ userId: string; email: string } | null>;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  me(): Promise<Profile | null>;
  saveProfile(p: ProfileInput): Promise<Profile>;
  groups(): Promise<Group[]>;
  posts(q: PostQuery): Promise<Post[]>;
  thread(id: string): Promise<{ post: Post; replies: Reply[] }>;
  createPost(p: { group_id: string; kind: PostKind; title: string; body: string }): Promise<Post>;
  reply(postId: string, body: string): Promise<void>;
  setHelpful(replyId: string, on: boolean): Promise<void>;
  acceptAnswer(postId: string, replyId: string): Promise<void>;
  report(target: { postId?: string; replyId?: string }, reason: string): Promise<void>;
  deletePost(id: string): Promise<void>;
  leaderboard(): Promise<Author[]>;
  specialists(): Promise<Author[]>;
  stats(): Promise<Stats>;
  ledger(): Promise<LedgerEntry[]>;
  templates(kind?: TemplateKind): Promise<Template[]>;
  shareTemplate(t: { kind: TemplateKind; title: string; description: string; content: TemplateContent }): Promise<void>;
  recordImport(id: string): Promise<void>;
  events(): Promise<CommunityEvent[]>;
  createEvent(e: { title: string; description: string; starts_at: string; duration_minutes: number; link: string }): Promise<void>;
  rsvp(id: string, going: boolean): Promise<void>;
  certificates(): Promise<Certificate[]>;
  issueCertificate(): Promise<Certificate>;
  requestVerification(r: { profession: string; license_number: string; issuing_body: string; evidence_url: string }): Promise<void>;
  reports(): Promise<ReportItem[]>;
  resolveReport(id: string, hide: boolean): Promise<void>;
  verificationRequests(): Promise<VerificationItem[]>;
  reviewVerification(id: string, approve: boolean): Promise<void>;
  completeEvent(id: string): Promise<void>;
}
