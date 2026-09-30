import type { Stats } from "./types";

export const LEVELS = [
  { name: "Seed", min: 0, emoji: "🌱", unlocks: "Post, reply and share templates" },
  { name: "Helper", min: 50, emoji: "🤝", unlocks: "Contribution certificates" },
  { name: "Guide", min: 200, emoji: "🧭", unlocks: "Host live sessions" },
  { name: "Mentor", min: 500, emoji: "🌟", unlocks: "Mentor badge and featured profile" },
  { name: "Pillar", min: 1000, emoji: "🏛️", unlocks: "Hall of fame and moderator invitation" },
] as const;

export function levelFor(points: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1].min) i++;
  const level = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  const progress = next ? (points - level.min) / (next.min - level.min) : 1;
  return { level, next, progress, index: i };
}

export const POINT_RULES: [string, string][] = [
  ["Your answer is marked as the most helpful", "+15"],
  ["Each \"helpful\" vote on your reply", "+2"],
  ["A verified specialist answers a question", "+5"],
  ["Replying to someone", "+1"],
  ["Sharing a template", "+3"],
  ["Every 10 people who import your template", "+5"],
  ["Hosting a live session (confirmed)", "+50"],
  ["Moderating a report", "+3"],
];

export const REASONS: Record<string, string> = {
  accepted_answer: "Answer marked most helpful",
  helpful_vote: "Helpful vote",
  helpful_vote_removed: "Helpful vote removed",
  specialist_answer: "Specialist answer",
  reply: "Reply",
  template_shared: "Template shared",
  template_imports: "10 template imports",
  session_hosted: "Live session hosted",
  moderation: "Moderation",
  admin: "Bonus from the team",
};

export interface BadgeDef {
  emoji: string;
  name: string;
  how: string;
  earned: (s: Stats, verified: boolean) => boolean;
}

export const BADGES: BadgeDef[] = [
  { emoji: "📝", name: "First words", how: "Write your first post", earned: (s) => s.posts >= 1 },
  { emoji: "🤝", name: "Helping hand", how: "Reply to someone", earned: (s) => s.answers >= 1 },
  { emoji: "🛟", name: "Lifesaver", how: "Have an answer marked most helpful", earned: (s) => s.accepted >= 1 },
  { emoji: "💖", name: "Crowd favorite", how: "Get 10 helpful votes", earned: (s) => s.helpful >= 10 },
  { emoji: "🧩", name: "Template maker", how: "Share a template", earned: (s) => s.templates >= 1 },
  { emoji: "🎤", name: "Session host", how: "Host a live session", earned: (s) => s.sessions >= 1 },
  { emoji: "✅", name: "Verified specialist", how: "Get your credentials verified", earned: (_, v) => v },
  { emoji: "🏛️", name: "Pillar", how: "Reach 1,000 points", earned: (s) => s.points >= 1000 },
];
