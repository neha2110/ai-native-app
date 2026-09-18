// ---------------------------------------------------------------------------
// Mocked NIFTY F&O market: random-walk spot, Black-Scholes option chain,
// a seeded trader book, scenario engine, and draft-order tickets.
// All numbers are simulated — POC only.
// ---------------------------------------------------------------------------

import { findEquity } from "./screener.mjs";

export const LOT_SIZE = 75;
const RISK_FREE = 0.065;
const STRIKE_STEP = 50;

// Expiry: next Tuesday from "now", at 15:30 IST.
function nextExpiry() {
  const d = new Date();
  const day = d.getDay(); // 0 Sun ... 2 Tue
  let add = (2 - day + 7) % 7;
  if (add === 0 && d.getHours() >= 16) add = 7;
  const e = new Date(d);
  e.setDate(d.getDate() + add);
  e.setHours(15, 30, 0, 0);
  return e;
}

export const state = {
  spot: 23398.1,
  dayOpen: 23477.8,
  prevClose: 23477.8,
  bankSpot: 56606.55,
  bankPrevClose: 56471.95,
  vix: 14.2,
  vixPrev: 14.35,
  expiry: nextExpiry(),
  availableMargin: 480000,
  positions: [],
  orders: [],
  nextOrderId: 1,
  clockId: "0915",
  morning: null,
};

export function yearsToExpiry() {
  const ms = state.expiry.getTime() - Date.now();
  return Math.max(ms, 12 * 3600 * 1000) / (365 * 24 * 3600 * 1000);
}

export function daysToExpiry() {
  return Math.max(0.5, (state.expiry.getTime() - Date.now()) / (24 * 3600 * 1000));
}

// --- Black-Scholes ---------------------------------------------------------

function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function normPdf(x) {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
}

export function bsPrice(kind, spot, strike, tYears, iv, r = RISK_FREE) {
  if (tYears <= 0) {
    return kind === "CE" ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0);
  }
  const sq = iv * Math.sqrt(tYears);
  const d1 = (Math.log(spot / strike) + (r + (iv * iv) / 2) * tYears) / sq;
  const d2 = d1 - sq;
  if (kind === "CE") {
    return spot * normCdf(d1) - strike * Math.exp(-r * tYears) * normCdf(d2);
  }
  return strike * Math.exp(-r * tYears) * normCdf(-d2) - spot * normCdf(-d1);
}

export function bsGreeks(kind, spot, strike, tYears, iv, r = RISK_FREE) {
  const sq = iv * Math.sqrt(tYears);
  const d1 = (Math.log(spot / strike) + (r + (iv * iv) / 2) * tYears) / sq;
  const d2 = d1 - sq;
  const delta = kind === "CE" ? normCdf(d1) : normCdf(d1) - 1;
  const gamma = normPdf(d1) / (spot * sq);
  const thetaYear =
    (-spot * normPdf(d1) * iv) / (2 * Math.sqrt(tYears)) -
    (kind === "CE"
      ? r * strike * Math.exp(-r * tYears) * normCdf(d2)
      : -r * strike * Math.exp(-r * tYears) * normCdf(-d2));
  const vega = (spot * normPdf(d1) * Math.sqrt(tYears)) / 100; // per 1 vol pt
  return {
    delta: round(delta, 2),
    gamma: round(gamma, 4),
    theta: round(thetaYear / 365, 1), // per day
    vega: round(vega, 1),
  };
}

// IV smile: base VIX with a gentle skew away from ATM.
export function ivFor(strike, spot = state.spot, vix = state.vix) {
  const dist = Math.abs(strike - spot) / spot;
  return (vix + dist * 55) / 100;
}

export function futuresPrice(spot = state.spot) {
  return spot * Math.exp(RISK_FREE * yearsToExpiry());
}

function round(x, dp = 2) {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}

// Deterministic pseudo-random per strike so OI is stable between ticks.
function seededRand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// --- Seeded trader book ----------------------------------------------------
// Thesis: I expect NIFTY to rise, but I'm willing to give up gains above
// ~23,600 in exchange for protection against a large fall below ~23,000.
// Long 1L futures (the rise), short 23600 CE (the cap), long 23000 PE (the floor).

function atmStrike(spot = state.spot) {
  return Math.round(spot / STRIKE_STEP) * STRIKE_STEP;
}

