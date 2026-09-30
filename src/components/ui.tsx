import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { isTauri } from "../lib/storage";
import type { Child } from "../lib/schema";
import { useData } from "../lib/store";

export function Page(props: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="page-head">
        <div className="stack-sm">
          <h1>{props.title}</h1>
          {props.subtitle && <p className="muted">{props.subtitle}</p>}
        </div>
        {props.actions && <div className="row no-print">{props.actions}</div>}
      </div>
      {props.children}
    </>
  );
}

export function Field(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>
        {props.label}
        {props.hint && <span className="hint"> · {props.hint}</span>}
      </span>
      {props.children}
    </label>
  );
}

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={id}>
        <header>
          <h2 id={id}>{props.title}</h2>
          <button className="btn ghost icon" onClick={props.onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="body">{props.children}</div>
        {props.footer && <footer>{props.footer}</footer>}
      </div>
    </div>
  );
}

export function Empty(props: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card empty">
      {props.icon}
      <h2>{props.title}</h2>
      {props.text && <p className="muted">{props.text}</p>}
      {props.action}
    </div>
  );
}

export function Chips<T extends string | number>(props: {
  options: { value: T; label: string }[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  label?: string;
}) {
  const selected = (v: T) => (Array.isArray(props.value) ? props.value.includes(v) : props.value === v);
  return (
    <div className="chips" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button type="button" key={String(o.value)} className="chip" aria-pressed={selected(o.value)} onClick={() => props.onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Free text with one-tap suggestions (previously used values). */
export function Suggest(props: { value: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string }) {
  const shown = props.suggestions.filter((s) => s !== props.value).slice(0, 8);
  return (
    <div className="stack-sm">
      <input value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} />
      {shown.length > 0 && (
        <div className="chips">
          {shown.map((s) => (
            <button type="button" key={s} className="chip" onClick={() => props.onChange(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Avatar({ child, size }: { child: Child; size?: "lg" }) {
  const { images } = useData();
  const cls = "avatar" + (size ? " " + size : "");
  const photo = child.photoId && images[child.photoId];
  if (photo) return <img className={cls} src={photo} alt="" />;
  return (
    <span className={cls} style={{ background: child.color }} aria-hidden>
      {child.firstName.slice(0, 1).toUpperCase()}
    </span>
  );
}

export async function ask(message: string): Promise<boolean> {
  if (isTauri) {
    const { confirm } = await import("@tauri-apps/plugin-dialog");
    return confirm(message, { kind: "warning" });
  }
  return window.confirm(message);
}

export async function tell(message: string) {
  if (isTauri) {
    const { message: show } = await import("@tauri-apps/plugin-dialog");
    await show(message);
  } else {
    window.alert(message);
  }
}
