// Mocked cash equity universe for Native screener / extra tabs. POC only.

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
  { symbol: "TCS", name: "Tata Consultancy", sector: "IT", ltp: 3921.0, pe: 28.4, pb: 12.8, roe: 45.1, changePct: 0.57 },
  { symbol: "INFY", name: "Infosys", sector: "IT", ltp: 1512.4, pe: 24.1, pb: 7.1, roe: 32.6, changePct: 1.27 },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "IT", ltp: 1548.2, pe: 22.8, pb: 5.4, roe: 38.4, changePct: 0.82 },
  { symbol: "WIPRO", name: "Wipro", sector: "IT", ltp: 498.6, pe: 19.2, pb: 3.2, roe: 16.4, changePct: -0.41 },
  { symbol: "PERSISTENT", name: "Persistent Systems", sector: "IT", ltp: 5412.0, pe: 42.3, pb: 11.6, roe: 31.2, changePct: 1.05 },
  { symbol: "TATAELXSI", name: "Tata Elxsi", sector: "IT", ltp: 6410.0, pe: 47.8, pb: 12.4, roe: 35.0, changePct: 0.33 },
  { symbol: "COFORGE", name: "Coforge", sector: "IT", ltp: 7125.0, pe: 35.6, pb: 8.9, roe: 22.1, changePct: -0.18 },
  { symbol: "LTIM", name: "LTIMindtree", sector: "IT", ltp: 5320.0, pe: 33.1, pb: 7.8, roe: 27.4, changePct: 0.21 },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "IT", ltp: 1624.0, pe: 21.6, pb: 4.6, roe: 18.9, changePct: 0.44 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banks", ltp: 708.25, pe: 18.2, pb: 2.8, roe: 16.8, changePct: 2.08 },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banks", ltp: 1248.5, pe: 17.4, pb: 3.1, roe: 17.9, changePct: 0.64 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banks", ltp: 812.55, pe: 9.8, pb: 1.4, roe: 15.2, changePct: 0.79 },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Banks", ltp: 1124.0, pe: 13.1, pb: 2.0, roe: 16.1, changePct: 0.91 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banks", ltp: 1788.0, pe: 16.4, pb: 2.5, roe: 13.8, changePct: -0.27 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Financials", ltp: 7120.0, pe: 29.4, pb: 6.2, roe: 22.6, changePct: 1.12 },
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", ltp: 1384.2, pe: 26.1, pb: 2.3, roe: 9.4, changePct: -0.61 },
  { symbol: "ONGC", name: "ONGC", sector: "Energy", ltp: 268.4, pe: 8.2, pb: 1.1, roe: 14.1, changePct: 0.38 },
  { symbol: "NTPC", name: "NTPC", sector: "Energy", ltp: 412.6, pe: 15.7, pb: 1.8, roe: 13.2, changePct: 0.55 },
  { symbol: "POWERGRID", name: "Power Grid", sector: "Energy", ltp: 328.1, pe: 17.9, pb: 2.6, roe: 17.4, changePct: 0.22 },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer", ltp: 2890.0, pe: 55.2, pb: 14.2, roe: 28.1, changePct: -0.22 },
  { symbol: "BRITANNIA", name: "Britannia", sector: "Consumer", ltp: 5480.0, pe: 44.6, pb: 32.1, roe: 52.3, changePct: 0.41 },
  { symbol: "NESTLEIND", name: "Nestlé India", sector: "Consumer", ltp: 2412.0, pe: 81.0, pb: 78.4, roe: 91.2, changePct: 0.12 },
  { symbol: "ITC", name: "ITC", sector: "Consumer", ltp: 492.3, pe: 26.8, pb: 7.6, roe: 28.4, changePct: -0.08 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "Consumer", ltp: 2588.0, pe: 58.4, pb: 11.8, roe: 21.7, changePct: -0.15 },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", ltp: 12480.0, pe: 27.2, pb: 4.4, roe: 16.5, changePct: 0.68 },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Auto", ltp: 2895.0, pe: 24.8, pb: 3.6, roe: 18.2, changePct: 1.41 },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", ltp: 978.5, pe: 11.4, pb: 2.7, roe: 22.8, changePct: -0.73 },
  { symbol: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma", ltp: 1722.0, pe: 38.6, pb: 6.1, roe: 16.9, changePct: 0.31 },
  { symbol: "TITAN", name: "Titan", sector: "Consumer", ltp: 3488.0, pe: 86.2, pb: 28.5, roe: 32.4, changePct: 0.19 },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", sector: "Materials", ltp: 11420.0, pe: 46.1, pb: 5.2, roe: 12.8, changePct: 0.52 },
];

function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function synthetic(symbol) {
  const h = hash32(String(symbol || "X").toUpperCase());
  const ltp = round(80 + (h % 9000) + (h % 100) / 10, 2);
  const pe = round(8 + (h % 700) / 10, 1);
  const pb = round(0.6 + (h % 250) / 10, 1);
  const roe = round(6 + (h % 400) / 10, 1);
  const changePct = round(((h % 501) - 250) / 100, 2);
  const sectors = ["IT", "Banks", "Energy", "Consumer", "Auto", "Pharma", "Materials", "Financials"];
  return {
    symbol: String(symbol || "").toUpperCase(),
    name: String(symbol || "").toUpperCase(),
    sector: sectors[h % sectors.length],
    ltp,
    pe,
    pb,
    roe,
    changePct,
  };
}

function enrich(row) {
  return { ...row, path: pathFor(row.symbol, row.ltp) };
}

export function findEquity(symbol) {
  const key = String(symbol || "").toUpperCase();
  const row = UNIVERSE.find((r) => r.symbol.toUpperCase() === key);
  return enrich(row || synthetic(key));
}

