import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, BookHeart, ChevronLeft, ChevronRight, Play, Plus, Printer, Trash2, Volume2 } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import type { Story, StoryPage } from "../lib/schema";
import { remove, uid, upsert, useData } from "../lib/store";
import { speak } from "../lib/util";
import { Empty, Field, Page, ask } from "../components/ui";
import { Pic, PicturePicker } from "../components/PicturePicker";
import { HoldToExit, fullscreen } from "./Visual";

const page = (emoji: string, text: string): StoryPage => ({ id: uid(), emoji, text });

export const STORY_TEMPLATES: { title: string; pages: [string, string][] }[] = [
  {
    title: "Going to the dentist",
    pages: [
      ["🦷", "Sometimes I go to the dentist."],
      ["🧸", "I sit in the waiting room. I can play with my toy while I wait."],
      ["👋", "The dentist says hello. The dentist is kind."],
      ["🪑", "I sit in a big chair. It can move up and down."],
      ["🪞", "The dentist looks at my teeth with a little mirror."],
      ["🔟", "I open my mouth and count to 10."],
      ["⭐", "When it is finished, I might get a sticker!"],
      ["😁", "Going to the dentist keeps my teeth healthy."],
    ],
  },
  {
    title: "Fire drill at school",
    pages: [
      ["🏫", "Sometimes at school we have a fire drill."],
      ["🙉", "The alarm is very loud. I can cover my ears or wear my headphones."],
      ["🚶", "I line up with my class and follow my teacher."],
      ["🌳", "We walk outside together. We do not run."],
      ["⏳", "We wait outside until the teacher says it is OK."],
      ["🎉", "Then we go back inside. I did it!"],
    ],
  },
  {
    title: "When I feel angry",
    pages: [
      ["😠", "Sometimes I feel angry."],
      ["💛", "It is OK to feel angry. Everybody feels angry sometimes."],
      ["🌬️", "I can take 5 big, slow breaths."],
      ["🛋️", "I can squeeze my pillow or go to my calm place."],
      ["🙋", "I can tell a grown-up: \"I need a break.\""],
      ["😊", "When I am calm, I feel better."],
    ],
  },
  {
    title: "Getting a haircut",
    pages: [
      ["💇", "Today I will get a haircut."],
      ["🪑", "I sit in the chair."],
      ["🧥", "A cape goes around me. It keeps hair off my clothes."],
      ["✂️", "The scissors make a snip-snip sound. They will not hurt me."],
      ["🪞", "I can hold my toy and look in the mirror."],
      ["⭐", "All done! My hair looks great."],
    ],
  },
];

