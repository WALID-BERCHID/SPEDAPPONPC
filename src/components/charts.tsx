import { useI18n } from "../lib/i18n";

export interface Point {
  date: string;
  value: number;
}

/** Progress line chart with optional baseline and target lines. */
export function LineChart(props: { points: Point[]; target?: number | null; baseline?: number | null; max?: number; unit?: string; height?: number }) {
  const { date } = useI18n();
  const W = 520;
  const H = props.height ?? 220;
  const pad = { l: 44, r: 16, t: 18, b: 30 };
  const pts = [...props.points].sort((a, b) => a.date.localeCompare(b.date));
  const values = [...pts.map((p) => p.value), props.target ?? 0, props.baseline ?? 0];
  const max = props.max ?? Math.max(1, ...values) * 1.15;
  const x = (i: number) => pad.l + (pts.length < 2 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (pts.length - 1));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));
  const label = (i: number) => date(pts[i].date, { month: "short", day: "numeric" });
  const labelEvery = Math.max(1, Math.ceil(pts.length / 6));

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progress chart">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end">
            {t}
            {props.unit}
          </text>
        </g>
      ))}
      {props.baseline != null && (
        <line x1={pad.l} x2={W - pad.r} y1={y(props.baseline)} y2={y(props.baseline)} stroke="var(--muted)" strokeDasharray="4 4" />
      )}
      {props.target != null && (
        <>
          <line x1={pad.l} x2={W - pad.r} y1={y(props.target)} y2={y(props.target)} stroke="var(--accent)" strokeWidth={2} strokeDasharray="8 5" />
          <text x={W - pad.r} y={y(props.target) - 6} textAnchor="end" style={{ fill: "var(--accent)", fontWeight: 700 }}>
            Target
          </text>
        </>
      )}
      {pts.length > 1 && (
        <polyline
          fill="none"
          stroke="var(--primary)"
          strokeWidth={3}
          strokeLinejoin="round"
          points={pts.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
        />
      )}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={4.5} fill="var(--surface)" stroke="var(--primary)" strokeWidth={2.5}>
            <title>
              {label(i)}: {p.value}
              {props.unit}
            </title>
          </circle>
          {i % labelEvery === 0 && (
            <text x={x(i)} y={H - 8} textAnchor="middle">
              {label(i)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" width="100" height="30" aria-hidden>
      <polyline fill="none" stroke="var(--primary)" strokeWidth={2.5} points={pts} strokeLinejoin="round" />
    </svg>
  );
}

export function Bars({ data, max }: { data: [string, number][]; max?: number }) {
  const top = max ?? Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="bars">
      {data.map(([label, v]) => (
        <div className="bar-row" key={label}>
          <span title={label} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(v / top) * 100}%` }} />
          </div>
          <strong>{v}</strong>
        </div>
      ))}
    </div>
  );
}
