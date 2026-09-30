import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pause, Play } from "lucide-react";
import { useChild } from "../lib/childContext";
import { useI18n } from "../lib/i18n";
import { upsert } from "../lib/store";
import { speak } from "../lib/util";
import { Segmented } from "../components/ui";
import { HoldToExit, fullscreen } from "./Visual";

export const FEELINGS: [string, string][] = [
  ["😊", "happy"],
  ["😌", "calm"],
  ["🤩", "excited"],
  ["😴", "tired"],
  ["😟", "worried"],
  ["😢", "sad"],
  ["😠", "angry"],
  ["😨", "scared"],
];

const HELP: Record<string, string> = {
  worried: "Let's breathe slowly together.",
  sad: "Would you like a hug or a quiet break?",
  angry: "Let's take 5 big breaths.",
  scared: "You are safe. Let's breathe together.",
  tired: "Maybe it's time for a rest.",
};

type Sound = "rain" | "ocean" | "hum";

/** Soft background sounds made on the fly (no audio files needed). */
function startSound(kind: Sound): () => void {
  const ctx = new AudioContext();
  const len = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = kind === "rain" ? white : (last + 0.02 * white) / 1.02; // brown noise for ocean / hum
    d[i] = kind === "rain" ? white * 0.4 : last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = kind === "rain" ? "bandpass" : "lowpass";
  filter.frequency.value = kind === "rain" ? 1400 : kind === "ocean" ? 600 : 220;
  const gain = ctx.createGain();
  gain.gain.value = 0.35;
  if (kind === "ocean") {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.12;
    depth.gain.value = 0.25;
    lfo.connect(depth).connect(gain.gain);
    lfo.start();
  }
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
  return () => void ctx.close();
}

export function CalmCorner() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { child } = useChild();
  const [mode, setMode] = useState<"breathe" | "feelings" | "sounds" | "count">("breathe");
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [breaths, setBreaths] = useState(0);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [sound, setSound] = useState<Sound | null>(null);
  const [count, setCount] = useState(0);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => {
    void fullscreen(true);
    return () => {
      void fullscreen(false);
      stop.current?.();
    };
  }, []);

  useEffect(() => {
    if (mode !== "breathe") return;
    const i = setInterval(() => {
      setPhase((p) => {
        if (p === "out") setBreaths((b) => b + 1);
        return p === "in" ? "out" : "in";
      });
    }, 4000);
    return () => clearInterval(i);
  }, [mode]);

  const toggleSound = (s: Sound) => {
    stop.current?.();
    stop.current = null;
    if (sound === s) return setSound(null);
    stop.current = startSound(s);
    setSound(s);
  };

  const pickFeeling = (f: string) => {
    setFeeling(f);
    speak(`${t("I feel")} ${t(f)}`);
    if (child) upsert("feelings", { childId: child.id, at: new Date().toISOString(), feeling: f });
  };

  return (
    <div className="show calm" style={{ alignItems: "center" }}>
      <div className="spread" style={{ width: "100%" }}>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "breathe", label: t("Breathe") },
            { value: "feelings", label: t("How do I feel?") },
            { value: "sounds", label: t("Calm sounds") },
            { value: "count", label: t("Count to 10") },
          ]}
        />
        <HoldToExit onExit={() => nav(-1)} />
      </div>

      <div className="grow" style={{ display: "grid", placeItems: "center", width: "100%" }}>
        {mode === "breathe" && (
          <div className="stack" style={{ alignItems: "center", gap: 40 }}>
            <div className="breathe" style={{ transform: `scale(${phase === "in" ? 1 : 0.6})` }} />
            <h1 style={{ fontSize: "2.6rem" }}>{phase === "in" ? t("Breathe in…") : t("Breathe out…")}</h1>
            <p style={{ opacity: 0.75 }}>
              {breaths} {t("breaths")}
            </p>
          </div>
        )}

        {mode === "feelings" && (
          <div className="stack" style={{ alignItems: "center", gap: 28 }}>
            <h1>{t("How do you feel right now?")}</h1>
            <div className="feelings">
              {FEELINGS.map(([emoji, name]) => (
                <button key={name} aria-pressed={feeling === name} onClick={() => pickFeeling(name)}>
                  <span>{emoji}</span>
                  <span>{t(name)}</span>
                </button>
              ))}
            </div>
            {feeling && HELP[feeling] && (
              <button className="btn big" onClick={() => setMode("breathe")}>
                {t(HELP[feeling])}
              </button>
            )}
          </div>
        )}

        {mode === "sounds" && (
          <div className="feelings" style={{ width: "min(560px, 90vw)" }}>
            {(
              [
                ["🌧️", "rain", "Rain"],
                ["🌊", "ocean", "Ocean waves"],
                ["🫧", "hum", "Soft hum"],
              ] as const
            ).map(([emoji, s, label]) => (
              <button key={s} aria-pressed={sound === s} onClick={() => toggleSound(s)}>
                <span>{emoji}</span>
                <span className="row">
                  {sound === s ? <Pause size={16} /> : <Play size={16} />} {t(label)}
                </span>
              </button>
            ))}
          </div>
        )}

        {mode === "count" && (
          <button
            onClick={() => {
              const n = count >= 10 ? 0 : count + 1;
              setCount(n);
              if (n) speak(String(n));
            }}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", font: "inherit" }}
          >
            <div className="num" style={{ fontSize: "min(40vh, 16rem)", fontWeight: 700, lineHeight: 1 }}>
              {count || "👆"}
            </div>
            <p style={{ opacity: 0.75, fontSize: "1.3rem" }}>{count >= 10 ? t("Well done! Tap to start again.") : t("Tap to count")}</p>
          </button>
        )}
      </div>
    </div>
  );
}