export function StoriesPage() {
  const { t } = useI18n();
  const data = useData();
  const { child } = useChild();
  const nav = useNavigate();
  const list = data.stories.filter((s) => s.childId === child!.id);

  const create = (tpl?: (typeof STORY_TEMPLATES)[number]) => {
    const s = upsert("stories", {
      childId: child!.id,
      title: tpl ? t(tpl.title) : t("New story"),
      pages: tpl ? tpl.pages.map(([e, txt]) => page(e, t(txt))) : [page("⭐", "")],
    });
    nav(`/stories/${s.id}`);
  };

  return (
    <Page
      title={t("Social stories")}
      subtitle={t("Short picture stories that explain new or hard situations.")}
      actions={
        <button className="btn primary" onClick={() => create()}>
          <Plus size={18} /> {t("New story")}
        </button>
      }
    >
      <div className="stack">
        {list.length === 0 && <Empty icon={<BookHeart size={48} />} title={t("No stories yet")} text={t("Start from a template below and change it to fit your child.")} />}
        {list.length > 0 && (
          <div className="grid">
            {list.map((s) => (
              <div key={s.id} className="card stack-sm">
                <div style={{ fontSize: "2.4rem" }}>{s.pages.slice(0, 4).map((p) => p.emoji).join(" ")}</div>
                <strong>{s.title}</strong>
                <span className="small muted">
                  {s.pages.length} {t("pages")}
                </span>
                <div className="row">
                  <button className="btn primary" onClick={() => nav(`/stories/${s.id}/read`)}>
                    <Play size={16} /> {t("Read")}
                  </button>
                  <button className="btn" onClick={() => nav(`/stories/${s.id}`)}>
                    {t("Edit")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="section-title">{t("Templates")}</div>
        <div className="grid">
          {STORY_TEMPLATES.map((tpl) => (
            <button key={tpl.title} className="card link stack-sm" onClick={() => create(tpl)}>
              <span style={{ fontSize: "1.8rem" }}>{tpl.pages.slice(0, 4).map((p) => p[0]).join(" ")}</span>
              <strong>{t(tpl.title)}</strong>
              <span className="small muted">
                {tpl.pages.length} {t("pages")}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Page>
  );
}

export function StoryEditor() {
  const { t } = useI18n();
  const { id } = useParams();
  const data = useData();
  const nav = useNavigate();
  const [s, setS] = useState<Story | undefined>(() => data.stories.find((x) => x.id === id));
  const [picking, setPicking] = useState<string | null>(null);
  if (!s) return null;

  const setPage = (pid: string, patch: Partial<StoryPage>) => setS({ ...s, pages: s.pages.map((p) => (p.id === pid ? { ...p, ...patch } : p)) });
  const move = (i: number, d: number) => {
    const pages = [...s.pages];
    [pages[i], pages[i + d]] = [pages[i + d], pages[i]];
    setS({ ...s, pages });
  };
  const save = (to: string) => {
    upsert("stories", s);
    nav(to);
  };
  const del = async () => {
    if (await ask(t("Delete this story?"))) {
      remove("stories", s.id);
      nav("/stories");
    }
  };

  return (
    <Page
      title={t("Edit story")}
      actions={
        <>
          <button className="btn danger" onClick={del} aria-label={t("Delete")}>
            <Trash2 size={18} />
          </button>
          <button className="btn" onClick={() => window.print()}>
            <Printer size={18} /> {t("Print")}
          </button>
          <button className="btn" onClick={() => save(`/stories/${s.id}/read`)}>
            <Play size={18} /> {t("Save and read")}
          </button>
          <button className="btn primary" onClick={() => save("/stories")}>
            {t("Save")}
          </button>
        </>
      }
    >
      <div className="stack">
        <Field label={t("Title")}>
          <input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} />
        </Field>
        {s.pages.map((p, i) => (
          <div key={p.id} className="card row" style={{ alignItems: "flex-start", flexWrap: "nowrap", gap: 14 }}>
            <span className="badge">{i + 1}</span>
            <button className="emoji-btn" style={{ width: 88, height: 88, fontSize: "2.8rem" }} onClick={() => setPicking(p.id)} aria-label={t("Choose picture")}>
              <Pic emoji={p.emoji} imageId={p.imageId} />
            </button>
            <textarea className="grow" value={p.text} onChange={(e) => setPage(p.id, { text: e.target.value })} placeholder={t("Write one short sentence, from the child's point of view.")} />
            <div className="stack-sm no-print" style={{ gap: 2 }}>
              <button className="btn ghost icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("Move up")}>
                <ArrowUp size={16} />
              </button>
              <button className="btn ghost icon" disabled={i === s.pages.length - 1} onClick={() => move(i, 1)} aria-label={t("Move down")}>
                <ArrowDown size={16} />
              </button>
              <button className="btn ghost icon" onClick={() => setS({ ...s, pages: s.pages.filter((x) => x.id !== p.id) })} aria-label={t("Remove")}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        <button className="btn tinted no-print" style={{ alignSelf: "flex-start" }} onClick={() => setS({ ...s, pages: [...s.pages, page("⭐", "")] })}>
          <Plus size={18} /> {t("Add page")}
        </button>
        <p className="small muted no-print">{t("Tip: describe what will happen and what the child can do, in positive words. Real photos of the place help a lot.")}</p>
      </div>
      {picking && (
        <PicturePicker
          onClose={() => setPicking(null)}
          onPick={(pic) => {
            setPage(picking, { emoji: pic.emoji, imageId: pic.imageId });
            setPicking(null);
          }}
        />
      )}
    </Page>
  );
}

export function StoryReader() {
  const { t } = useI18n();
  const { id } = useParams();
  const data = useData();
  const nav = useNavigate();
  const s = data.stories.find((x) => x.id === id);
  const [i, setI] = useState(0);

  useEffect(() => {
    void fullscreen(true);
    return () => void fullscreen(false);
  }, []);
  useEffect(() => {
    const p = s?.pages[i];
    if (p) speak(p.text);
  }, [i]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setI((x) => Math.min(x + 1, (s?.pages.length ?? 1) - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s]);

  if (!s || !s.pages.length) return null;
  const p = s.pages[i];
  return (
    <div className="show">
      <div className="spread">
        <h2>{s.title}</h2>
        <div className="row">
          <button className="btn" onClick={() => speak(p.text)}>
            <Volume2 size={18} /> {t("Read aloud")}
          </button>
          <HoldToExit onExit={() => nav("/stories")} />
        </div>
      </div>
      <div className="story-page" key={p.id}>
        <Pic className="pic" emoji={p.emoji} imageId={p.imageId} />
        <p>{p.text}</p>
      </div>
      <div className="spread">
        <button className="btn big" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ChevronLeft size={24} /> {t("Back")}
        </button>
        <div className="dots">
          {s.pages.map((x, j) => (
            <span key={x.id} className={j === i ? "on" : ""} />
          ))}
        </div>
        <button className="btn big primary" disabled={i === s.pages.length - 1} onClick={() => setI(i + 1)}>
          {t("Next")} <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
