import { useState, type FormEvent } from "react";
import { ShieldCheck, Printer, Copy } from "lucide-react";
import { APP_NAME } from "../lib/app";
import { changePassword, createVault, unlockVault, type VaultFile } from "../lib/crypto";
import { useI18n } from "../lib/i18n";
import { emptyVault, type Country, type Role, type VaultData } from "../lib/schema";
import { markDirty, openStore } from "../lib/store";
import { storage } from "../lib/storage";
import { Field, Segmented } from "../components/ui";

const COUNTRIES: { value: Country; label: string }[] = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "UK", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "OTHER", label: "Other" },
];

const ROLES: { value: Role; label: string }[] = [
  { value: "parent", label: "Parent / carer" },
  { value: "teacher", label: "Teacher / aide" },
  { value: "specialist", label: "Therapist / specialist" },
];

export function Setup(props: { country: Country; onCountry: (c: Country) => void; onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("parent");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError(t("Use at least 8 characters for your password."));
    if (pw !== pw2) return setError(t("The two passwords are not the same."));
    setBusy(true);
    const data = emptyVault({ name: name.trim(), role }, props.country);
    const { session, recoveryCode, file } = await createVault(pw, data);
    await storage.save(JSON.stringify(file));
    openStore(session, data);
    setCode(recoveryCode);
    setBusy(false);
  };

  if (code) {
    return (
      <div className="center-screen">
        <div className="card center-card stack">
          <ShieldCheck size={44} color="var(--green)" style={{ alignSelf: "center" }} />
          <h1>{t("Your recovery key")}</h1>
          <p>
            {t(
              "If you ever forget your password, this key is the only way back into your data. Nobody else (not even us) can recover it. Print it or write it down and keep it somewhere safe.",
            )}
          </p>
          <div className="recovery-code">{code}</div>
          <div className="row no-print">
            <button className="btn" onClick={() => navigator.clipboard.writeText(code)}>
              <Copy size={18} /> {t("Copy")}
            </button>
            <button className="btn" onClick={() => window.print()}>
              <Printer size={18} /> {t("Print")}
            </button>
          </div>
          <label className="check no-print">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            {t("I have saved my recovery key")}
          </label>
          <button className="btn primary big no-print" disabled={!saved} onClick={props.onDone}>
            {t("Start using")} {APP_NAME}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="center-screen">
      <form className="card center-card stack" onSubmit={submit}>
        <div className="stack-sm" style={{ alignItems: "center", textAlign: "center" }}>
          <img className="app-icon" src="/icon.svg" alt="" />
          <h1>
            {t("Welcome to")} {APP_NAME}
          </h1>
        </div>
        <p className="muted">
          {t("Free for every family, teacher and specialist. Everything you enter stays on this computer, locked with your password.")}
        </p>
        <Field label={t("Your name")}>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label={t("I am a")}>
          <Segmented full options={ROLES.map((r) => ({ ...r, label: t(r.label) }))} value={role} onChange={setRole} />
        </Field>
        <Field label={t("Country")} hint={t("sets spelling, dates and plan types")}>
          <select value={props.country} onChange={(e) => props.onCountry(e.target.value as Country)}>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {t(c.label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Create a password")} hint={t("at least 8 characters")}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
        </Field>
        <Field label={t("Type it again")}>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
        </Field>
        {error && <p className="error">{error}</p>}
        <button className="btn primary big" disabled={busy}>
          {busy ? t("Setting up…") : t("Create my private space")}
        </button>
      </form>
    </div>
  );
}

export function Unlock(props: { file: VaultFile; onDone: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"password" | "recovery" | "reset">("password");
  const [secret, setSecret] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "reset" && pw.length < 8) return setError(t("Use at least 8 characters for your password."));
    setBusy(true);
    try {
      if (mode === "reset") {
        const { session, data } = await unlockVault<VaultData>(props.file, secret, "recovery");
        await changePassword(session, pw);
        openStore(session, data);
        markDirty();
        return props.onDone();
      }
      const { session, data } = await unlockVault<VaultData>(props.file, secret, mode);
      if (mode === "recovery") {
        setMode("reset");
        setBusy(false);
        return;
      }
      openStore(session, data);
      props.onDone();
    } catch {
      setError(mode === "password" ? t("Wrong password. Try again.") : t("That recovery key does not match."));
      setBusy(false);
    }
  };

  return (
    <div className="center-screen">
      <form className="card center-card stack" onSubmit={submit}>
        <div className="stack-sm" style={{ alignItems: "center", textAlign: "center" }}>
          <img className="app-icon" src="/icon.svg" alt="" />
          <h1>{APP_NAME}</h1>
          <p className="muted">{t("Enter your password to unlock")}</p>
        </div>
        {mode === "password" && (
          <Field label={t("Password")}>
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoFocus autoComplete="current-password" />
          </Field>
        )}
        {mode === "recovery" && (
          <Field label={t("Recovery key")} hint="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX">
            <input value={secret} onChange={(e) => setSecret(e.target.value)} autoFocus spellCheck={false} />
          </Field>
        )}
        {mode === "reset" && (
          <Field label={t("Choose a new password")} hint={t("at least 8 characters")}>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="new-password" />
          </Field>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn primary big" disabled={busy}>
          {busy ? t("Unlocking…") : mode === "reset" ? t("Save new password") : t("Unlock")}
        </button>
        {mode === "password" ? (
          <button type="button" className="btn ghost" onClick={() => setMode("recovery")}>
            {t("Forgot your password? Use your recovery key")}
          </button>
        ) : (
          mode === "recovery" && (
            <button type="button" className="btn ghost" onClick={() => setMode("password")}>
              {t("Back to password")}
            </button>
          )
        )}
      </form>
    </div>
  );
}
