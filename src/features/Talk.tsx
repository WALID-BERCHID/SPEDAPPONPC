import { useEffect, useState } from "react";
import { Delete, Maximize2, Pencil, Plus, Trash2, Volume2, X } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import type { BoardButton, TalkBoard } from "../lib/schema";
import { getData, remove, uid, upsert, useData } from "../lib/store";
import { speak } from "../lib/util";
import { Field, Modal, Page, Segmented, ask } from "../components/ui";
import { Pic, PicturePicker } from "../components/PicturePicker";
import { HoldToExit, fullscreen } from "./Visual";

// Colors loosely follow the Fitzgerald key used on many communication boards.
export const WORD_COLORS: Record<string, string> = {
  people: "#ffe066",
  actions: "#b7e4a7",
  describe: "#a5d8ff",
  social: "#ffc9de",
  things: "#ffd8a8",
  stop: "#ffb3b3",
  questions: "#d0bfff",
};

const b = (emoji: string, label: string, color: keyof typeof WORD_COLORS): BoardButton => ({ id: uid(), emoji, label, color: WORD_COLORS[color] });

export const CORE_WORDS = (): BoardButton[] => [
  b("🙋", "I", "people"),
  b("🤲", "want", "actions"),
  b("➕", "more", "describe"),
  b("✋", "stop", "stop"),
  b("🆘", "help", "social"),
  b("👍", "yes", "social"),
  b("👎", "no", "social"),
  b("🍽️", "eat", "actions"),
  b("🥤", "drink", "actions"),
  b("🚽", "toilet", "things"),
  b("🧸", "play", "actions"),
  b("✅", "all done", "stop"),
  b("🛋️", "break", "actions"),
  b("🏃", "go", "actions"),
  b("❤️", "like", "actions"),
  b("💔", "don't like", "stop"),
  b("🤕", "hurt", "describe"),
  b("😴", "tired", "describe"),
  b("😊", "happy", "describe"),
  b("😢", "sad", "describe"),
  b("👩", "Mom", "people"),
  b("👨", "Dad", "people"),
  b("🌳", "outside", "things"),
  b("❓", "what?", "questions"),
];