export function seedBook() {
  state.positions = [
    {
      id: "P1",
      instrument: "NIFTY FUT",
      kind: "FUT",
      strike: null,
      side: "BUY",
      lots: 1,
      avgPrice: round(state.dayOpen + 45, 1),
      openedAt: "3 days ago",
    },
    {
      id: "P2",
      instrument: "NIFTY 23600 CE",
      kind: "CE",
      strike: 23600,
      side: "SELL",
      lots: 1,
      avgPrice: round(bsPrice("CE", state.dayOpen, 23600, yearsToExpiry() + 3 / 365, ivFor(23600, state.dayOpen)) + 12, 1),
      openedAt: "3 days ago",
    },
    {
      id: "P3",
      instrument: "NIFTY 23000 PE",
      kind: "PE",
      strike: 23000,
      side: "BUY",
      lots: 1,
      avgPrice: round(bsPrice("PE", state.dayOpen, 23000, yearsToExpiry() + 5 / 365, ivFor(23000, state.dayOpen)) + 4, 1),
      openedAt: "5 days ago",
    },
  ];
}

export function legLtp(leg, spot = state.spot) {
  if (leg.kind === "EQ") return round(leg.ltp ?? leg.avgPrice ?? leg.entryPrice ?? 0, 1);
  if (leg.kind === "FUT") return round(futuresPrice(spot), 1);
  return round(Math.max(bsPrice(leg.kind, spot, leg.strike, yearsToExpiry(), ivFor(leg.strike, spot)), 0.05), 1);
}

export function legMtm(leg, spot = state.spot) {
  const ltp = legLtp(leg, spot);
  const sign = leg.side === "BUY" ? 1 : -1;
  if (leg.kind === "EQ") return round(sign * (ltp - leg.avgPrice) * (leg.qty || 1), 0);
  return round(sign * (ltp - leg.avgPrice) * leg.lots * LOT_SIZE, 0);
}

export function positionsView() {
  return state.positions.map((leg) => {
    const ltp = legLtp(leg);
    const greeks =
      leg.kind === "FUT"
        ? { delta: leg.side === "BUY" ? 1 : -1, gamma: 0, theta: 0, vega: 0 }
        : leg.kind === "EQ"
          ? { delta: 0, gamma: 0, theta: 0, vega: 0 }
          : bsGreeks(leg.kind, state.spot, leg.strike, yearsToExpiry(), ivFor(leg.strike));
    const exposureSign = leg.side === "BUY" ? 1 : -1;
    return {
      ...leg,
      ltp,
      mtm: legMtm(leg),
      greeks: {
        ...greeks,
        delta: round(greeks.delta * exposureSign * leg.lots * LOT_SIZE, 0), // position delta in units
      },
    };
  });
}

export function marketSnapshot() {
  const chg = round(state.spot - state.prevClose, 2);
  const positions = positionsView();
  const totalMtm = positions.reduce((s, p) => s + p.mtm, 0);
  const netDelta = positions.reduce((s, p) => s + p.greeks.delta, 0);
  const usedMargin = estimateMargin(state.positions);
  return {
    index: "NIFTY 50",
    spot: round(state.spot, 2),
    change: chg,
    changePct: round((chg / state.prevClose) * 100, 2),
    futures: round(futuresPrice(), 1),
    vix: round(state.vix, 1),
    expiry: state.expiry.toDateString(),
    daysToExpiry: round(daysToExpiry(), 1),
    lotSize: LOT_SIZE,
    totalMtm: round(totalMtm, 0),
    netDeltaUnits: round(netDelta, 0),
    availableMargin: state.availableMargin,
    usedMargin,
    asOf: new Date().toISOString(),
    note: "Simulated data — POC",
  };
}

export function optionQuote(kind, strike, spot = state.spot) {
  const t = yearsToExpiry();
  const iv = ivFor(strike, spot);
  const ltp = round(Math.max(bsPrice(kind, spot, strike, t, iv), 0.05), 1);
  const prev = round(Math.max(bsPrice(kind, state.prevClose, strike, t, ivFor(strike, state.prevClose)), 0.05), 1);
  const change = round(ltp - prev, 1);
  return {
    ltp,
    change,
    changePct: round((change / prev) * 100, 2),
  };
}

