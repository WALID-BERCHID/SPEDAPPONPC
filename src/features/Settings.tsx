import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Download, Globe, Heart, KeyRound, Lock, Share2, ShieldCheck, Timer, Type, Upload, User, Users, Wind } from "lucide-react";
import { APP_NAME, APP_VERSION, DONATE_URL } from "../lib/app";
import { changePassword, newRecoveryCode, openShare, parseFile, sealVault, unlockVault, type ShareFile, type VaultFile } from "../lib/crypto";
import { useI18n } from "../lib/i18n";
import type { Country, Role, Settings as SettingsT, Theme, VaultData } from "../lib/schema";
import { flush, getSession, markDirty, mergePack, openStore, update, useData, type SharePack } from "../lib/store";
import { isTauri, storage } from "../lib/storage";
import { today } from "../lib/util";
import { Cell, Field, Group, Modal, Page, Segmented, Switch, Tile, tell } from "../components/ui";

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

  const row = (icon: ReactNode, color: string, label: string, control: ReactNode, detail?: string) => (
    <Cell icon={<Tile color={color}>{icon}</Tile>} label={t(label)} detail={detail}>
      {control}
    </Cell>
  );

  return (
    <Page title={t("Settings")}>
      <div className="stack" style={{ maxWidth: 760 }}>
        <Group title={t("You")}>
          {row(<User size={15} />, "#007aff", "Your name", <input value={data.profile.name} onChange={(e) => update((d) => ({ profile: { ...d.profile, name: e.target.value } }))} style={{ maxWidth: 240 }} />)}
          {row(
            <Users size={15} />,
            "#ff9500",
            "Role",
            <select value={data.profile.role} onChange={(e) => update((d) => ({ profile: { ...d.profile, role: e.target.value as Role } }))} style={{ maxWidth: 240 }}>
              <option value="parent">{t("Parent / carer")}</option>
              <option value="teacher">{t("Teacher / aide")}</option>
              <option value="specialist">{t("Therapist / specialist")}</option>
            </select>,
          )}
          {row(
            <Globe size={15} />,
            "#34c759",
            "Country",
            <select value={s.country} onChange={(e) => setSetting("country", e.target.value as Country)} style={{ maxWidth: 240 }}>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="UK">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="OTHER">{t("Other")}</option>
            </select>,
            t("Sets spelling, dates and plan types"),
          )}
        </Group>

        <Group title={t("Look and feel")}>
          <div className="cell">
            <span className="label">{t("Appearance")}</span>
            <Segmented<Theme>
              value={s.theme}
              onChange={(v) => setSetting("theme", v)}
              options={[
                { value: "system", label: t("Auto") },
                { value: "light", label: t("Light") },
                { value: "dark", label: t("Dark") },
                { value: "contrast", label: t("High contrast") },
              ]}
            />
          </div>
          <div className="cell">
            <span className="label">{t("Text size")}</span>
            <Segmented
              value={s.textScale}
              onChange={(v) => setSetting("textScale", v)}
              options={[
                { value: 0.9, label: <span style={{ fontSize: 12 }}>A</span> },
                { value: 1, label: <span style={{ fontSize: 14 }}>A</span> },
                { value: 1.15, label: <span style={{ fontSize: 17 }}>A</span> },
                { value: 1.3, label: <span style={{ fontSize: 20 }}>A</span> },
              ]}
            />
          </div>
          {row(<Type size={15} />, "#5856d6", "Extra-readable font", <Switch checked={s.readableFont} onChange={(v) => setSetting("readableFont", v)} label={t("Extra-readable font")} />, "Atkinson Hyperlegible")}
          {row(<Wind size={15} />, "#30b0c7", "Reduce motion", <Switch checked={s.reduceMotion} onChange={(v) => setSetting("reduceMotion", v)} label={t("Reduce motion")} />)}
        </Group>

        <Group title={t("Privacy and security")} footer={t("Your data is encrypted with your password (AES-256) and stored only on this computer.") + (folder ? ` ${t("Folder")}: ${folder}` : "")}>
          {row(
            <Timer size={15} />,
            "#ff9500",
            "Lock automatically",
            <select value={s.autoLockMinutes} onChange={(e) => setSetting("autoLockMinutes", Number(e.target.value))} style={{ maxWidth: 200 }}>
              {[5, 15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {t("After")} {m} min
                </option>
              ))}
              <option value={0}>{t("Never")}</option>
            </select>,
          )}
          <Cell icon={<Tile color="#8e8e93"><KeyRound size={15} /></Tile>} label={t("Change password")} onClick={() => setModal("password")}>
            <ChevronRight size={16} className="muted" />
          </Cell>
          <Cell icon={<Tile color="#34c759"><ShieldCheck size={15} /></Tile>} label={t("New recovery key")} onClick={() => setModal("recovery")}>
            <ChevronRight size={16} className="muted" />
          </Cell>
          <Cell icon={<Tile color="#ff3b30"><Lock size={15} /></Tile>} label={t("Lock now")} onClick={onLock}>
            <ChevronRight size={16} className="muted" />
          </Cell>
        </Group>

        <Group title={t("Backup and sharing")} footer={(isTauri ? t("A backup copy is also made automatically every day (the last 10 are kept).") + " " : "") + t("Save a backup to a USB stick or your own cloud folder from time to time.")}>
          <Cell icon={<Tile color="#007aff"><Download size={15} /></Tile>} label={t("Save a backup")} onClick={backup}>
            <ChevronRight size={16} className="muted" />
          </Cell>
          <Cell icon={<Tile color="#5856d6"><Upload size={15} /></Tile>} label={t("Restore a backup")} onClick={() => pick("restore")}>
            <ChevronRight size={16} className="muted" />
          </Cell>
          <Cell icon={<Tile color="#ff9500"><Share2 size={15} /></Tile>} label={t("Import a share file")} detail={t("From home or school")} onClick={() => pick("import")}>
            <ChevronRight size={16} className="muted" />
          </Cell>
        </Group>

        <Group title={t("About")} footer={t("Not a medical device. It helps you organise information to share with professionals.") + " " + t("Uses Lucide icons (ISC licence) and the Atkinson Hyperlegible font (SIL Open Font Licence).")}>
          <Cell icon={<img src="/icon.svg" alt="" width={26} height={26} style={{ borderRadius: 7 }} />} label={`${APP_NAME} ${APP_VERSION}`} detail={t("Free for everyone. No ads, no tracking, no account.")} />
          {DONATE_URL && (
            <Cell icon={<Tile color="#ff2d55"><Heart size={15} /></Tile>} label={t("Support this project")} onClick={() => openLink(DONATE_URL)}>
              <ChevronRight size={16} className="muted" />
            </Cell>
          )}
        </Group>
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