export function TalkPage() {
  const { t } = useI18n();
  const data = useData();
  const { child } = useChild();
  const boards = data.boards.filter((x) => x.childId === child!.id);
  const [boardId, setBoardId] = useState<string | null>(boards[0]?.id ?? null);
  const [sentence, setSentence] = useState<BoardButton[]>([]);
  const [editing, setEditing] = useState(false);
  const [editBtn, setEditBtn] = useState<BoardButton | null>(null);
  const [full, setFull] = useState(false);
  const board = boards.find((x) => x.id === boardId) ?? boards[0];

  useEffect(() => {
    if (!board && !getData().boards.some((x) => x.childId === child!.id)) {
      const created = upsert("boards", { childId: child!.id, title: t("Core words"), buttons: CORE_WORDS().map((w) => ({ ...w, label: t(w.label) })) });
      setBoardId(created.id);
    }
  }, [board, child]);
  useEffect(() => {
    void fullscreen(full);
  }, [full]);
  if (!board) return null;

  const tap = (w: BoardButton) => {
    if (editing) return setEditBtn(w);
    speak(w.label);
    setSentence((s) => [...s, w]);
  };
  const saveButton = (w: BoardButton) => {
    const exists = board.buttons.some((x) => x.id === w.id);
    upsert("boards", { ...board, buttons: exists ? board.buttons.map((x) => (x.id === w.id ? w : x)) : [...board.buttons, w] });
    setEditBtn(null);
  };
  const newBoard = () => {
    const created = upsert("boards", { childId: child!.id, title: t("New board"), buttons: [] });
    setBoardId(created.id);
    setEditing(true);
  };

  const content = (
    <div className="stack">
      <div className="sentence" aria-live="polite">
        <div className="row grow" style={{ flexWrap: "nowrap", gap: 14 }}>
          {sentence.length === 0 && <span className="muted">{t("Tap pictures to build a sentence")}</span>}
          {sentence.map((w, i) => (
            <div className="word" key={i}>
              <Pic emoji={w.emoji} imageId={w.imageId} />
              <span>{w.label}</span>
            </div>
          ))}
        </div>
        <button className="btn primary big" disabled={!sentence.length} onClick={() => speak(sentence.map((w) => w.label).join(" "))} aria-label={t("Speak sentence")}>
          <Volume2 size={24} />
        </button>
        <button className="btn big" disabled={!sentence.length} onClick={() => setSentence((s) => s.slice(0, -1))} aria-label={t("Delete last word")}>
          <Delete size={22} />
        </button>
        <button className="btn big" disabled={!sentence.length} onClick={() => setSentence([])} aria-label={t("Clear")}>
          <X size={22} />
        </button>
      </div>
      <div className="board">
        {board.buttons.map((w) => (
          <button key={w.id} style={{ background: w.color, outline: editing ? "3px dashed var(--primary)" : undefined }} onClick={() => tap(w)}>
            <Pic className="pic" emoji={w.emoji} imageId={w.imageId} />
            <span>{w.label}</span>
          </button>
        ))}
        {editing && (
          <button style={{ background: "var(--fill)", color: "var(--primary)" }} onClick={() => setEditBtn(b("⭐", "", "things"))}>
            <Plus size={36} />
            <span>{t("Add word")}</span>
          </button>
        )}
      </div>
    </div>
  );

  if (full) {
    return (
      <div className="show" style={{ overflowY: "auto" }}>
        <div className="spread">
          <h2>{board.title}</h2>
          <HoldToExit onExit={() => setFull(false)} />
        </div>
        {content}
      </div>
    );
  }

  return (
    <Page
      title={t("Talking board")}
      subtitle={t("Tap a picture to hear it. Build short sentences. Uses the voices built into your computer.")}
      actions={
        <>
          <button className={"btn" + (editing ? " primary" : "")} onClick={() => setEditing(!editing)}>
            <Pencil size={16} /> {editing ? t("Done editing") : t("Edit board")}
          </button>
          <button className="btn tinted" onClick={() => setFull(true)}>
            <Maximize2 size={16} /> {t("Full screen")}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="spread">
          <Segmented options={boards.map((x) => ({ value: x.id, label: x.title }))} value={board.id} onChange={setBoardId} label={t("Boards")} />
          <div className="row">
            {editing && (
              <>
                <input value={board.title} onChange={(e) => upsert("boards", { ...board, title: e.target.value })} style={{ width: 200 }} aria-label={t("Board name")} />
                {boards.length > 1 && (
                  <button
                    className="btn danger"
                    onClick={async () => {
                      if (await ask(t("Delete this board?"))) {
                        remove("boards", board.id);
                        setBoardId(null);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </>
            )}
            <button className="btn" onClick={newBoard}>
              <Plus size={16} /> {t("New board")}
            </button>
          </div>
        </div>
        {content}
        <p className="small muted">{t("This is a simple practice board. It does not replace a speech device or advice from a speech-language therapist.")}</p>
      </div>
      {editBtn && <ButtonEditor button={editBtn} board={board} onSave={saveButton} onClose={() => setEditBtn(null)} />}
    </Page>
  );
}

function ButtonEditor(props: { button: BoardButton; board: TalkBoard; onSave: (b: BoardButton) => void; onClose: () => void }) {
  const { t } = useI18n();
  const [w, setW] = useState(props.button);
  const [picking, setPicking] = useState(false);
  const exists = props.board.buttons.some((x) => x.id === w.id);
  return (
    <Modal
      title={exists ? t("Edit word") : t("Add word")}
      onClose={props.onClose}
      footer={
        <>
          {exists && (
            <button className="btn danger" onClick={() => { upsert("boards", { ...props.board, buttons: props.board.buttons.filter((x) => x.id !== w.id) }); props.onClose(); }}>
              {t("Remove")}
            </button>
          )}
          <button className="btn primary" disabled={!w.label.trim()} onClick={() => props.onSave(w)}>
            {t("Save")}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="row" style={{ gap: 16 }}>
          <button className="emoji-btn" style={{ width: 96, height: 96, fontSize: "3rem", background: w.color }} onClick={() => setPicking(true)}>
            <Pic emoji={w.emoji} imageId={w.imageId} />
          </button>
          <Field label={t("Word")}>
            <input value={w.label} onChange={(e) => setW({ ...w, label: e.target.value })} autoFocus />
          </Field>
        </div>
        <Field label={t("Color")}>
          <div className="row">
            {Object.entries(WORD_COLORS).map(([k, c]) => (
              <button key={k} type="button" aria-label={t(k)} aria-pressed={w.color === c} onClick={() => setW({ ...w, color: c })} style={{ width: 34, height: 34, borderRadius: 10, background: c, border: w.color === c ? "3px solid var(--text)" : "none", cursor: "pointer" }} />
            ))}
          </div>
        </Field>
      </div>
      {picking && <PicturePicker onClose={() => setPicking(false)} onPick={(p) => { setW({ ...w, emoji: p.emoji, imageId: p.imageId }); setPicking(false); }} />}
    </Modal>
  );
}
