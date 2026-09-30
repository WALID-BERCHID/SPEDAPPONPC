import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import qrcode from "qrcode-generator";
import { levelFor } from "../../community/levels";
import { useCommunity } from "../../community/state";
import type { Certificate } from "../../community/types";
import { APP_NAME, VERIFY_URL } from "../../lib/app";
import { useI18n } from "../../lib/i18n";

function qrSvg(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
}

export function CertificateView() {
  const { t, date } = useI18n();
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { api } = useCommunity();
  const [c, setC] = useState<Certificate | null>((location.state as Certificate) ?? null);

  useEffect(() => {
    if (!c && api) void api.certificates().then((all) => setC(all.find((x) => x.id === id) ?? null));
  }, [api, id]);
  if (!c) return <p className="muted">{t("Loading…")}</p>;

  const url = `${VERIFY_URL}?code=${c.code}`;
  const lvl = levelFor(c.points).level;
  const roleText = c.verified && c.specialty ? c.specialty : t(c.role === "parent" ? "Parent / carer" : c.role === "teacher" ? "Teacher" : "Specialist");
  const preview = api?.mode === "preview";

  return (
    <div className="stack">
      <div className="row no-print">
        <button className="btn ghost" onClick={() => nav("/community?tab=rewards")}>
          <ArrowLeft size={16} /> {t("Rewards")}
        </button>
        <button className="btn primary" onClick={() => window.print()}>
          <Printer size={16} /> {t("Print or save as PDF")}
        </button>
      </div>
      {preview && <p className="notice no-print">{t("This is a preview certificate. Real certificates are issued once the community is live.")}</p>}
      <div className="certificate">
        <div className="stack-sm" style={{ alignItems: "center" }}>
          <span style={{ fontSize: "2.6rem" }}>{lvl.emoji}</span>
          <span style={{ letterSpacing: "0.3em", fontSize: "0.8rem", color: "#8a6d1d", fontFamily: "var(--font)" }}>{APP_NAME.toUpperCase()} COMMUNITY</span>
          <h1>{t("Certificate of Contribution")}</h1>
        </div>
        <div className="stack-sm" style={{ alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font)", color: "#555" }}>{t("This certifies that")}</span>
          <span className="name">{c.display_name}</span>
          <span style={{ fontFamily: "var(--font)", color: "#555" }}>
            {roleText}
            {c.verified ? ` · ${t("Verified specialist")}` : ""}
          </span>
          <p style={{ maxWidth: 560, marginTop: 8 }}>
            {t("has generously given their time and knowledge to support families, teachers and children with special needs, reaching the level of")} <strong>{t(lvl.name)}</strong>.
          </p>
        </div>
        <div className="stats">
          <div>
            <strong>{c.points}</strong>
            {t("points")}
          </div>
          <div>
            <strong>{c.answers}</strong>
            {t("answers")}
          </div>
          <div>
            <strong>{c.accepted}</strong>
            {t("most helpful")}
          </div>
          <div>
            <strong>{c.helpful}</strong>
            {t("helpful votes")}
          </div>
          {c.sessions > 0 && (
            <div>
              <strong>{c.sessions}</strong>
              {t("live sessions")}
            </div>
          )}
          {Number(c.hours) > 0 && (
            <div>
              <strong>{c.hours}</strong>
              {t("volunteer hours")}
            </div>
          )}
        </div>
        <div className="foot">
          <div style={{ textAlign: "start" }}>
            <div>
              {t("Issued")} {date(c.issued_at, { day: "numeric", month: "long", year: "numeric" })}
            </div>
            <div>
              {t("Certificate ID")}: <strong>{c.code}</strong>
            </div>
            <div>
              {t("Check it at")} {VERIFY_URL.replace(/^https:\/\//, "")}
            </div>
          </div>
          <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg(url) }} />
        </div>
      </div>
      <p className="tiny muted no-print">{t("This certificate records volunteer contribution in the community. It is not a professional qualification or continuing-education credit.")}</p>
    </div>
  );
}
