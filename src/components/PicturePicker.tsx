import { Camera } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { addImage, useData } from "../lib/store";
import { resizeImage } from "../lib/util";
import { Modal } from "./ui";

export const EMOJI =
  "☀️ 🌙 🚽 🧼 🪥 🛁 🚿 👕 👖 🧦 👟 🧥 🎒 🥣 🍎 🥪 🍽️ 🥤 💊 🚌 🚗 🏫 🏠 🛏️ 📖 📚 ✏️ 📝 🔢 🎨 🎵 🧩 🧸 ⚽ 🛝 🏊 🚶 📱 📺 🎮 🤫 🙌 👋 🤝 🧘 🫧 ⏰ ⭐ 🎉 👍 👎 ✋ 🧑‍⚕️ 🦷 💇 🛒 🌳 🐶 🍪 🍕 🧃 💤 😊 😢 😠 😨 😴 🤗 ❤️ 🙋 🆘 ✅ ➕ 🔟 🪑 🪞 ✂️ 🙉 🌬️ 🛋️ 👩 👨 👧 👦 🧑‍🏫 🚂 🦖".split(" ");

/** Renders a step's picture: the user's photo if set, otherwise the emoji. */
export function Pic(props: { emoji: string; imageId?: string; className?: string }) {
  const { images } = useData();
  const src = props.imageId && images[props.imageId];
  return src ? <img className={props.className} src={src} alt="" /> : <span className={props.className}>{props.emoji}</span>;
}

export function PicturePicker(props: { onPick: (p: { emoji: string; imageId?: string }) => void; onClose: () => void }) {
  const { t } = useI18n();
  const photo = () => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    input.onchange = async () => {
      const f = input.files?.[0];
      if (f) props.onPick({ emoji: "🖼️", imageId: addImage(await resizeImage(f)) });
    };
    input.click();
  };
  return (
    <Modal title={t("Choose picture")} onClose={props.onClose}>
      <div className="stack">
        <button className="btn tinted" onClick={photo}>
          <Camera size={18} /> {t("Use a photo from this computer")}
        </button>
        <div className="emoji-grid">
          {EMOJI.map((e) => (
            <button key={e} className="emoji-btn" onClick={() => props.onPick({ emoji: e })}>
              {e}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
