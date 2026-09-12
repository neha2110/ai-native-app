// Mocked cash equity universe for App Copilot screener / extra tabs. POC only.

function round(x, dp = 2) {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}

function pathFor(symbol, last, n = 48) {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) h = Math.imul(h ^ symbol.charCodeAt(i), 16777619);
  h = h >>> 0;
  let a = (h + 17) | 0;
  const rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gaussian = () => {
    const u = Math.max(rng(), 1e-9);
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const regimes = [
    { drift: 0.0021, vol: 0.011, eventAt: 10, event: 0.028 },
    { drift: -0.0014, vol: 0.012, eventAt: 14, event: -0.032 },
    { drift: 0.0006, vol: 0.016, eventAt: 7, event: -0.048 },
    { drift: 0.0016, vol: 0.01, eventAt: 32, event: 0.022 },
    { drift: 0.0003, vol: 0.019, eventAt: 20, event: 0.04 },
    { drift: 0.0011, vol: 0.013, eventAt: 5, event: -0.021 },
    { drift: -0.0004, vol: 0.009, eventAt: 38, event: 0.018 },
    { drift: 0.0024, vol: 0.014, eventAt: 22, event: -0.026 },
  ];
  const regime = regimes[h % regimes.length];
  const dp = last >= 1000 ? 1 : 2;
  const raw = [1];
  for (let i = 0; i < n - 1; i++) {
    let r = regime.drift + regime.vol * gaussian();
    if (i === regime.eventAt) r += regime.event;
    if (rng() < 0.07) r *= 0.12;
    r = Math.max(-0.055, Math.min(0.055, r));
    raw.push(Math.max(raw[raw.length - 1] * (1 + r), 0.35));
  }
  const scale = last / raw[raw.length - 1];
  return raw.map((v) => round(v * scale, dp));
}

export const UNIVERSE = [
  { symbol: "TCS", name: "Tata Consultancy", sector: "IT", ltp: 3921.0, pe: 28.4, roe: 45.1, changePct: 0.57 },
  { symbol: "INFY", name: "Infosys", sector: "IT", ltp: 1512.4, pe: 24.1, roe: 32.6, changePct: 1.27 },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "IT", ltp: 1548.2, pe: 22.8, roe: 38.4, changePct: 0.82 },
  { symbol: "WIPRO", name: "Wipro", sector: "IT", ltp: 498.6, pe: 19.2, roe: 16.4, changePct: -0.41 },
  { symbol: "PERSISTENT", name: "Persistent Systems", sector: "IT", ltp: 5412.0, pe: 42.3, roe: 31.2, changePct: 1.05 },
  { symbol: "TATAELXSI", name: "Tata Elxsi", sector: "IT", ltp: 6410.0, pe: 47.8, roe: 35.0, changePct: 0.33 },
  { symbol: "COFORGE", name: "Coforge", sector: "IT", ltp: 7125.0, pe: 35.6, roe: 22.1, changePct: -0.18 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banks", ltp: 708.25, pe: 18.2, roe: 16.8, changePct: 2.08 },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banks", ltp: 1248.5, pe: 17.4, roe: 17.9, changePct: 0.64 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banks", ltp: 812.55, pe: 9.8, roe: 15.2, changePct: 0.79 },
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", ltp: 1384.2, pe: 26.1, roe: 9.4, changePct: -0.61 },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer", ltp: 2890.0, pe: 55.2, roe: 28.1, changePct: -0.22 },
  { symbol: "BRITANNIA", name: "Britannia", sector: "Consumer", ltp: 5480.0, pe: 44.6, roe: 52.3, changePct: 0.41 },
  { symbol: "NESTLEIND", name: "Nestlé India", sector: "Consumer", ltp: 2412.0, pe: 81.0, roe: 91.2, changePct: 0.12 },
  { symbol: "ITC", name: "ITC", sector: "Consumer", ltp: 492.3, pe: 26.8, roe: 28.4, changePct: -0.08 },
  { symbol: "LTIM", name: "LTIMindtree", sector: "IT", ltp: 5320.0, pe: 33.1, roe: 27.4, changePct: 0.21 },
];

function enrich(row) {
  return { ...row, path: pathFor(row.symbol, row.ltp) };
}

export function findEquity(symbol) {
  const row = UNIVERSE.find((r) => r.symbol.toUpperCase() === String(symbol || "").toUpperCase());
  return row ? enrich(row) : null;
}

export function screenEquities({ peMax = null, peMin = null, roeMin = null, roeMax = null, sector = null } = {}) {
  const rows = UNIVERSE.filter((r) => {
    if (peMax != null && r.pe >= peMax) return false;
    if (peMin != null && r.pe <= peMin) return false;
    if (roeMin != null && r.roe <= roeMin) return false;
    if (roeMax != null && r.roe >= roeMax) return false;
    if (sector && r.sector.toLowerCase() !== String(sector).toLowerCase()) return false;
    return true;
  }).map(enrich);

  const bits = [];
  if (peMax != null) bits.push(`PE < ${peMax}`);
  if (peMin != null) bits.push(`PE > ${peMin}`);
  if (roeMin != null) bits.push(`ROE > ${roeMin}%`);
  if (roeMax != null) bits.push(`ROE < ${roeMax}%`);
  if (sector) bits.push(sector);

  return {
    action: "add",
    count: rows.length,
    tab: {
      id: "screener",
      kind: "screener",
      title: "Screener",
      closable: true,
      filterNote: bits.join(" · ") || "All names",
      rows,
    },
  };
}

export function workspaceTab(kind) {
  if (kind === "watchlist" || kind === "watchlist_history") {
    const withPlots = kind === "watchlist_history";
    return {
      action: "add",
      tab: {
        id: withPlots ? "watchlist-history" : "watchlist",
        kind: withPlots ? "watchlist-history" : "watchlist",
        title: withPlots ? "Watchlist · plots" : "Watchlist",
        closable: true,
        rows: UNIVERSE.slice(0, 8).map(enrich),
      },
    };
  }
  if (kind === "performance") {
    const names = ["HDFCBANK", "RELIANCE", "TCS", "INFY", "ITC"];
    return {
      action: "add",
      tab: {
        id: "performance",
        kind: "performance",
        title: "Performance",
        closable: true,
        rows: names.map((s) => {
          const row = findEquity(s);
          const start = row.path[0];
          return { ...row, qty: s === "HDFCBANK" ? 40 : 15, pnlPct: round(((row.ltp - start) / start) * 100, 2) };
        }),
      },
    };
  }
  return { error: `Unknown tab kind ${kind}` };
}
