import { useState, type ReactNode } from "react";
import { BadgeCheck, Mail, ShieldCheck } from "lucide-react";
import { levelFor } from "../../community/levels";
import { privateWords, privacyWarnings } from "../../community/privacy";
import { refreshCommunity, setProfile, useCommunity } from "../../community/state";
import type { Author } from "../../community/types";
import { useI18n } from "../../lib/i18n";
import { EMERGENCY, type Country, type Role } from "../../lib/schema";
import { useData } from "../../lib/store";
import { Field, Modal, Segmented } from "../../components/ui";

const COLORS = ["#007aff", "#34c759", "#ff9500", "#af52de", "#ff2d55", "#5856d6", "#30b0c7"];

export function AuthorAvatar({ a, size }: { a: Pick<Author, "id" | "display_name">; size?: "sm" | "lg" }) {
  const color = COLORS[[...a.id].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];
  return (
    <span className={"avatar" + (size ? " " + size : "")} style={{ background: color }} aria-hidden>
      {a.display_name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AuthorLine({ a, extra }: { a: Author; extra?: ReactNode }) {
  const { t } = useI18n();
  const lvl = levelFor(a.points).level;
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className="author">
        {a.display_name}
        {a.verified && <BadgeCheck size={15} className="verified" aria-label={t("Verified specialist")} />}
      </span>
      {a.verified && a.specialty ? <span className="tiny muted">{a.specialty}</span> : <span className="tiny muted">{t(a.role === "parent" ? "Parent" : a.role === "teacher" ? "Teacher" : "Specialist")}</span>}
      <span className="tiny muted" title={t(lvl.name)}>
        · {lvl.emoji} {t(lvl.name)}
      </span>
      {extra}
    </span>
  );
}

export function timeAgo(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : new Date(iso).toLocaleDateString();
}

/** Warns before posting anything that could identify a child. Returns true when it is OK to post. */
export function usePrivacyCheck() {
  const data = useData();
  const words = privateWords(data);
  const [warning, setWarning] = useState<{ found: string[]; go: () => void } | null>(null);
  const { t } = useI18n();
  const check = (text: string, go: () => void) => {
    const found = privacyWarnings(text, words);
    if (found.length) setWarning({ found, go });
    else go();
  };
  const dialog = warning && (
    <Modal
      title={t("Check before you post")}
      onClose={() => setWarning(null)}
      footer={
        <>
          <button className="btn" onClick={() => { const go = warning.go; setWarning(null); go(); }}>
            {t("Post anyway")}
          </button>
          <button className="btn primary" onClick={() => setWarning(null)}>
            {t("Edit my post")}
          </button>
        </>
      }
    >
      <div className="stack-sm">
        <p>
          {t("Your post contains")} <strong>{warning.found.join(", ")}</strong>.
        </p>
        <p className="muted">{t("The community is public to members. To protect your child, avoid real names, schools, photos and contact details.")}</p>
      </div>
    </Modal>
  );
  return { check, dialog };
}

export const RULES = [
  "I am 18 or older.",
  "I will not share children's names, photos, schools or other details that could identify them.",
  "I will be kind. Every family's path is different.",
  "Advice here is support, not a diagnosis or medical treatment.",
];

export function SignInSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const data = useData();
  const { api, signedIn, profile } = useCommunity();
  const [step, setStep] = useState<"email" | "code" | "profile">(signedIn && !profile ? "profile" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState(data.profile.name);
  const [role, setRole] = useState<Role>(data.profile.role);
  const [bio, setBio] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!api) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const next = () =>
    run(async () => {
      if (step === "email") {
        await api.sendCode(email.trim());
        setStep("code");
      } else if (step === "code") {
        await api.verifyCode(email.trim(), code);
        const me = await api.me();
        if (me) {
          setProfile(me);
          await refreshCommunity();
          onClose();
        } else setStep("profile");
      } else {
        const me = await api.saveProfile({ display_name: name.trim(), role, country: data.settings.country as Country, bio: bio.trim(), specialty: "" });
        setProfile(me);
        await refreshCommunity();
        onClose();
      }
    });

  const canGo = step === "email" ? /\S+@\S+\.\S+/.test(email) : step === "code" ? code.trim().length >= 6 : name.trim().length >= 2 && agreed;

  return (
    <Modal
      title={step === "profile" ? t("Your community profile") : t("Join the community")}
      onClose={onClose}
      footer={
        <button className="btn primary" disabled={!canGo || busy} onClick={next}>
          {busy ? t("Please wait…") : step === "profile" ? t("Join") : t("Continue")}
        </button>
      }
    >
      <div className="stack">
        {step === "email" && (
          <>
            <p className="muted">{t("We'll email you a 6-digit code. No password needed. Your email is never shown to other members.")}</p>
            <Field label={t("Email")}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus placeholder="name@example.com" />
            </Field>
          </>
        )}
        {step === "code" && (
          <>
            <p className="row muted">
              <Mail size={16} /> {t("Enter the code we sent to")} {email}
            </p>
            <Field label={t("Code")}>
              <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus inputMode="numeric" style={{ fontSize: "1.4rem", letterSpacing: "0.3em", textAlign: "center" }} />
            </Field>
          </>
        )}
        {step === "profile" && (
          <>
            <Field label={t("Name shown to others")} hint={t("a first name or nickname is fine")}>
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={40} />
            </Field>
            <Field label={t("I am a")}>
              <Segmented
                value={role}
                onChange={setRole}
                options={[
                  { value: "parent" as const, label: t("Parent / carer") },
                  { value: "teacher" as const, label: t("Teacher") },
                  { value: "specialist" as const, label: t("Specialist") },
                ]}
              />
            </Field>
            <Field label={t("About you")} hint={t("optional")}>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder={t("e.g. Mom of a 7-year-old autistic boy who loves trains")} />
            </Field>
            <div className="group">
              {RULES.map((r) => (
                <div key={r} className="cell">
                  <ShieldCheck size={18} color="var(--green)" />
                  <span className="label small">{t(r)}</span>
                </div>
              ))}
            </div>
            <label className="check">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              {t("I agree to the community rules")}
            </label>
            {EMERGENCY[data.settings.country] && (
              <p className="tiny muted">
                {t("In an emergency, call")} {EMERGENCY[data.settings.country]}. {t("The community is not an emergency service.")}
              </p>
            )}
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </Modal>
  );
}
