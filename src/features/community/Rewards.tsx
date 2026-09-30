import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, BadgeCheck, Check, EyeOff, ShieldCheck, X } from "lucide-react";
import { BADGES, LEVELS, POINT_RULES, REASONS, levelFor } from "../../community/levels";
import { refreshCommunity, useCommunity } from "../../community/state";
import type { Certificate, LedgerEntry, ReportItem, Stats, VerificationItem } from "../../community/types";
import { useI18n } from "../../lib/i18n";
import { Field, Group, Modal, Ring, tell } from "../../components/ui";
import { SignOutButton } from "./Hub";

export function RewardsTab() {
  const { t, date } = useI18n();
  const { api, profile } = useCommunity();
  const nav = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    void api!.stats().then(setStats);
    void api!.ledger().then(setLedger);
    void api!.certificates().then(setCerts);
  };
  useEffect(load, [api]);
  if (!profile || !stats) return <p className="muted">{t("Loading…")}</p>;

  const lvl = levelFor(profile.points);
  const issue = async () => {
    setError("");
    try {
      const c = await api!.issueCertificate();
      await refreshCommunity();
      nav(`/community/certificate/${c.id}`, { state: c });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="stack">
      <div className="level-card">
        <Ring value={lvl.progress} size={104} label={lvl.level.emoji} color="#fff" track="rgba(255,255,255,0.25)" />
        <div className="stack-sm grow" style={{ minWidth: 220 }}>
          <span className="muted small">{t("Your level")}</span>
          <h1 style={{ fontSize: "2rem" }}>{t(lvl.level.name)}</h1>
          <span>
            <span className="num" style={{ fontSize: "1.4rem", fontWeight: 700 }}>
              {profile.points}
            </span>{" "}
            {t("points")}
            {lvl.next && <span className="muted"> · {lvl.next.min - profile.points} {t("more to reach")} {t(lvl.next.name)}</span>}
          </span>
          <div className="progress" style={{ maxWidth: 360 }}>
            <div style={{ width: `${lvl.progress * 100}%` }} />
          </div>
        </div>
        <div className="grid-3" style={{ minWidth: 280, gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {(
            [
              ["Answers", stats.answers],
              ["Most helpful", stats.accepted],
              ["Helpful votes", stats.helpful],
              ["Templates", stats.templates],
              ["Sessions", stats.sessions],
              ["Hours", stats.hours],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <div className="num" style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                {v}
              </div>
              <div className="tiny muted">{t(k)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">{t("Levels")}</div>
      <div className="ladder">
        {LEVELS.map((l, i) => (
          <div key={l.name} className={i <= lvl.index ? "reached" : ""}>
            <div style={{ fontSize: "1.6rem" }}>{l.emoji}</div>
            <strong>{t(l.name)}</strong>
            <div className="tiny muted num">
              {l.min}+ {t("points")}
            </div>
            <div className="tiny" style={{ marginTop: 4 }}>
              {t(l.unlocks)}
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">{t("Badges")}</div>
      <div className="card grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", padding: 8 }}>
        {BADGES.map((b) => {
          const got = b.earned(stats, profile.verified);
          return (
            <div key={b.name} className={"badge-tile" + (got ? "" : " locked")} title={t(b.how)}>
              <div className="medal">{b.emoji}</div>
              <strong className="small">{t(b.name)}</strong>
              <span className="tiny muted">{got ? t("Earned") : t(b.how)}</span>
            </div>
          );
        })}
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="stack">
          <Group title={t("Certificates")} footer={t("Contribution certificates can be checked by anyone with the QR code. They record volunteer work; they are not continuing-education credits.")}>
            {certs.map((c) => (
              <button key={c.id} className="cell indent" onClick={() => nav(`/community/certificate/${c.id}`, { state: c })}>
                <Award size={22} color="var(--accent)" />
                <span className="label">
                  <strong>
                    {t(levelFor(c.points).level.name)} · {c.points} {t("points")}
                  </strong>
                  <span className="tiny muted" style={{ display: "block" }}>
                    {date(c.issued_at)} · {c.code}
                  </span>
                </span>
              </button>
            ))}
            <div className="cell">
              <span className="label small muted">{profile.points >= 50 ? t("Get a certificate of your contribution so far.") : t("Certificates start at the Helper level (50 points).")}</span>
              <button className="btn primary" disabled={profile.points < 50} onClick={issue}>
                {t("Get certificate")}
              </button>
            </div>
          </Group>
          {error && <p className="error">{error}</p>}

          <Group title={t("How to earn points")}>
            {POINT_RULES.map(([k, v]) => (
              <div key={k} className="cell">
                <span className="label small">{t(k)}</span>
                <span className="badge ok num">{v}</span>
              </div>
            ))}
          </Group>
        </div>

        <div className="stack">
          <Group title={t("Recent points")}>
            {ledger.length === 0 && (
              <div className="cell">
                <span className="label small muted">{t("Help someone to earn your first points.")}</span>
              </div>
            )}
            {ledger.slice(0, 12).map((l, i) => (
              <div key={i} className="cell">
                <span className="label small">
                  {t(REASONS[l.reason] ?? l.reason)}
                  <span className="tiny muted" style={{ display: "block" }}>
                    {date(l.created_at)}
                  </span>
                </span>
                <span className="num" style={{ fontWeight: 700, color: l.amount > 0 ? "var(--ok)" : "var(--danger)" }}>
                  {l.amount > 0 ? "+" : ""}
                  {l.amount}
                </span>
              </div>
            ))}
          </Group>

          <Group title={t("Specialists")}>
            {profile.verified ? (
              <div className="cell">
                <BadgeCheck size={20} className="verified" />
                <span className="label small">
                  {t("You are a verified specialist")}: {profile.specialty}
                </span>
              </div>
            ) : (
              <button className="cell" onClick={() => setVerifying(true)}>
                <ShieldCheck size={20} color="var(--primary)" />
                <span className="label small">
                  <strong>{t("Get verified as a specialist")}</strong>
                  <span className="tiny muted" style={{ display: "block" }}>
                    {t("SLPs, OTs, BCBAs, psychologists, special-ed teachers, doctors")}
                  </span>
                </span>
              </button>
            )}
          </Group>

          {(profile.is_moderator || profile.is_admin) && <Moderation admin={profile.is_admin} />}
          <SignOutButton />
        </div>
      </div>
      {verifying && <VerifySheet onClose={() => setVerifying(false)} />}
    </div>
  );
}

function VerifySheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { api } = useCommunity();
  const [r, setR] = useState({ profession: "", license_number: "", issuing_body: "", evidence_url: "" });
  const [error, setError] = useState("");
  const send = async () => {
    try {
      await api!.requestVerification(r);
      onClose();
      await tell(t("Thank you! An admin will check your details, usually within a few days."));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <Modal title={t("Get verified")} onClose={onClose} footer={<button className="btn primary" disabled={r.profession.length < 2} onClick={send}>{t("Send for review")}</button>}>
      <div className="stack">
        <p className="muted small">{t("Verified specialists get a blue check and extra points for answering questions. We check your registration with the official body.")}</p>
        <Field label={t("Profession")}>
          <input value={r.profession} onChange={(e) => setR({ ...r, profession: e.target.value })} placeholder={t("e.g. Speech-language pathologist")} autoFocus />
        </Field>
        <div className="grid-2">
          <Field label={t("Licence / registration number")}>
            <input value={r.license_number} onChange={(e) => setR({ ...r, license_number: e.target.value })} />
          </Field>
          <Field label={t("Issued by")}>
            <input value={r.issuing_body} onChange={(e) => setR({ ...r, issuing_body: e.target.value })} placeholder="ASHA, HCPC, AHPRA, BACB…" />
          </Field>
        </div>
        <Field label={t("Link to public register or profile")} hint={t("optional")}>
          <input value={r.evidence_url} onChange={(e) => setR({ ...r, evidence_url: e.target.value })} placeholder="https://" />
        </Field>
        {error && <p className="error">{error}</p>}
      </div>
    </Modal>
  );
}

function Moderation({ admin }: { admin: boolean }) {
  const { t, date } = useI18n();
  const { api } = useCommunity();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [requests, setRequests] = useState<VerificationItem[]>([]);
  const load = () => {
    void api!.reports().then(setReports);
    if (admin) void api!.verificationRequests().then(setRequests);
  };
  useEffect(load, [api]);
  const act = async (fn: () => Promise<void>) => {
    await fn();
    load();
  };
  return (
    <>
      <Group title={`${t("Reports to review")} (${reports.length})`}>
        {reports.length === 0 && (
          <div className="cell">
            <span className="label small muted">{t("Nothing to review.")}</span>
          </div>
        )}
        {reports.map((r) => (
          <div key={r.id} className="cell">
            <span className="label small">
              <strong>{r.reason}</strong>
              <span className="tiny muted" style={{ display: "block" }}>
                {date(r.created_at)} · “{r.excerpt.slice(0, 80)}”
              </span>
            </span>
            <button className="btn danger" onClick={() => act(() => api!.resolveReport(r.id, true))} title={t("Hide")}>
              <EyeOff size={15} />
            </button>
            <button className="btn" onClick={() => act(() => api!.resolveReport(r.id, false))} title={t("Keep")}>
              <Check size={15} />
            </button>
          </div>
        ))}
      </Group>
      {admin && (
        <Group title={`${t("Specialist requests")} (${requests.length})`}>
          {requests.map((r) => (
            <div key={r.id} className="cell">
              <span className="label small">
                <strong>
                  {r.display_name} · {r.profession}
                </strong>
                <span className="tiny muted" style={{ display: "block" }}>
                  {r.license_number} {r.issuing_body} {r.evidence_url}
                </span>
              </span>
              <button className="btn" onClick={() => act(() => api!.reviewVerification(r.id, true))} title={t("Approve")}>
                <Check size={15} />
              </button>
              <button className="btn danger" onClick={() => act(() => api!.reviewVerification(r.id, false))} title={t("Reject")}>
                <X size={15} />
              </button>
            </div>
          ))}
        </Group>
      )}
    </>
  );
}
