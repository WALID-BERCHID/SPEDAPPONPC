import { useEffect, useId, type ReactNode } from "react";
import { Search, X } from "lucide-react";
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

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className={"modal" + (props.wide ? " wide" : "")} role="dialog" aria-modal="true" aria-labelledby={id}>
        <header>
          <h2 id={id}>{props.title}</h2>
          <button className="btn ghost icon" onClick={props.onClose} aria-label="Close">
            <X size={18} />
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

export function Avatar({ child, size }: { child: Child; size?: "sm" | "lg" }) {
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

export function Switch(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" className="switch" aria-checked={props.checked} aria-label={props.label} onClick={() => props.onChange(!props.checked)} />;
}

export function Segmented<T extends string | number>(props: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; full?: boolean; label?: string }) {
  return (
    <div className={"segmented" + (props.full ? " full" : "")} role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button type="button" key={String(o.value)} aria-pressed={props.value === o.value} onClick={() => props.onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Colored rounded-square icon, like iOS Settings. */
export function Tile(props: { color: string; children: ReactNode; size?: "lg" | "xl" }) {
  return (
    <span className={"tile" + (props.size ? " " + props.size : "")} style={{ background: props.color }} aria-hidden>
      {props.children}
    </span>
  );
}

/** iOS-style grouped list. */
export function Group(props: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <div className="stack-sm" style={{ gap: 6 }}>
      {props.title && <div className="section-title" style={{ marginBottom: 2 }}>{props.title}</div>}
      <div className="group">{props.children}</div>
      {props.footer && <p className="tiny muted" style={{ padding: "0 16px" }}>{props.footer}</p>}
    </div>
  );
}

export function Cell(props: { icon?: ReactNode; label: ReactNode; detail?: ReactNode; children?: ReactNode; onClick?: () => void }) {
  const inner = (
    <>
      {props.icon}
      <span className="label">
        {props.label}
        {props.detail && <span className="tiny muted" style={{ display: "block" }}>{props.detail}</span>}
      </span>
      {props.children}
    </>
  );
  return props.onClick ? (
    <button type="button" className={"cell" + (props.icon ? " indent" : "")} onClick={props.onClick}>
      {inner}
    </button>
  ) : (
    <div className={"cell" + (props.icon ? " indent" : "")}>{inner}</div>
  );
}

/** Circular progress ring (0–1). */
export function Ring(props: { value: number; size?: number; label?: ReactNode; color?: string; track?: string }) {
  const size = props.size ?? 72;
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="ring" role="img" aria-label={`${Math.round(props.value * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={props.track ?? "var(--fill)"} strokeWidth={7} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={props.color ?? "var(--green)"}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, props.value)))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.2,0.8,0.2,1)" }}
      />
      {props.label != null && (
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size / 4.2} style={{ fill: "currentColor" }}>
          {props.label}
        </text>
      )}
    </svg>
  );
}

export function SearchBox(props: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="search" style={{ display: "block" }}>
      <Search size={16} />
      <input type="search" value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} />
    </label>
  );
}
