import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Flag, Heart, Trash2 } from "lucide-react";
import { refreshCommunity, useCommunity } from "../../community/state";
import type { Post, Reply } from "../../community/types";
import { useI18n } from "../../lib/i18n";
import { Field, Modal, ask, tell } from "../../components/ui";
import { AuthorAvatar, AuthorLine, timeAgo, usePrivacyCheck } from "./parts";

export function PostView() {
  const { t } = useI18n();
  const { id } = useParams();
  const nav = useNavigate();
  const { api, profile } = useCommunity();
  const [thread, setThread] = useState<{ post: Post; replies: Reply[] } | null>(null);
  const [text, setText] = useState("");
  const [reporting, setReporting] = useState<{ postId?: string; replyId?: string } | null>(null);
  const [error, setError] = useState("");
  const privacy = usePrivacyCheck();

  const load = () => void api?.thread(id!).then(setThread).catch((e) => setError(String(e.message ?? e)));
  useEffect(load, [api, id]);
  if (!api || !profile) return <Navigate to="/community" />;
  if (!thread) return <p className="muted">{error || t("Loading…")}</p>;
  const { post, replies } = thread;
  const mine = post.author.id === profile.id;

  const run = async (fn: () => Promise<void>) => {
    setError("");
    try {
      await fn();
      load();
      void refreshCommunity();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const send = () =>
    run(async () => {
      await api.reply(post.id, text.trim());
      setText("");
    });

  const sorted = [...replies].sort((a, b) => Number(b.id === post.accepted_reply_id) - Number(a.id === post.accepted_reply_id));

  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <button className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => nav(-1)}>
        <ArrowLeft size={16} /> {t("Community")}
      </button>
      <div className="card stack">
        <div className="row" style={{ gap: 12 }}>
          <AuthorAvatar a={post.author} />
          <div className="stack-sm" style={{ gap: 0 }}>
            <AuthorLine a={post.author} />
            <span className="tiny muted">{t(timeAgo(post.created_at))}</span>
          </div>
        </div>
        {post.kind === "question" && <span className={"badge " + (post.accepted_reply_id ? "ok" : "blue")} style={{ alignSelf: "flex-start" }}>{post.accepted_reply_id ? t("Answered") : t("Question for specialists")}</span>}
        <h1 style={{ fontSize: "1.7rem" }}>{post.title}</h1>
        <p style={{ whiteSpace: "pre-wrap", fontSize: "1.05rem" }}>{post.body}</p>
        <div className="row">
          {mine ? (
            <button className="btn danger" onClick={async () => (await ask(t("Delete your post?"))) && run(async () => { await api.deletePost(post.id); nav("/community"); })}>
              <Trash2 size={15} /> {t("Delete")}
            </button>
          ) : (
            <button className="btn ghost small" onClick={() => setReporting({ postId: post.id })}>
              <Flag size={15} /> {t("Report")}
            </button>
          )}
        </div>
      </div>

      <div className="section-title">
        {replies.length} {t(replies.length === 1 ? "reply" : "replies")}
      </div>
      {sorted.length > 0 && (
        <div className="group">
          {sorted.map((r) => {
            const accepted = r.id === post.accepted_reply_id;
            return (
              <div key={r.id} className={"reply" + (accepted ? " accepted" : "")} style={{ borderTop: "1px solid var(--separator)" }}>
                <div className="spread">
                  <span className="row" style={{ gap: 10 }}>
                    <AuthorAvatar a={r.author} size="sm" />
                    <AuthorLine a={r.author} extra={<span className="tiny muted">· {t(timeAgo(r.created_at))}</span>} />
                  </span>
                  {accepted && (
                    <span className="badge ok">
                      <CheckCircle2 size={13} /> {t("Most helpful")}
                    </span>
                  )}
                </div>
                <p style={{ whiteSpace: "pre-wrap" }}>{r.body}</p>
                <div className="row">
                  <button
                    className={"btn " + (r.voted ? "tinted" : "ghost")}
                    disabled={r.author.id === profile.id}
                    onClick={() => run(() => api.setHelpful(r.id, !r.voted))}
                    style={{ color: r.voted ? "var(--pink)" : undefined }}
                  >
                    <Heart size={15} fill={r.voted ? "currentColor" : "none"} /> {t("Helpful")} · {r.helpful_count}
                  </button>
                  {mine && post.kind === "question" && !post.accepted_reply_id && r.author.id !== profile.id && (
                    <button className="btn ghost" onClick={() => run(() => api.acceptAnswer(post.id, r.id))}>
                      <CheckCircle2 size={15} /> {t("Mark as most helpful")}
                    </button>
                  )}
                  {r.author.id !== profile.id && (
                    <button className="btn ghost small" onClick={() => setReporting({ replyId: r.id })}>
                      <Flag size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card stack-sm">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Write a kind, helpful reply…")} style={{ minHeight: 100 }} />
        {error && <p className="error">{error}</p>}
        <div className="spread">
          <span className="tiny muted">{t("Replies are support, not medical advice.")}</span>
          <button className="btn primary" disabled={!text.trim()} onClick={() => privacy.check(text, send)}>
            {t("Reply")}
          </button>
        </div>
      </div>
      {reporting && <ReportSheet target={reporting} onClose={() => setReporting(null)} />}
      {privacy.dialog}
    </div>
  );
}

function ReportSheet({ target, onClose }: { target: { postId?: string; replyId?: string }; onClose: () => void }) {
  const { t } = useI18n();
  const { api } = useCommunity();
  const [reason, setReason] = useState("");
  const reasons = ["Shares a child's private details", "Unkind or disrespectful", "Unsafe or harmful advice", "Spam or advertising"];
  const send = async () => {
    await api!.report(target, reason);
    onClose();
    await tell(t("Thank you. A moderator will look at it."));
  };
  return (
    <Modal title={t("Report")} onClose={onClose} footer={<button className="btn primary" disabled={reason.length < 3} onClick={send}>{t("Send report")}</button>}>
      <div className="stack">
        <div className="chips">
          {reasons.map((r) => (
            <button key={r} className="chip" aria-pressed={reason === t(r)} onClick={() => setReason(t(r))}>
              {t(r)}
            </button>
          ))}
        </div>
        <Field label={t("Or describe the problem")}>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      </div>
    </Modal>
  );
}