export function watchlistView() {
  const atm = atmStrike();
  const fut = futuresPrice();
  const futPrev = futuresPrice(state.prevClose);
  const futChg = round(fut - futPrev, 1);
  const niftyChg = round(state.spot - state.prevClose, 2);
  const bankChg = round(state.bankSpot - state.bankPrevClose, 2);
  const vixChg = round(state.vix - state.vixPrev, 2);
  const shortCall = atm + 200;
  const hedgePut = atm - 400;
  const atmCe = optionQuote("CE", atm);
  const shortCe = optionQuote("CE", shortCall);
  const longPe = optionQuote("PE", hedgePut);

  return {
    items: [
      {
        symbol: "NIFTY 50",
        kind: "INDEX",
        ltp: round(state.spot, 2),
        change: niftyChg,
        changePct: round((niftyChg / state.prevClose) * 100, 2),
        note: "Underlying",
      },
      {
        symbol: "BANKNIFTY",
        kind: "INDEX",
        ltp: round(state.bankSpot, 2),
        change: bankChg,
        changePct: round((bankChg / state.bankPrevClose) * 100, 2),
        note: "Watching beta",
      },
      {
        symbol: "NIFTY FUT",
        kind: "FUT",
        ltp: fut,
        change: futChg,
        changePct: round((futChg / futPrev) * 100, 2),
        note: "In book · long 1L",
      },
      {
        symbol: "INDIA VIX",
        kind: "VIX",
        ltp: round(state.vix, 2),
        change: vixChg,
        changePct: round((vixChg / state.vixPrev) * 100, 2),
        note: "Vol",
      },
      {
        symbol: `NIFTY ${atm} CE`,
        kind: "OPT",
        ltp: atmCe.ltp,
        change: atmCe.change,
        changePct: atmCe.changePct,
        note: "ATM call",
      },
      {
        symbol: `NIFTY ${shortCall} CE`,
        kind: "OPT",
        ltp: shortCe.ltp,
        change: shortCe.change,
        changePct: shortCe.changePct,
        note: "In book · short 1L",
      },
      {
        symbol: `NIFTY ${hedgePut} PE`,
        kind: "OPT",
        ltp: longPe.ltp,
        change: longPe.change,
        changePct: longPe.changePct,
        note: "In book · long 1L",
      },
    ],
  };
}

export function optionChain(width = 8) {
  const atm = atmStrike();
  const rows = [];
  for (let i = -width; i <= width; i++) {
    const strike = atm + i * STRIKE_STEP;
    const t = yearsToExpiry();
    const iv = ivFor(strike);
    const ce = {
      ltp: round(Math.max(bsPrice("CE", state.spot, strike, t, iv), 0.05), 1),
      iv: round(iv * 100, 1),
      oi: Math.round(20000 + seededRand(strike) * 90000) * 25,
      oiChgPct: round((seededRand(strike * 7) - 0.45) * 30, 1),
      ...bsGreeks("CE", state.spot, strike, t, iv),
    };
    const pe = {
      ltp: round(Math.max(bsPrice("PE", state.spot, strike, t, iv), 0.05), 1),
      iv: round(iv * 100, 1),
      oi: Math.round(20000 + seededRand(strike * 3) * 90000) * 25,
      oiChgPct: round((seededRand(strike * 11) - 0.55) * 30, 1),
      ...bsGreeks("PE", state.spot, strike, t, iv),
    };
    rows.push({ strike, isAtm: strike === atm, ce, pe });
  }
  return { spot: round(state.spot, 2), atm, expiry: state.expiry.toDateString(), rows };
}

// --- Scenario engine -------------------------------------------------------

export function computeScenario({ spotChangePoints = 0, spotChangePct = 0, daysForward = 0, ivChangePts = 0 }) {
  const newSpot = state.spot + spotChangePoints + (state.spot * spotChangePct) / 100;
  const tNow = yearsToExpiry();
  const tScen = Math.max(tNow - daysForward / 365, 0.25 / 365);
  const legs = state.positions.map((leg) => {
    const now = legLtp(leg);
    let scen;
    if (leg.kind === "FUT") {
      scen = round(newSpot * Math.exp(RISK_FREE * tScen), 1);
    } else {
      const iv = Math.max(ivFor(leg.strike, newSpot) + ivChangePts / 100, 0.05);
      scen = round(Math.max(bsPrice(leg.kind, newSpot, leg.strike, tScen, iv), 0.05), 1);
    }
    const sign = leg.side === "BUY" ? 1 : -1;
    const pnlChange = round(sign * (scen - now) * leg.lots * LOT_SIZE, 0);
    return {
      instrument: leg.instrument,
      side: leg.side,
      lots: leg.lots,
      priceNow: now,
      priceScenario: scen,
      pnlChange,
    };
  });
  const total = legs.reduce((s, l) => s + l.pnlChange, 0);
  return {
    scenario: {
      spotNow: round(state.spot, 2),
      spotScenario: round(newSpot, 2),
      daysForward,
      ivChangePts,
    },
    legs,
    totalPnlChange: round(total, 0),
    currentMtm: round(state.positions.reduce((s, p) => s + legMtm(p), 0), 0),
    note: "Simulated repricing via Black-Scholes — POC",
  };
}

