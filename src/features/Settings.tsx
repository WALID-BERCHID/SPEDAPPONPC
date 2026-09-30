import { useEffect, useState } from "react";
import { Download, Heart, KeyRound, Lock, Upload } from "lucide-react";
import { APP_NAME, APP_VERSION, DONATE_URL } from "../lib/app";
import { changePassword, newRecoveryCode, openShare, parseFile, sealVault, unlockVault, type ShareFile, type VaultFile } from "../lib/crypto";
import { useI18n } from "../lib/i18n";
import type { Country, Role, Settings as SettingsT, Theme, VaultData } from "../lib/schema";
import { flush, getSession, markDirty, mergePack, openStore, update, useData, type SharePack } from "../lib/store";
import { isTauri, storage } from "../lib/storage";
import { today } from "../lib/util";
import { Chips, Field, Modal, Page, tell } from "../components/ui";

export async function openLink(url: string) {
  if (isTauri) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else window.open(url, "_blank", "noopener");
}

export function SettingsPage({ onLock }: { onLock: () => void }) {
  const { t } = useI18n();
  const data = useData();
  const s = data.settings;
  const [folder, setFolder] = useState<string | null>(null);
  const [modal, setModal] = useState<"password" | "recovery" | "restore" | "import" | null>(null);
  const [picked, setPicked] = useState<VaultFile | ShareFile | null>(null);
  useEffect(() => void storage.location().then(setFolder), []);

  const setSetting = <K extends keyof SettingsT>(k: K, v: SettingsT[K]) => update((d) => ({ settings: { ...d.settings, [k]: v } }));

  const backup = async () => {
    await flush();
    const file = await sealVault(getSession()!, data);
    if (await storage.exportFile(`${APP_NAME.replace(/\s/g, "")}-backup-${today()}.hih`, JSON.stringify(file), "hih")) await tell(t("Backup saved. Keep it on a USB stick or in your own cloud folder."));
  };

  const pick = async (kind: "restore" | "import") => {
    const f = await storage.importFile(kind === "restore" ? ["hih"] : ["hihshare"]);
    if (!f) return;
    const parsed = parseFile(f.text);
    const want = kind === "restore" ? "handinhand-vault" : "handinhand-share";
    if (!parsed || parsed.format !== want) return tell(t("This file can't be opened here. Check you picked the right file."));
    setPicked(parsed);
    setModal(kind);
  };

  return (
    <Page title={t("Settings")}>
      <div className="stack">
        <div className="card stack">
          <h2>{t("You")}</h2>
          <div className="grid-2">
            <Field label={t("Your name")}>
              <input value={data.profile.name} onChange={(e) => update((d) => ({ profile: { ...d.profile, name: e.target.value } }))} />
            </Field>
            <Field label={t("Role")}>
              <select value={data.profile.role} onChange={(e) => update((d) => ({ profile: { ...d.profile, role: e.target.value as Role } }))}>
                <option value="parent">{t("Parent / carer")}</option>
                <option value="teacher">{t("Teacher / aide")}</option>
                <option value="specialist">{t("Therapist / specialist")}</option>
              </select>
            </Field>
            <Field label={t("Country")} hint={t("sets spelling, dates and plan types")}>
              <select value={s.country} onChange={(e) => setSetting("country", e.target.value as Country)}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="OTHER">{t("Other")}</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="card stack">
          <h2>{t("Look and feel")}</h2>
          <Field label={t("Theme")}>
            <Chips<Theme>
              options={[
                { value: "system", label: t("Match Windows") },
                { value: "light", label: t("Light") },
                { value: "dark", label: t("Dark") },
                { value: "contrast", label: t("High contrast") },
              ]}
              value={s.theme}
              onChange={(v) => setSetting("theme", v)}
            />
          </Field>
          <Field label={t("Text size")}>
            <Chips
              options={[
                { value: 0.9, label: "A−" },
                { value: 1, label: "A" },
                { value: 1.15, label: "A+" },
                { value: 1.3, label: "A++" },
              ]}
              value={s.textScale}
              onChange={(v) => setSetting("textScale", v)}
            />
          </Field>
          <label className="check">
            <input type="checkbox" checked={s.readableFont} onChange={(e) => setSetting("readableFont", e.target.checked)} />
            {t("Extra-readable font (Atkinson Hyperlegible)")}
          </label>
          <label className="check">
            <input type="checkbox" checked={s.reduceMotion} onChange={(e) => setSetting("reduceMotion", e.target.checked)} />
            {t("Reduce motion")}
          </label>
        </div>

        <div className="card stack">
          <h2>{t("Privacy and security")}</h2>
          <p className="muted">
            {t("Your data is encrypted with your password and stored only on this computer.")}
            {folder && (
              <>
                {" "}
                {t("Folder")}: <code>{folder}</code>
              </>
            )}
          </p>
          <Field label={t("Lock automatically after")}>
            <select value={s.autoLockMinutes} onChange={(e) => setSetting("autoLockMinutes", Number(e.target.value))}>
              {[5, 15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m} {t("minutes without use")}
                </option>
              ))}
              <option value={0}>{t("Never")}</option>
            </select>
          </Field>
          <div className="row">
            <button className="btn" onClick={() => setModal("password")}>
              <KeyRound size={18} /> {t("Change password")}
            </button>
            <button className="btn" onClick={() => setModal("recovery")}>
              <KeyRound size={18} /> {t("New recovery key")}
            </button>
            <button className="btn" onClick={onLock}>
              <Lock size={18} /> {t("Lock now")}
            </button>
          </div>
        </div>

        <div className="card stack">
          <h2>{t("Backup and sharing")}</h2>
          <p className="muted">
            {isTauri ? t("A backup copy is also made automatically every day (the last 10 are kept).") + " " : ""}
            {t("Save a backup to a USB stick or your own cloud folder from time to time.")}
          </p>
          <div className="row">
            <button className="btn primary" onClick={backup}>
              <Download size={18} /> {t("Save a backup")}
            </button>
            <button className="btn" onClick={() => pick("restore")}>
              <Upload size={18} /> {t("Restore a backup")}
            </button>
            <button className="btn" onClick={() => pick("import")}>
              <Upload size={18} /> {t("Import a share file")}
            </button>
          </div>
        </div>

        <div className="card stack-sm">
          <h2>{t("About")}</h2>
          <p>
            {APP_NAME} {APP_VERSION} · {t("Free for everyone. No ads, no tracking, no account.")}
          </p>
          <p className="small muted">
            {t("Not a medical device. It helps you organise information to share with professionals.")} {t("Uses Lucide icons (ISC licence) and the Atkinson Hyperlegible font (SIL Open Font Licence).")}
          </p>
          {DONATE_URL && (
            <button className="btn" style={{ alignSelf: "flex-start" }} onClick={() => openLink(DONATE_URL)}>
              <Heart size={18} color="var(--accent)" /> {t("Support this project")}
            </button>
          )}
        </div>
      </div>

      {modal === "password" && <PasswordModal onClose={() => setModal(null)} />}
      {modal === "recovery" && <RecoveryModal onClose={() => setModal(null)} />}
      {modal === "restore" && picked && <RestoreModal file={picked as VaultFile} onClose={() => setModal(null)} />}
      {modal === "import" && picked && <ImportModal file={picked as ShareFile} onClose={() => setModal(null)} />}
    </Page>
  );
}