function parseSymbols(symbols) {
  if (!Array.isArray(symbols)) return [];
  return symbols
    .map((s) => String(s || "").toUpperCase().trim())
    .filter(Boolean);
}

function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28) || "list";
}

let watchSeq = 1;

function sortRows(rows, sortBy) {
  if (!sortBy) return rows;
  const dir = String(sortBy).endsWith("_desc") ? -1 : 1;
  let field = "pe";
  if (String(sortBy).startsWith("roe")) field = "roe";
  else if (String(sortBy).startsWith("pb")) field = "pb";
  else if (String(sortBy).startsWith("change")) field = "changePct";
  else if (String(sortBy).startsWith("ltp")) field = "ltp";
  else if (String(sortBy).startsWith("name")) {
    return [...rows].sort((a, b) => a.symbol.localeCompare(b.symbol) * dir);
  }
  return [...rows].sort((a, b) => ((a[field] ?? 0) - (b[field] ?? 0)) * dir);
}

export function screenEquities({
  peMax = null,
  peMin = null,
  pbMax = null,
  pbMin = null,
  roeMin = null,
  roeMax = null,
  sector = null,
  query = null,
  changePctMin = null,
  changePctMax = null,
  sortBy = null,
  limit = null,
  title = null,
} = {}) {
  const q = String(query || "").trim().toLowerCase();
  const sec = String(sector || "").trim().toLowerCase();
  let rows = UNIVERSE.filter((r) => {
    if (peMax != null && r.pe >= peMax) return false;
    if (peMin != null && r.pe <= peMin) return false;
    if (pbMax != null && r.pb >= pbMax) return false;
    if (pbMin != null && r.pb <= pbMin) return false;
    if (roeMin != null && r.roe <= roeMin) return false;
    if (roeMax != null && r.roe >= roeMax) return false;
    if (changePctMin != null && r.changePct < changePctMin) return false;
    if (changePctMax != null && r.changePct > changePctMax) return false;
    if (sec && !r.sector.toLowerCase().includes(sec) && !sec.includes(r.sector.toLowerCase())) return false;
    if (q && !`${r.symbol} ${r.name} ${r.sector}`.toLowerCase().includes(q)) return false;
    return true;
  });

  rows = sortRows(rows, sortBy);
  const cap = limit != null && Number(limit) > 0 ? Math.min(Number(limit), rows.length) : null;
  if (cap != null) rows = rows.slice(0, cap);
  rows = rows.map(enrich);

  const bits = [];
  if (peMax != null) bits.push(`PE < ${peMax}`);
  if (peMin != null) bits.push(`PE > ${peMin}`);
  if (pbMax != null) bits.push(`PB < ${pbMax}`);
  if (pbMin != null) bits.push(`PB > ${pbMin}`);
  if (roeMin != null) bits.push(`ROE > ${roeMin}%`);
  if (roeMax != null) bits.push(`ROE < ${roeMax}%`);
  if (changePctMin != null) bits.push(`chg ≥ ${changePctMin}%`);
  if (changePctMax != null) bits.push(`chg ≤ ${changePctMax}%`);
  if (sector) bits.push(sector);
  if (query) bits.push(`“${query}”`);
  if (sortBy === "pe_asc") bits.push("lowest PE first");
  if (sortBy === "pe_desc") bits.push("highest PE first");
  if (sortBy === "pb_asc") bits.push("lowest PB first");
  if (sortBy === "pb_desc") bits.push("highest PB first");
  if (sortBy === "roe_desc") bits.push("highest ROE first");
  if (sortBy === "roe_asc") bits.push("lowest ROE first");
  if (sortBy === "change_desc") bits.push("top gainers first");
  if (sortBy === "change_asc") bits.push("top losers first");
  if (cap != null) bits.push(`top ${cap}`);

  const label = title || "Screener";
  return {
    action: "add",
    count: rows.length,
    tab: {
      id: `screener-${slug(label)}-${watchSeq++}`,
      kind: "screener",
      title: label,
      closable: true,
      filterNote: bits.join(" · ") || "All names",
      rows,
    },
  };
}

export function workspaceTab(kind, { title = null, symbols = null } = {}) {
  if (kind === "watchlist" || kind === "watchlist_history") {
    const withPlots = kind === "watchlist_history";
    const names = parseSymbols(symbols);
    const rows = (names.length ? names : UNIVERSE.slice(0, 8).map((r) => r.symbol)).map((s) => findEquity(s));
    const label = title || (withPlots ? "Watchlist · plots" : names.length ? "Watchlist" : "Watchlist");
    return {
      action: "add",
      tab: {
        id: `wl-${watchSeq++}-${slug(label)}${withPlots ? "-plots" : ""}`,
        kind: withPlots ? "watchlist-history" : "watchlist",
        title: label,
        closable: true,
        rows,
      },
    };
  }
  if (kind === "performance") {
    const names = parseSymbols(symbols);
    const pick = names.length ? names : ["HDFCBANK", "RELIANCE", "TCS", "INFY", "ITC"];
    const label = title || "Performance";
    return {
      action: "add",
      tab: {
        id: `perf-${watchSeq++}-${slug(label)}`,
        kind: "performance",
        title: label,
        closable: true,
        rows: pick.map((s) => {
          const row = findEquity(s);
          const start = row.path[0];
          return { ...row, qty: s === "HDFCBANK" ? 40 : 15, pnlPct: round(((row.ltp - start) / start) * 100, 2) };
        }),
      },
    };
  }
  return { error: `Unknown tab kind ${kind}` };
}