// --- Margin + payoff helpers ----------------------------------------------

function estimateMargin(legs) {
  // Rough SPAN-like estimate: futures & short options ~₹1.15L/lot, long options = premium.
  let margin = 0;
  for (const leg of legs) {
    if (leg.kind === "EQ") {
      margin += (leg.entryPrice || 0) * (leg.qty || 1);
      continue;
    }
    if (leg.kind === "FUT" || leg.side === "SELL") {
      margin += 115000 * leg.lots;
    } else {
      margin += legLtp(leg) * leg.lots * LOT_SIZE;
    }
  }
  return Math.round(margin);
}

function payoffAtExpiry(legs, spotAtExpiry) {
  let pnl = 0;
  for (const leg of legs) {
    const sign = leg.side === "BUY" ? 1 : -1;
    let value;
    if (leg.kind === "FUT") value = spotAtExpiry;
    else if (leg.kind === "CE") value = Math.max(spotAtExpiry - leg.strike, 0);
    else value = Math.max(leg.strike - spotAtExpiry, 0);
    const entry = leg.kind === "FUT" ? leg.entryPrice : leg.entryPrice;
    pnl += sign * (value - entry) * leg.lots * LOT_SIZE;
  }
  return pnl;
}

// --- Draft orders (human-gated) --------------------------------------------

export function draftOrder({ legs, rationale = "", label = "", origin = "ask" }) {
  const atm = atmStrike();
  const priced = legs.map((l, i) => {
    const kind = l.kind;
    const strike = kind === "FUT" ? null : l.strike;
    const leg = { kind, strike, side: l.side, lots: l.lots };
    const price = legLtp(leg);
    return {
      id: `L${i + 1}`,
      instrument: kind === "FUT" ? "NIFTY FUT" : `NIFTY ${strike} ${kind}`,
      kind,
      strike,
      side: l.side,
      lots: l.lots,
      entryPrice: price,
      orderType: "LIMIT",
    };
  });

  // Numeric payoff scan for the NEW legs only.
  const lo = state.spot * 0.85;
  const hi = state.spot * 1.15;
  let maxP = -Infinity;
  let maxL = Infinity;
  for (let s = lo; s <= hi; s += 25) {
    const p = payoffAtExpiry(priced, s);
    if (p > maxP) maxP = p;
    if (p < maxL) maxL = p;
  }
  const edgeUp = payoffAtExpiry(priced, hi) - payoffAtExpiry(priced, hi - 25);
  const edgeDn = payoffAtExpiry(priced, lo + 25) - payoffAtExpiry(priced, lo);
  const unboundedProfit = (edgeUp > 1 && payoffAtExpiry(priced, hi) === maxP) || (edgeDn < -1 && payoffAtExpiry(priced, lo) === maxP);
  const unboundedLoss = (edgeUp < -1 && payoffAtExpiry(priced, hi) === maxL) || (edgeDn > 1 && payoffAtExpiry(priced, lo) === maxL);

  const margin = estimateMargin(priced);
  const premium = priced.reduce(
    (s, l) => s + (l.kind === "FUT" ? 0 : (l.side === "BUY" ? -1 : 1) * l.entryPrice * l.lots * LOT_SIZE),
    0,
  );

  const warnings = [];
  const usedNow = estimateMargin(state.positions);
  if (usedNow + margin > state.availableMargin) {
    warnings.push(`Margin check: needs ~₹${inr(margin)}, only ₹${inr(state.availableMargin - usedNow)} free. Order may be rejected.`);
  }
  const nakedShorts = priced.filter(
    (l) => l.side === "SELL" && l.kind !== "FUT" && !priced.some((h) => h.side === "BUY" && h.kind === l.kind),
  );
  if (nakedShorts.length > 0 && unboundedLoss) {
    warnings.push("Naked short option leg — loss is theoretically unlimited. Consider a protective wing.");
  }
  if (priced.some((l) => l.lots > 10)) {
    warnings.push("Quantity check: more than 10 lots on a single leg — confirm this is intended.");
  }

  const ticket = {
    id: `T${state.nextOrderId++}`,
    label: label || "Custom strategy",
    legs: priced,
    estMargin: margin,
    netPremium: Math.round(premium),
    maxProfit: unboundedProfit ? "Unlimited" : Math.round(maxP),
    maxLoss: unboundedLoss ? "Unlimited" : Math.round(maxL),
    warnings,
    rationale,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    origin,
  };
  state.orders.unshift(ticket);
  return ticket;
}

