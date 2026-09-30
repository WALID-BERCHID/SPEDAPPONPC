// The data model. Every record carries id/createdAt/updatedAt so that share files
// from another computer can be merged record by record (newest wins).

export type Country = "US" | "CA" | "UK" | "AU" | "OTHER";
export type Role = "parent" | "teacher" | "specialist";
export type Theme = "system" | "light" | "dark" | "contrast";

export interface Base {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  name: string;
  relation: string;
  phone: string;
}

export interface Child extends Base {
  firstName: string;
  lastName: string;
  birthDate: string;
  photoId?: string;
  color: string;
  pronouns: string;
  school: string;
  diagnoses: string;
  strengths: string;
  interests: string;
  likes: string;
  dislikes: string;
  communication: string;
  sensory: string;
  triggers: string;
  calming: string;
  medical: string;
  allergies: string;
  medications: string;
  contacts: Contact[];
  notes: string;
}

export type GoalArea = "communication" | "social" | "academic" | "behavior" | "selfCare" | "motor" | "sensory" | "other";
export type Measure = "percent" | "count" | "duration" | "rating";
export type GoalStatus = "active" | "met" | "paused";
export type Prompt = "independent" | "gestural" | "verbal" | "model" | "partial" | "full";

export interface Goal extends Base {
  childId: string;
  title: string;
  area: GoalArea;
  plan: string;
  description: string;
  measure: Measure;
  /** For count/duration: is a lower number better (e.g. fewer hits, shorter tantrums)? */
  lowerIsBetter: boolean;
  baseline: number | null;
  target: number;
  targetDate: string;
  status: GoalStatus;
}

export interface DataPoint extends Base {
  goalId: string;
  childId: string;
  date: string;
  /** percent 0–100, a count, minutes, or a 1–5 rating depending on the goal. */
  value: number;
  correct?: number;
  total?: number;
  prompt?: Prompt;
  note: string;
}

export type Setting = "home" | "school" | "community" | "therapy" | "other";
export type BehaviorFunction = "attention" | "escape" | "tangible" | "sensory" | "unknown";

export interface BehaviorEvent extends Base {
  childId: string;
  at: string;
  behavior: string;
  antecedent: string;
  consequence: string;
  intensity: number;
  minutes: number | null;
  setting: Setting;
  fn: BehaviorFunction;
  notes: string;
}

export type Portion = "" | "all" | "some" | "none";

export interface DailyLog extends Base {
  childId: string;
  date: string;
  setting: "home" | "school";
  author: string;
  mood: number;
  sleepHours: number | null;
  meals: { breakfast: Portion; lunch: Portion; dinner: Portion };
  toileting: string;
  medsGiven: string;
  activities: string;
  highlights: string;
  concerns: string;
  message: string;
}

export type ScheduleKind = "schedule" | "firstThen" | "routine";

export interface Step {
  id: string;
  label: string;
  emoji: string;
  imageId?: string;
  minutes: number | null;
}

export interface VisualSchedule extends Base {
  childId: string;
  title: string;
  kind: ScheduleKind;
  steps: Step[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Checklist extends Base {
  childId: string;
  title: string;
  items: ChecklistItem[];
}

export interface StoryPage {
  id: string;
  text: string;
  emoji: string;
  imageId?: string;
}

export interface Story extends Base {
  childId: string;
  title: string;
  pages: StoryPage[];
}

export interface BoardButton {
  id: string;
  label: string;
  emoji: string;
  imageId?: string;
  color: string;
}

export interface TalkBoard extends Base {
  childId: string;
  title: string;
  buttons: BoardButton[];
}

export interface RewardChart extends Base {
  childId: string;
  title: string;
  goal: number;
  earned: number;
  token: string;
  reward: string;
  rewardEmoji: string;
  completedCount: number;
}

export type HealthType = "medication" | "seizure" | "sleep" | "illness" | "appointment" | "other";

export interface HealthEvent extends Base {
  childId: string;
  type: HealthType;
  at: string;
  title: string;
  details: string;
  minutes: number | null;
}

export interface Feeling extends Base {
  childId: string;
  at: string;
  feeling: string;
}

export interface Settings {
  country: Country;
  theme: Theme;
  textScale: number;
  readableFont: boolean;
  reduceMotion: boolean;
  autoLockMinutes: number;
}

export interface Profile {
  name: string;
  role: Role;
}

export interface VaultData {
  schemaVersion: 1;
  profile: Profile;
  settings: Settings;
  children: Child[];
  goals: Goal[];
  dataPoints: DataPoint[];
  behaviors: BehaviorEvent[];
  dailyLogs: DailyLog[];
  schedules: VisualSchedule[];
  checklists: Checklist[];
  stories: Story[];
  boards: TalkBoard[];
  rewardCharts: RewardChart[];
  health: HealthEvent[];
  feelings: Feeling[];
  /** Resized photos as data URLs, keyed by id. */
  images: Record<string, string>;
}

export const COLLECTIONS = ["children", "goals", "dataPoints", "behaviors", "dailyLogs", "schedules", "checklists", "stories", "boards", "rewardCharts", "health", "feelings"] as const;
export type Collection = (typeof COLLECTIONS)[number];

export type RecordOf<K extends Collection> = VaultData[K][number];

export const defaultSettings = (country: Country): Settings => ({
  country,
  theme: "system",
  textScale: 1,
  readableFont: false,
  reduceMotion: false,
  autoLockMinutes: 15,
});

export function emptyVault(profile: Profile, country: Country): VaultData {
  return {
    schemaVersion: 1,
    profile,
    settings: defaultSettings(country),
    children: [],
    goals: [],
    dataPoints: [],
    behaviors: [],
    dailyLogs: [],
    schedules: [],
    checklists: [],
    stories: [],
    boards: [],
    rewardCharts: [],
    health: [],
    feelings: [],
    images: {},
  };
}

export const PLAN_TYPES: Record<Country, string[]> = {
  US: ["IEP", "504 plan", "IFSP", "Home goal", "Therapy goal"],
  CA: ["IEP", "Plan d'intervention", "Home goal", "Therapy goal"],
  UK: ["EHCP", "IEP", "IDP", "SEN support plan", "Home goal", "Therapy goal"],
  AU: ["NDIS plan", "ILP / IEP", "Home goal", "Therapy goal"],
  OTHER: ["IEP", "Home goal", "Therapy goal"],
};

export const EMERGENCY: Record<Country, string> = { US: "911", CA: "911", UK: "999", AU: "000", OTHER: "" };

export const LOCALE: Record<Country, string> = { US: "en-US", CA: "en-CA", UK: "en-GB", AU: "en-AU", OTHER: "en-GB" };