function usePasswordCheck() {
  return async (pw: string) => {
    const probe = await sealVault(getSession()!, 0);
    try {
      await unlockVault(probe, pw);
      return true;
    } catch {
      return false;
    }
  };
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const check = usePasswordCheck();
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const go = async () => {
    if (!(await check(cur))) return setError(t("Wrong password. Try again."));
    if (pw.length < 8) return setError(t("Use at least 8 characters for your password."));
    if (pw !== pw2) return setError(t("The two passwords are not the same."));
    await changePassword(getSession()!, pw);
    markDirty();
    await flush();
    onClose();
    await tell(t("Password changed."));
  };
  return (
    <Modal title={t("Change password")} onClose={onClose} footer={<button className="btn primary" onClick={go}>{t("Change password")}</button>}>
      <div className="stack">
        <Field label={t("Current password")}>
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoFocus />
        </Field>
        <Field label={t("New password")}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Field label={t("Type it again")}>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </Field>
        {error && <p className="error">{error}</p>}
      </div>
    </Modal>
  );
}

function RecoveryModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const check = usePasswordCheck();
  const [cur, setCur] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const go = async () => {
    if (!(await check(cur))) return setError(t("Wrong password. Try again."));
    setCode(await newRecoveryCode(getSession()!));
    markDirty();
    await flush();
  };
  return (
    <Modal title={t("New recovery key")} onClose={onClose} footer={!code && <button className="btn primary" onClick={go}>{t("Make a new key")}</button>}>
      {code ? (
        <div className="stack">
          <p>{t("Your old recovery key no longer works. Save this one somewhere safe.")}</p>
          <div className="recovery-code">{code}</div>
          <button className="btn" onClick={() => window.print()}>
            {t("Print")}
          </button>
        </div>
      ) : (
        <div className="stack">
          <Field label={t("Current password")}>
            <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoFocus />
          </Field>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

function RestoreModal({ file, onClose }: { file: VaultFile; onClose: () => void }) {
  const { t } = useI18n();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const go = async () => {
    try {
      const { session, data } = await unlockVault<VaultData>(file, pw);
      openStore(session, data);
      markDirty();
      await flush();
      onClose();
      await tell(t("Backup restored. From now on, use the password of that backup."));
    } catch {
      setError(t("Wrong password for this backup."));
    }
  };
  return (
    <Modal title={t("Restore a backup")} onClose={onClose} footer={<button className="btn primary" onClick={go}>{t("Replace my data with this backup")}</button>}>
      <div className="stack">
        <p className="notice">{t("Everything currently in the app will be replaced by the backup.")}</p>
        <Field label={t("Password used when the backup was made")}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </Field>
        {error && <p className="error">{error}</p>}
      </div>
    </Modal>
  );
}

function ImportModal({ file, onClose }: { file: ShareFile; onClose: () => void }) {
  const { t } = useI18n();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const go = async () => {
    let pack: SharePack;
    try {
      pack = await openShare<SharePack>(file, pw);
    } catch {
      return setError(t("Wrong share password."));
    }
    const { added, updated } = mergePack(pack);
    onClose();
    await tell(`${t("Imported from")} ${pack.from || "?"}: ${added} ${t("new records")}, ${updated} ${t("updated")}.`);
  };
  return (
    <Modal title={t("Import a share file")} onClose={onClose} footer={<button className="btn primary" onClick={go}>{t("Import")}</button>}>
      <div className="stack">
        <p>{t("New information is added. If both of you changed the same record, the most recent change is kept.")}</p>
        <Field label={t("Share password")}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </Field>
        {error && <p className="error">{error}</p>}
      </div>
    </Modal>
  );
}