export function draftEquityOrders({ symbols = [], side = "BUY", qty = 10, rationale = "" }) {
  const tickets = [];
  for (const symbol of symbols) {
    const row = findEquity(symbol);
    if (!row) continue;
    const qtyN = Math.max(1, Number(qty) || 10);
    const ticket = {
      id: `T${state.nextOrderId++}`,
      label: `${side} ${row.symbol}`,
      legs: [
        {
          id: "L1",
          instrument: row.symbol,
          kind: "EQ",
          strike: null,
          side,
          lots: 1,
          qty: qtyN,
          entryPrice: row.ltp,
          ltp: row.ltp,
          orderType: "LIMIT",
        },
      ],
      form: {
        exchange: "NSE",
        scrip: row.symbol,
        side,
        product: "CNC",
        orderType: "LIMIT",
        qty: qtyN,
        price: row.ltp,
        validity: "DAY",
        disclosedQty: 0,
      },
      estMargin: Math.round(row.ltp * qtyN),
      netPremium: 0,
      maxProfit: "Unlimited",
      maxLoss: Math.round(row.ltp * qtyN),
      warnings: [],
      rationale: rationale || `Screener · PE ${row.pe} · ROE ${row.roe}% · copilot filled the ticket`,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      origin: "ask",
    };
    state.orders.unshift(ticket);
    tickets.push(ticket);
  }
  return { action: "open_orders", tickets, count: tickets.length };
}

export function confirmOrder(id) {
  const t = state.orders.find((o) => o.id === id);
  if (!t) return { error: "Ticket not found" };
  if (t.status !== "PENDING") return { error: `Ticket already ${t.status}` };
  t.status = "EXECUTED";
  t.executedAt = new Date().toISOString();
  for (const leg of t.legs) {
    state.positions.push({
      id: `P${Math.random().toString(36).slice(2, 7)}`,
      instrument: leg.instrument,
      kind: leg.kind,
      strike: leg.strike,
      side: leg.side,
      lots: leg.lots,
      qty: leg.qty,
      avgPrice: leg.entryPrice,
      openedAt: "just now",
    });
  }
  return { ok: true, ticket: t };
}

export function rejectOrder(id) {
  const idx = state.orders.findIndex((o) => o.id === id);
  if (idx < 0) return { error: "Ticket not found" };
  const t = state.orders[idx];
  if (t.status !== "PENDING") return { error: `Ticket already ${t.status}` };
  t.status = "REJECTED";
  state.orders.splice(idx, 1);
  return { ok: true, ticket: t };
}

export function inr(n) {
  return Math.abs(Math.round(n)).toLocaleString("en-IN");
}

// --- Tick ------------------------------------------------------------------

let gaussSpare = null;
function gauss() {
  if (gaussSpare !== null) {
    const v = gaussSpare;
    gaussSpare = null;
    return v;
  }
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const mag = Math.sqrt(-2 * Math.log(u));
  gaussSpare = mag * Math.sin(2 * Math.PI * v);
  return mag * Math.cos(2 * Math.PI * v);
}

export function startTicking(intervalMs = 1000) {
  // Session clock owns the big tape jumps. A small jitter keeps LTP/MTM
  // ticking like a live terminal on every clock.
  setInterval(() => {
    const quiet = !state.clockId || state.clockId === "0915";
    const niftyMove = gauss() * (quiet ? 0.9 : 0.35);
    state.spot = round(Math.max(state.spot + niftyMove, 20000), 2);
    state.bankSpot = round(Math.max(state.bankSpot + niftyMove * 2.2 + gauss() * 0.4, 40000), 2);
    state.vix = round(Math.min(Math.max(state.vix + gauss() * 0.02, 10), 25), 2);
  }, intervalMs);
}

seedBook();
