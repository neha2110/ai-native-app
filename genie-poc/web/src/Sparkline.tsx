import { useId } from "react";
import type { PathPoint } from "./types";

export default function Sparkline({
  points,
  series,
}: {
  points: PathPoint[];
  series: "spot" | "mtm";
}) {
  if (points.length < 2) return null;

  const vals = points.map((p) => (series === "spot" ? p.spot : p.mtm));
  const first = vals[0];
  const last = vals[vals.length - 1];
  const down = last < first;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 360;
  const h = 72;
  const padX = 8;
  const padY = 10;

  const dots = vals.map((v, i) => {
    const x = padX + (i / (vals.length - 1)) * (w - padX * 2);
    const y = padY + (1 - (v - min) / span) * (h - padY * 2);
    return { x, y, v, time: points[i].time };
  });
  const line = dots.map((d) => `${d.x},${d.y}`).join(" ");
  const fmt = (n: number) =>
    series === "mtm"
      ? `${n < 0 ? "−" : ""}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`
      : n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <div className={`spark ${down ? "down" : "up"}`}>
      <div className="spark-meta">
        <span>{series === "spot" ? "NIFTY since open" : "Book MTM since open"}</span>
        <span className={down ? "down" : "up"}>
          {fmt(first)} → {fmt(last)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="spark-svg" role="img" aria-label={series}>
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" />
        {dots.map((d) => (
          <circle key={d.time} cx={d.x} cy={d.y} r="3" fill="currentColor" />
        ))}
      </svg>
      <div className="spark-axis">
        {points.map((p) => (
          <span key={p.id}>{p.time}</span>
        ))}
      </div>
    </div>
  );
}

function toSmoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function PriceChart({
  values,
  size = "md",
}: {
  values: number[];
  size?: "sm" | "md";
}) {
  const gid = `pc-${useId().replace(/:/g, "")}`;
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = size === "sm" ? 176 : 360;
  const h = size === "sm" ? 52 : 112;
  const padX = 2;
  const padY = size === "sm" ? 6 : 10;
  const up = values[values.length - 1] >= values[0];
  const pts = values.map((v, i) => ({
    x: padX + (i / (values.length - 1)) * (w - padX * 2),
    y: padY + (1 - (v - min) / span) * (h - padY * 2),
  }));
  const line = toSmoothPath(pts);
  const last = pts[pts.length - 1];
  const firstY = padY + (1 - (values[0] - min) / span) * (h - padY * 2);
  const area = `${line} L ${last.x} ${h} L ${pts[0].x} ${h} Z`;
  const stroke = up ? "#16a34a" : "#dc2626";
  const fillTop = up ? "rgba(22,163,74,0.28)" : "rgba(220,38,38,0.24)";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`price-chart ${size} ${up ? "up" : "down"}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillTop} />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <line
        x1={padX}
        x2={w - padX}
        y1={firstY}
        y2={firstY}
        stroke="#d1d5db"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={size === "sm" ? 1.6 : 2} />
      <circle cx={last.x} cy={last.y} r={size === "sm" ? 2.2 : 3} fill={stroke} />
    </svg>
  );
}

export function MiniSpark({ values }: { values: number[] }) {
  return <PriceChart values={values} size="sm" />;
}
