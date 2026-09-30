import type { ReactNode } from "react";
import { Activity, BarChart3, BookHeart, BookOpen, Globe, HeartPulse, Home as HomeIcon, LayoutGrid, ListChecks, MessageSquareText, Sparkles, Star, Target, Timer, Users } from "lucide-react";

/** Sidebar sections: [path, label, tile color, icon]. Also used by quick search. */
export const NAV: { title: string; links: [string, string, string, ReactNode][] }[] = [
  {
    title: "",
    links: [
      ["/", "Today", "#007aff", <HomeIcon size={15} />],
      ["/children", "Children", "#ff9500", <Users size={15} />],
    ],
  },
  {
    title: "Track",
    links: [
      ["/goals", "Goals & progress", "#34c759", <Target size={15} />],
      ["/behavior", "Behavior", "#ff3b30", <Activity size={15} />],
      ["/notebook", "Daily notebook", "#ff9f0a", <BookOpen size={15} />],
      ["/health", "Health", "#ff2d55", <HeartPulse size={15} />],
    ],
  },
  {
    title: "Support",
    links: [
      ["/visual", "Visual schedules", "#5856d6", <LayoutGrid size={15} />],
      ["/stories", "Social stories", "#af52de", <BookHeart size={15} />],
      ["/talk", "Talking board", "#30b0c7", <MessageSquareText size={15} />],
      ["/rewards", "Reward charts", "#ffcc00", <Star size={15} />],
      ["/visual/timer", "Visual timer", "#ff453a", <Timer size={15} />],
      ["/calm", "Calm corner", "#64d2ff", <Sparkles size={15} />],
    ],
  },
  {
    title: "Plan",
    links: [
      ["/checklists", "Checklists", "#32d74b", <ListChecks size={15} />],
      ["/reports", "Reports", "#8e8e93", <BarChart3 size={15} />],
    ],
  },
  {
    title: "Together",
    links: [["/community", "Community", "#0a84ff", <Globe size={15} />]],
  },
];
