import { Award, BadgeCheck, Heart, Library, MessagesSquare, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { DONATE_URL } from "../lib/app";
import { useI18n } from "../lib/i18n";
import { Page } from "../components/ui";
import { openLink } from "./Settings";

export function CommunityPage() {
  const { t } = useI18n();
  const item = (icon: ReactNode, title: string, text: string) => (
    <div className="card stack-sm">
      <span style={{ color: "var(--primary)" }}>{icon}</span>
      <h3>{t(title)}</h3>
      <p className="muted">{t(text)}</p>
    </div>
  );
  return (
    <Page title={t("Community")} subtitle={t("Coming soon: a free online space for families, teachers and volunteer specialists.")}>
      <div className="stack">
        <p className="notice">
          {t("The community is separate from your private records. Nothing about your child is ever uploaded unless you choose to post it yourself.")}
        </p>
        <div className="grid">
          {item(<MessagesSquare size={32} />, "Groups and forums", "Talk with parents and teachers who understand, by topic, age and need.")}
          {item(<BadgeCheck size={32} />, "Ask a specialist", "Free answers from verified volunteer SLPs, OTs, BCBAs, psychologists and special-ed teachers.")}
          {item(<Library size={32} />, "Template library", "Schedules, routines and goal ideas shared by the community, imported with one click.")}
          {item(<Award size={32} />, "Points and certificates", "Volunteers and helpful parents earn points, levels and verifiable contribution certificates.")}
          {item(<Users size={32} />, "Local directory", "Charities, parent groups and services near you.")}
          {item(<ShieldCheck size={32} />, "Safe by design", "Verified specialists, moderators, adults only, and clear rules about children's privacy.")}
        </div>
        {DONATE_URL && (
          <div className="card spread">
            <p>{t("Donations keep the app and the community free for everyone.")}</p>
            <button className="btn primary" onClick={() => openLink(DONATE_URL)}>
              <Heart size={18} /> {t("Support this project")}
            </button>
          </div>
        )}
      </div>
    </Page>
  );
}
