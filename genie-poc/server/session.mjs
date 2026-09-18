// Session clock + watcher. Owns the leadership demo tape.
// Five system-started turns. The presenter advances time; Genie does not wait to be asked.

import {
  state,
  marketSnapshot,
  positionsView,
  watchlistView,
  optionChain,
  computeScenario,
  draftOrder,
  seedBook,
} from "./market.mjs";

export const CLOCKS = [
  { id: "0915", time: "09:15", label: "Open" },
  { id: "0942", time: "09:42", label: "Drop" },
  { id: "1120", time: "11:20", label: "Vol" },
  { id: "1405", time: "14:05", label: "Gamma" },
  { id: "1531", time: "15:31", label: "Close" },
];

const TAPE = {
  "0915": { spot: 23398.1, bank: 56606.55, vix: 14.2 },
  "0942": { spot: 23218.0, bank: 56110.0, vix: 14.9 },
  "1120": { spot: 23255.0, bank: 54880.0, vix: 16.5 },
  "1405": { spot: 23562.0, bank: 56340.0, vix: 15.2 },
  "1531": { spot: 23412.0, bank: 56020.0, vix: 14.6 },
};

const drafted = {};

function applyTape(id) {
  const t = TAPE[id];
  if (!t) return;
  state.spot = t.spot;
  state.bankSpot = t.bank;
  state.vix = t.vix;
  state.clockId = id;
}

function rememberMorning() {
  state.morning = {
    spot: state.spot,
    mtm: marketSnapshot().totalMtm,
    legs: positionsView().map((p) => ({ id: p.id, instrument: p.instrument, mtm: p.mtm })),
    plan: "Hold. Trigger 23,350.",
  };
}

function sceneDrafts(id) {
  if (drafted[id]) return drafted[id];
  let tickets = [];
  if (id === "0915") {
    tickets = [
      draftOrder({
        label: "Protective put",
        origin: "watcher",
        rationale: "Cheap tail if 23,350 breaks. Plan still hold until then.",
        legs: [{ kind: "PE", strike: 23100, side: "BUY", lots: 1 }],
      }),
      draftOrder({
        label: "Put spread",
        origin: "watcher",
        rationale: "Same idea, less premium. Caps the hedge.",
        legs: [
          { kind: "PE", strike: 23100, side: "BUY", lots: 1 },
          { kind: "PE", strike: 22900, side: "SELL", lots: 1 },
        ],
      }),
    ];
  } else if (id === "0942") {
    tickets = [
      draftOrder({
        label: "Buy 23100 PE",
        origin: "watcher",
        rationale: "Stop the next 100 points from hitting the futures 1:1.",
        legs: [{ kind: "PE", strike: 23100, side: "BUY", lots: 1 }],
      }),
      draftOrder({
        label: "Flatten futures",
        origin: "watcher",
        rationale: "Removes the long delta. Short call remains.",
        legs: [{ kind: "FUT", strike: null, side: "SELL", lots: 1 }],
      }),
    ];
  } else if (id === "1120") {
    tickets = [
      draftOrder({
        label: "Buy 23100 PE",
        origin: "watcher",
        rationale: "Vol is up; the OTM put is doing more work per rupee.",
        legs: [{ kind: "PE", strike: 23100, side: "BUY", lots: 1 }],
      }),
      draftOrder({
        label: "Flatten futures",
        origin: "watcher",
        rationale: "Beta broke on Banknifty while this book is still net long NIFTY.",
        legs: [{ kind: "FUT", strike: null, side: "SELL", lots: 1 }],
      }),
    ];
  } else if (id === "1405") {
    tickets = [
      draftOrder({
        label: "Buy back 23600 CE",
        origin: "watcher",
        rationale: "The short call is no longer a cushion. Close it.",
        legs: [{ kind: "CE", strike: 23600, side: "BUY", lots: 1 }],
      }),
      draftOrder({
        label: "Roll to 23800 CE",
        origin: "watcher",
        rationale: "Keep some credit, move the short further OTM.",
        legs: [
          { kind: "CE", strike: 23600, side: "BUY", lots: 1 },
          { kind: "CE", strike: 23800, side: "SELL", lots: 1 },
        ],
      }),
    ];
  }
  drafted[id] = tickets;
  return tickets;
}

