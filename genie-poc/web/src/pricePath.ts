/** Seeded 1M close series that lands on LTP. Distinct shape per scrip. */

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const REGIMES = [
  { drift: 0.0021, vol: 0.011, eventAt: 10, event: 0.028 },
  { drift: -0.0014, vol: 0.012, eventAt: 14, event: -0.032 },
  { drift: 0.0006, vol: 0.016, eventAt: 7, event: -0.048 },
  { drift: 0.0016, vol: 0.01, eventAt: 32, event: 0.022 },
  { drift: 0.0003, vol: 0.019, eventAt: 20, event: 0.04 },
  { drift: 0.0011, vol: 0.013, eventAt: 5, event: -0.021 },
  { drift: -0.0004, vol: 0.009, eventAt: 38, event: 0.018 },
  { drift: 0.0024, vol: 0.014, eventAt: 22, event: -0.026 },
] as const;

export function buildPricePath(symbol: string, last: number, n = 48): number[] {
  const rng = mulberry32(hash(symbol) + 17);
  const regime = REGIMES[hash(symbol) % REGIMES.length];
  const dp = last >= 1000 ? 1 : 2;
  const round = (x: number) => Math.round(x * 10 ** dp) / 10 ** dp;

  const raw = [1];
  for (let i = 0; i < n - 1; i++) {
    let r = regime.drift + regime.vol * gaussian(rng);
    if (i === regime.eventAt) r += regime.event;
    if (rng() < 0.07) r *= 0.12;
    r = Math.max(-0.055, Math.min(0.055, r));
    raw.push(Math.max(raw[raw.length - 1] * (1 + r), 0.35));
  }

  const scale = last / raw[raw.length - 1];
  return raw.map((v) => round(v * scale));
}

export function pathReturnPct(path: number[]) {
  if (!path.length) return 0;
  const a = path[0];
  const b = path[path.length - 1];
  if (!a) return 0;
  return Math.round(((b - a) / a) * 1000) / 10;
}
