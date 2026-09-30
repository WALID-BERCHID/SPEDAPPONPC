import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, Plus, Printer, Share2, Trash2, UserPlus, AlertTriangle } from "lucide-react";
import { useChild } from "../lib/childContext";
import { sealShare } from "../lib/crypto";
import { useI18n } from "../lib/i18n";
import { EMERGENCY, type Child, type Contact } from "../lib/schema";
import { addImage, packChild, removeChild, upsert, useData } from "../lib/store";
import { storage } from "../lib/storage";
import { age, daysAgo, fullName, resizeImage } from "../lib/util";
import { APP_NAME } from "../lib/app";
import { Avatar, Empty, Field, Modal, Page, ask, tell } from "../components/ui";

const COLORS = ["#2f6f5e", "#3b6ea8", "#8a4fb5", "#c0567a", "#c46a1d", "#5b7d1f", "#1f7a8c"];

export function ChildrenPage() {
  const { t } = useI18n();
  const data = useData();
  const { children } = data;
  const nav = useNavigate();
  const weekAgo = daysAgo(7);
  const add = (
    <button className="btn primary" onClick={() => nav("/children/new")}>
      <Plus size={18} /> {t("Add a child")}
    </button>
  );
  return (
    <Page title={t("Children")} subtitle={t("Everything about each child, in one place.")} actions={add}>
      {children.length === 0 ? (
        <Empty icon={<UserPlus size={48} />} title={t("No children yet")} action={add} />
      ) : (
        <div className="grid">
          {children.map((c) => (
            <button key={c.id} className="card link row" style={{ gap: 14 }} onClick={() => nav(`/children/${c.id}`)}>
              <Avatar child={c} size="lg" />
              <div className="stack-sm">
                <strong style={{ fontSize: "1.1rem" }}>{fullName(c)}</strong>
                <span className="small muted">
                  {age(c.birthDate) != null && `${age(c.birthDate)} ${t("years old")}`}
                  {c.school && ` · ${c.school}`}
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <span className="badge ok">
                    {data.goals.filter((g) => g.childId === c.id && g.status === "active").length} {t("goals")}
                  </span>
                  <span className="badge warn">
                    {data.behaviors.filter((b) => b.childId === c.id && b.at.slice(0, 10) > weekAgo).length} {t("behaviors this week")}
                  </span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Page>
  );
}

const blank = (): Omit<Child, "id" | "createdAt" | "updatedAt"> => ({
  firstName: "",
  lastName: "",
  birthDate: "",
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
  pronouns: "",
  school: "",
  diagnoses: "",
  strengths: "",
  interests: "",
  likes: "",
  dislikes: "",
  communication: "",
  sensory: "",
  triggers: "",
  calming: "",
  medical: "",
  allergies: "",
  medications: "",
  contacts: [],
  notes: "",
});

type Draft = ReturnType<typeof blank> & Partial<Pick<Child, "id" | "createdAt">>;

export function ChildEditor() {
  const { t } = useI18n();
  const { id } = useParams();
  const data = useData();
  const nav = useNavigate();
  const { setChildId } = useChild();
  const existing = data.children.find((c) => c.id === id);
  const [c, setC] = useState<Draft>(() => existing ?? blank());
  const [sharing, setSharing] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setC((prev) => ({ ...prev, [k]: v }));

  const text = (k: keyof Draft, label: string, hint?: string, long = true) => (
    <Field label={t(label)} hint={hint && t(hint)}>
      {long ? (
        <textarea value={c[k] as string} onChange={(e) => set(k, e.target.value as never)} />
      ) : (
        <input value={c[k] as string} onChange={(e) => set(k, e.target.value as never)} />
      )}
    </Field>
  );

  const pickPhoto = () => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    input.onchange = async () => {
      const f = input.files?.[0];
      if (f) set("photoId", addImage(await resizeImage(f, 320)));
    };
    input.click();
  };

  const setContact = (i: number, patch: Partial<Contact>) =>
    set(
      "contacts",
      c.contacts.map((x, j) => (j === i ? { ...x, ...patch } : x)),
    );

  const save = (e: FormEvent) => {
    e.preventDefault();
    const saved = upsert("children", c);
    setChildId(saved.id);
    nav(existing ? "/children" : "/");
  };

  const del = async () => {
    if (existing && (await ask(t("Delete this child and all their goals, notes and schedules? This cannot be undone.")))) {
      removeChild(existing.id);
      nav("/children");
    }
  };

  const preview = { ...blank(), ...c, id: "preview", createdAt: "", updatedAt: "" } as Child;

  return (
    <Page
      title={existing ? fullName(existing) : t("New child")}
      actions={
        existing && (
          <>
            <button className="btn" onClick={() => nav(`/children/${existing.id}/about`)}>
              <Printer size={18} /> {t("All About Me page")}
            </button>
            <button className="btn" onClick={() => setSharing(true)}>
              <Share2 size={18} /> {t("Share file")}
            </button>
          </>
        )
      }
    >
      <form className="stack" onSubmit={save}>
        <div className="card stack">
          <div className="row" style={{ gap: 16 }}>
            <Avatar child={preview} size="lg" />
            <div className="stack-sm">
              <button type="button" className="btn" onClick={pickPhoto}>
                <Camera size={18} /> {t("Choose photo")}
              </button>
              <div className="row" role="group" aria-label={t("Color")}>
                {COLORS.map((col) => (
                  <button
                    type="button"
                    key={col}
                    aria-label={col}
                    aria-pressed={c.color === col}
                    onClick={() => set("color", col)}
                    style={{ width: 28, height: 28, borderRadius: "50%", background: col, border: c.color === col ? "3px solid var(--text)" : "none", cursor: "pointer" }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid-2">
            <Field label={t("First name")}>
              <input value={c.firstName} onChange={(e) => set("firstName", e.target.value)} required autoFocus={!existing} />
            </Field>
            <Field label={t("Last name")}>
              <input value={c.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
            <Field label={t("Date of birth")}>
              <input type="date" value={c.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
            </Field>
            {text("pronouns", "Pronouns", undefined, false)}
            {text("school", "School / class", undefined, false)}
          </div>
        </div>

        <div className="card stack">
          <h2>{t("Who they are")}</h2>
          <div className="grid-2">
            {text("strengths", "Strengths", "what they are good at")}
            {text("interests", "Interests", "favorite topics, characters, activities")}
            {text("likes", "Likes", "foods, toys, rewards that work")}
            {text("dislikes", "Dislikes")}
          </div>
        </div>

        <div className="card stack">
          <h2>{t("Communication and sensory needs")}</h2>
          <div className="grid-2">
            {text("communication", "How they communicate", "speech, signs, pictures, device, gestures")}
            {text("sensory", "Sensory needs", "noise, light, touch, movement")}
            {text("triggers", "What can upset them")}
            {text("calming", "What helps them calm down")}
          </div>
        </div>

        <div className="card stack">
          <h2>{t("Health")}</h2>
          <div className="grid-2">
            {text("diagnoses", "Diagnoses or needs")}
            {text("medical", "Medical information")}
            {text("allergies", "Allergies")}
            {text("medications", "Medications", "name, dose, time")}
          </div>
        </div>

        <div className="card stack">
          <div className="spread">
            <h2>{t("Emergency contacts")}</h2>
            <button type="button" className="btn" onClick={() => set("contacts", [...c.contacts, { name: "", relation: "", phone: "" }])}>
              <Plus size={18} /> {t("Add contact")}
            </button>
          </div>
          {c.contacts.map((x, i) => (
            <div key={i} className="row" style={{ flexWrap: "nowrap" }}>
              <input placeholder={t("Name")} value={x.name} onChange={(e) => setContact(i, { name: e.target.value })} />
              <input placeholder={t("Relationship")} value={x.relation} onChange={(e) => setContact(i, { relation: e.target.value })} />
              <input placeholder={t("Phone")} value={x.phone} onChange={(e) => setContact(i, { phone: e.target.value })} />
              <button type="button" className="btn ghost icon" aria-label={t("Remove")} onClick={() => set("contacts", c.contacts.filter((_, j) => j !== i))}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {text("notes", "Other notes")}
        </div>

        <div className="spread">
          {existing ? (
            <button type="button" className="btn danger" onClick={del}>
              <Trash2 size={18} /> {t("Delete child")}
            </button>
          ) : (
            <span />
          )}
          <button className="btn primary big">{t("Save")}</button>
        </div>
      </form>
      {sharing && existing && <ShareModal child={existing} onClose={() => setSharing(false)} />}
    </Page>
  );
}

function ShareModal({ child, onClose }: { child: Child; onClose: () => void }) {
  const { t } = useI18n();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (pw.length < 6) return setError(t("Use at least 6 characters."));
    setBusy(true);
    const file = await sealShare(packChild(child.id), pw);
    const ok = await storage.exportFile(`${child.firstName}-share.hihshare`, JSON.stringify(file), "hihshare");
    setBusy(false);
    if (ok) {
      onClose();
      await tell(t("Share file saved. Send it by email or USB, and tell the other person the share password in person or by phone."));
    }
  };

  return (
    <Modal
      title={t("Share with home or school")}
      onClose={onClose}
      footer={
        <button className="btn primary" disabled={busy} onClick={go}>
          <Share2 size={18} /> {busy ? t("Saving…") : t("Save share file")}
        </button>
      }
    >
      <div className="stack">
        <p>
          {t("This makes an encrypted file with")} <strong>{child.firstName}</strong>
          {t("'s profile, goals, data, behavior log, notebook and schedules. The other person opens it in")} {APP_NAME} {t("(Settings → Import a share file). Nothing is uploaded.")}
        </p>
        <Field label={t("Share password")} hint={t("give it to them separately, not in the same email")}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </Field>
        {error && <p className="error">{error}</p>}
      </div>
    </Modal>
  );
}

export function AllAboutMe() {
  const { t } = useI18n();
  const { id } = useParams();
  const data = useData();
  const nav = useNavigate();
  const c = data.children.find((x) => x.id === id);
  if (!c) return null;
  const emergency = EMERGENCY[data.settings.country];
  const block = (title: string, value: string) =>
    value.trim() && (
      <div className="card stack-sm">
        <h3>{t(title)}</h3>
        <p style={{ whiteSpace: "pre-wrap" }}>{value}</p>
      </div>
    );

  return (
    <div className="stack">
      <div className="row no-print">
        <button className="btn" onClick={() => nav(-1)}>
          {t("Back")}
        </button>
        <button className="btn primary" onClick={() => window.print()}>
          <Printer size={18} /> {t("Print or save as PDF")}
        </button>
      </div>
      <div className="card row" style={{ gap: 20, borderColor: c.color, borderWidth: 3 }}>
        <Avatar child={c} size="lg" />
        <div className="stack-sm">
          <h1>
            {t("All about")} {c.firstName}
          </h1>
          <p className="muted">
            {[fullName(c), c.pronouns, age(c.birthDate) != null ? `${age(c.birthDate)} ${t("years old")}` : "", c.school].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <div className="grid-2">
        {block("How I communicate", c.communication)}
        {block("What I'm good at", c.strengths)}
        {block("I love", [c.interests, c.likes].filter(Boolean).join("\n"))}
        {block("I don't like", c.dislikes)}
        {block("What can upset me", c.triggers)}
        {block("What helps me calm down", c.calming)}
        {block("My senses", c.sensory)}
        {block("Allergies", c.allergies)}
        {block("Medications", c.medications)}
        {block("Medical information", c.medical)}
      </div>
      {c.contacts.length > 0 && (
        <div className="card stack-sm">
          <h3>{t("Emergency contacts")}</h3>
          {c.contacts.map((x, i) => (
            <p key={i}>
              <strong>{x.name}</strong> ({x.relation}) · {x.phone}
            </p>
          ))}
          {emergency && (
            <p className="row">
              <AlertTriangle size={16} /> {t("In an emergency call")} {emergency}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