function copyFor(id) {
  const m = state.morning;
  const snap = marketSnapshot();
  const vsMorning = m ? snap.totalMtm - m.mtm : 0;
  return {
    "0915": {
      kicker: "Situation · open",
      headline: "Quiet open. You are still net long.",
      terse:
        "Thesis: you expect NIFTY up, but cap gains above ~23,600 for a floor near 23,000. Δ +46. Plan: hold unless 23,350. Two hedges are ready — you do not have to take them.",
      explain:
        "This book in one line: you expect NIFTY to rise, but you are willing to give up gains above ~23,600 in exchange for protection against a large fall below ~23,000. NIFTY is roughly unchanged versus last close. You are still net long because of the futures. The short call is the cap; the 23,000 put is too far to help much yet. Plan: hold unless 23,350. Two hedges are drafted. You can take one, or do nothing.",
      evidence: "positions",
    },
    "0942": {
      kicker: "Watcher · tape vs 09:15",
      headline: "Downside is worse than this morning.",
      terse: `Spot −180 from 09:15. Book MTM ${vsMorning < 0 ? "−" : "+"}${Math.abs(Math.round(vsMorning)).toLocaleString("en-IN")} vs morning. Futures are the leak. Two ways out: cheap put, or flatten the future.`,
      explain: `NIFTY has dropped about 180 points since the 09:15 plan. That plan said hold unless 23,350 — we are through it. Most of the damage is the long future; the put is still too far. I ran the book and drafted two hedges. Confirm one, edit, or dismiss.`,
      evidence: "scenario",
    },
    "1120": {
      kicker: "Watcher · watchlist",
      headline: "Vol and Banknifty broke. This book is still long NIFTY.",
      terse: "VIX +2. Banknifty dislocated. Your delta has not. Same two choices: put, or flatten.",
      explain:
        "India VIX is up about two points and BANKNIFTY has broken while your NIFTY futures are still on. That is a beta mismatch: the risk you are running is larger than the NIFTY print alone suggests. Two hedges are ready.",
      evidence: "watchlist",
    },
    "1405": {
      kicker: "Watcher · short call",
      headline: "The 23600 CE is no longer a cushion.",
      terse: "Spot into the short strike. Gamma is yours now. Buy it back, or roll to 23800.",
      explain:
        "NIFTY has ground up toward 23,600. The call you sold for premium is becoming a real short. Holding it from here is a different trade than this morning. I drafted a buy-back and a roll. You still authorize.",
      evidence: "chain",
    },
    "1531": {
      kicker: "Close",
      headline: "The day versus the 09:15 plan.",
      terse: "No ticket. Attribution only. Tomorrow’s note is in the copy.",
      explain:
        "Session over. This is what each leg did versus the 09:15 plan — hold unless 23,350. I am not proposing a trade unless you start one.",
      evidence: "attribution",
    },
  }[id];
}

export function setClock(id) {
  if (!TAPE[id]) return situation();
  applyTape(id);
  if (id === "0915" && !state.morning) rememberMorning();
  sceneDrafts(id);
  return situation();
}

export function advanceClock() {
  const i = CLOCKS.findIndex((c) => c.id === state.clockId);
  const next = CLOCKS[Math.min(i + 1, CLOCKS.length - 1)];
  return setClock(next.id);
}

export function situation() {
  if (!state.clockId) setClock("0915");
  if (!state.morning) {
    applyTape("0915");
    rememberMorning();
  }
  const id = state.clockId;
  const copy = copyFor(id);
  const snap = marketSnapshot();
  const positions = positionsView();
  const tickets = (drafted[id] || []).filter((t) => t.status === "PENDING" || t.status === "EXECUTED" || t.status === "REJECTED");
  const scenario =
    id === "0942"
      ? computeScenario({ spotChangePoints: -100, spotChangePct: 0, daysForward: 0, ivChangePts: 0 })
      : null;
  const chain = id === "1405" ? optionChain(3) : null;
  const watchlist =
    id === "1120"
      ? {
          items: watchlistView().items.filter((w) => w.kind === "INDEX" || w.kind === "VIX"),
        }
      : null;
  const attribution =
    id === "1531" && state.morning
      ? positions.map((p) => {
          const m = state.morning.legs.find((l) => l.id === p.id || l.instrument === p.instrument);
          return {
            instrument: p.instrument,
            mtmMorning: m ? m.mtm : 0,
            mtmNow: p.mtm,
            delta: p.mtm - (m ? m.mtm : 0),
          };
        })
      : null;

  const idx = CLOCKS.findIndex((c) => c.id === id);
  const path = CLOCKS.slice(0, idx + 1).map((c) => {
    const t = TAPE[c.id];
    applyTape(c.id);
    const m = marketSnapshot();
    return {
      id: c.id,
      time: c.time,
      label: c.label,
      spot: t.spot,
      mtm: m.totalMtm,
      vix: t.vix,
    };
  });
  applyTape(id);

  return {
    clocks: CLOCKS,
    clockId: id,
    time: CLOCKS[idx].time,
    hasNext: idx < CLOCKS.length - 1,
    kicker: copy.kicker,
    headline: copy.headline,
    terse: copy.terse,
    explain: copy.explain,
    evidence: copy.evidence,
    snapshot: snap,
    positions,
    tickets,
    scenario,
    chain,
    watchlist,
    attribution,
    morning: state.morning,
    path,
  };
}

// Initialise tape + morning at process start.
seedBook();
applyTape("0915");
rememberMorning();
sceneDrafts("0915");
