// ---------------------------------------------------------------------------
// Genie: OpenAI Responses API tool-calling loop over the mocked market.
// The model can read data and DRAFT order tickets. It can never execute —
// execution happens only via the human Confirm button (REST endpoint).
// ---------------------------------------------------------------------------

import OpenAI from "openai";
import {
  marketSnapshot,
  positionsView,
  optionChain,
  computeScenario,
  draftOrder,
  draftEquityOrders,
  watchlistView,
} from "./market.mjs";
import { screenEquities, workspaceTab } from "./screener.mjs";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

let client = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const INSTRUCTIONS_BASE = `You are Genie, the AI trading copilot inside Motilal Oswal's Riise platform (POC).
Your user is looking at a NIFTY F&O book. Market data is simulated.

Format money in Indian style (₹1,23,456). Quote index levels to 1 decimal.

How you write (the UI renders Markdown):
- Short paragraphs. Blank line between sections.
- **Bold** the important numbers (spot, MTM, strikes).
- Use bullet lists for 3+ facts. Do not dump one long paragraph.
- A ### heading only when you have two distinct sections (e.g. What changed / What to do).
- Do not use markdown tables. Widgets already show tables.
- 6–10 short lines is enough unless they asked you to explain a term.

How you work with the screen:
- The app already shows a situation and (often) two drafted tickets. Do not repeat that briefing unless they ask.
- They may ignore those tickets and ask for something else. That is allowed. Follow their ask.
- They may want a what-if, a different hedge, an explanation of a term, or "do nothing." Answer that.
- ALWAYS use tools for prices, Greeks, P&L, margins — never invent numbers.
- When they ask "what if", use compute_scenario on their real book.
- When they want a trade or a different hedge, check the chain if needed, then draft_order.
  You DRAFT tickets only. A human must press Confirm. Never say an order was placed.
- Flag risk honestly. One-line why for every suggestion.
- If they ask what a term means (delta, put, gamma, flatten), explain in plain language, then tie it back to THIS book.
- If asked something outside this book, answer briefly and steer back.`;

const COPILOT_EXTRA = `
You are in App Copilot mode. The trader is looking at the Riise app. You can CHANGE THE APP, not only the chat.

First action, then a second-level ask. Always do both.

- To add a Watchlist, Watchlist-with-plots, or Performance tab, use add_workspace_tab. Then ALWAYS ask: keep this tab after the session (pin it as a default), or only for now? If they want it as default, use pin_workspace_tab. Do not dump the table in chat.
- Default only means it comes back next session. The trader can still close or change any tab they asked you to create. To remove one — including a Default tab — use remove_workspace_tab. To stop keeping it next session but leave it open, use unpin_workspace_tab. Never remove Explore, Portfolio, Positions, Option Chain, or Orders.
- For screens (PE, ROE, sector, "show me stocks that…"), use screen_equities. Then ALWAYS ask if they want to buy any of the names. Offer to fill order tickets. Do not draft until they pick names or say yes.
- When they want to buy, use draft_equity_orders. That FILLS the Orders tab (qty, limit, CNC, DAY). They still Confirm. Never say the order was placed.
- One or two short sentences in chat. Point at the new tab, then the second-level question.`;

const TONE = {
  terse:
    "Personality: terse trader-speak. Short lines, numbers first. Still use **bold** on key numbers and bullets when listing 3+ facts.",
  explain:
    "Personality: explanatory. Same facts and tools. Complete sentences. Use bullets and **bold** numbers. Name the why before the number. 6–10 short lines max.",
};

function instructionsFor(tone, profile) {
  const t = tone === "explain" ? TONE.explain : TONE.terse;
  const extra = profile === "copilot" ? `\n\n${COPILOT_EXTRA}` : "";
  return `${INSTRUCTIONS_BASE}\n\n${t}${extra}`;
}

const TOOLS = [
  {
    type: "function",
    name: "get_market_snapshot",
    description:
      "Current NIFTY spot, day change, futures, India VIX, expiry date/days, book MTM, net delta, margins.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_watchlist",
    description:
      "The trader's F&O watchlist: NIFTY, BANKNIFTY, NIFTY FUT, India VIX, and option strikes they track (including names that are already in the book).",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_positions",
    description:
      "The trader's open F&O positions with side, lots, avg price, LTP, MTM and position Greeks (delta in units).",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_option_chain",
    description:
      "NIFTY option chain for current weekly expiry: strikes around ATM with CE/PE LTP, IV, OI, OI change %, and Greeks.",
    parameters: {
      type: "object",
      properties: {
        width: {
          type: ["integer", "null"],
          description: "Strikes on each side of ATM (default 8, max 15).",
        },
      },
      required: ["width"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "compute_scenario",
    description:
      "Reprice the trader's ENTIRE current book under a hypothetical move. Returns per-leg and total P&L change.",
    parameters: {
      type: "object",
      properties: {
        spotChangePoints: { type: ["number", "null"], description: "NIFTY move in points, e.g. -200." },
        spotChangePct: { type: ["number", "null"], description: "NIFTY move in percent, e.g. -1.5." },
        daysForward: { type: ["number", "null"], description: "Days of theta decay to apply (default 0)." },
        ivChangePts: { type: ["number", "null"], description: "IV shift in vol points, e.g. +2." },
      },
      required: ["spotChangePoints", "spotChangePct", "daysForward", "ivChangePts"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "draft_order",
    description:
      "Draft a multi-leg NIFTY order ticket (current weekly expiry only). Returns ticket with prices, est margin, max P/L, warnings. Human must confirm — this does NOT execute.",
    parameters: {
      type: "object",
      properties: {
        label: { type: "string", description: "Short strategy name, e.g. 'Protective put' or 'Bear call spread'." },
        rationale: { type: "string", description: "One-line why, shown to the trader on the ticket." },
        legs: {
          type: "array",
          description: "1-4 legs.",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["FUT", "CE", "PE"] },
              strike: { type: ["number", "null"], description: "Strike (null for FUT). Must be a multiple of 50." },
              side: { type: "string", enum: ["BUY", "SELL"] },
              lots: { type: "integer", description: "Number of lots (75 units each)." },
            },
            required: ["kind", "strike", "side", "lots"],
            additionalProperties: false,
          },
        },
      },
      required: ["label", "rationale", "legs"],
      additionalProperties: false,
    },
    strict: true,
  },
];

const COPILOT_TOOLS = [
  {
    type: "function",
    name: "add_workspace_tab",
    description:
      "Add an optional tab on the Riise app (not in chat): watchlist, watchlist with historical plots, or portfolio/stock performance over time.",
    parameters: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["watchlist", "watchlist_history", "performance"],
        },
      },
      required: ["kind"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "pin_workspace_tab",
    description:
      "Pin an extra tab as a default so it comes back next session. The trader can still close or change it at any time.",
    parameters: {
      type: "object",
      properties: {
        which: {
          type: "string",
          enum: ["watchlist", "watchlist_history", "performance", "screener"],
        },
      },
      required: ["which"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "unpin_workspace_tab",
    description:
      "Stop keeping a tab as default next session, but leave it open now. Use when they want it optional again.",
    parameters: {
      type: "object",
      properties: {
        which: {
          type: "string",
          enum: ["watchlist", "watchlist_history", "performance", "screener"],
        },
      },
      required: ["which"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "remove_workspace_tab",
    description:
      "Remove a Copilot-created tab, including one marked Default. Does not remove core Riise tabs (Explore, Portfolio, Positions, Option Chain, Orders).",
    parameters: {
      type: "object",
      properties: {
        which: {
          type: "string",
          enum: ["watchlist", "watchlist_history", "performance", "screener", "all_optional"],
        },
      },
      required: ["which"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "screen_equities",
    description:
      "Screen the mocked cash-equity universe on fundamentals (PE, ROE, sector). Opens a Screener tab on the app. Then ask if they want to order.",
    parameters: {
      type: "object",
      properties: {
        peMax: { type: ["number", "null"], description: "Keep names with PE below this, e.g. 50." },
        peMin: { type: ["number", "null"] },
        roeMin: { type: ["number", "null"], description: "Keep names with ROE above this percent, e.g. 30." },
        roeMax: { type: ["number", "null"] },
        sector: { type: ["string", "null"], description: "IT, Banks, Energy, Consumer." },
      },
      required: ["peMax", "peMin", "roeMin", "roeMax", "sector"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "draft_equity_orders",
    description:
      "Fill the Orders tab with LIMIT CNC DAY tickets for selected cash stocks. Does NOT execute. Human must Confirm.",
    parameters: {
      type: "object",
      properties: {
        symbols: { type: "array", items: { type: "string" }, description: "NSE symbols, e.g. INFY." },
        side: { type: "string", enum: ["BUY", "SELL"] },
        qty: { type: ["integer", "null"], description: "Shares per name (default 10)." },
        rationale: { type: "string" },
      },
      required: ["symbols", "side", "qty", "rationale"],
      additionalProperties: false,
    },
    strict: true,
  },
];

const TOOL_META = {
  get_market_snapshot: { label: "Markets", widget: "market" },
  get_watchlist: { label: "Watchlist", widget: "watchlist" },
  get_positions: { label: "Positions", widget: "positions" },
  get_option_chain: { label: "Option chain", widget: "chain" },
  compute_scenario: { label: "Scenario", widget: "scenario" },
  draft_order: { label: "Order ticket", widget: "ticket" },
  add_workspace_tab: { label: "Add tab", widget: "workspace" },
  pin_workspace_tab: { label: "Pin default", widget: "workspace" },
  unpin_workspace_tab: { label: "Unpin default", widget: "workspace" },
  remove_workspace_tab: { label: "Remove tab", widget: "workspace" },
  screen_equities: { label: "Screener", widget: "screener" },
  draft_equity_orders: { label: "Fill order", widget: "workspace" },
};

function inrShort(n) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
}

function summarize(name, result, args) {
  try {
    if (name === "get_market_snapshot") {
      const chg = result.change >= 0 ? "+" : "";
      return `${result.spot.toLocaleString("en-IN")} ${chg}${result.change.toFixed(0)} · MTM ${inrShort(result.totalMtm)}`;
    }
    if (name === "get_watchlist") {
      const n = result.items?.length ?? 0;
      const movers = (result.items || []).filter((i) => Math.abs(i.changePct) >= 1).length;
      return `${n} scrips · ${movers} moving >1%`;
    }
    if (name === "get_positions") {
      const n = result.positions?.length ?? 0;
      const mtm = (result.positions || []).reduce((s, p) => s + p.mtm, 0);
      return `${n} legs · MTM ${inrShort(mtm)}`;
    }
    if (name === "get_option_chain") {
      return `ATM ${result.atm?.toLocaleString("en-IN")} · ${result.rows?.length ?? 0} strikes`;
    }
    if (name === "compute_scenario") {
      const pts = args?.spotChangePoints;
      const move = pts ? `${pts > 0 ? "+" : ""}${pts} pts` : "custom";
      return `${move} → ${inrShort(result.totalPnlChange)}`;
    }
    if (name === "draft_order") {
      return `${result.label} · ${result.status}`;
    }
    if (name === "screen_equities") {
      return `${result.count} names · ${result.tab?.filterNote || "screener"}`;
    }
    if (name === "add_workspace_tab") {
      return `Opened ${result.tab?.title || "tab"}`;
    }
    if (name === "pin_workspace_tab") {
      return result.note || "Pinned as default";
    }
    if (name === "unpin_workspace_tab") {
      return result.note || "No longer a default";
    }
    if (name === "remove_workspace_tab") {
      return result.note || "Removed tab";
    }
    if (name === "draft_equity_orders") {
      return `Filled ${result.count} ticket(s) on Orders`;
    }
  } catch {
    /* fall through */
  }
  return TOOL_META[name]?.label || name;
}

function runTool(name, args) {
  switch (name) {
    case "get_market_snapshot":
      return marketSnapshot();
    case "get_watchlist":
      return watchlistView();
    case "get_positions":
      return { positions: positionsView() };
    case "get_option_chain":
      return optionChain(Math.min(args?.width ?? 8, 15));
    case "compute_scenario":
      return computeScenario({
        spotChangePoints: args?.spotChangePoints ?? 0,
        spotChangePct: args?.spotChangePct ?? 0,
        daysForward: args?.daysForward ?? 0,
        ivChangePts: args?.ivChangePts ?? 0,
      });
    case "draft_order":
      return draftOrder(args);
    case "add_workspace_tab":
      return workspaceTab(args?.kind);
    case "pin_workspace_tab":
      return { action: "pin", which: args?.which, note: "Default — comes back next session. You can still close it." };
    case "unpin_workspace_tab":
      return { action: "unpin", which: args?.which, note: "No longer a default — session only" };
    case "remove_workspace_tab":
      return { action: "remove", which: args?.which || "all_optional", note: "Removed extra tab" };
    case "screen_equities":
      return screenEquities({
        peMax: args?.peMax,
        peMin: args?.peMin,
        roeMin: args?.roeMin,
        roeMax: args?.roeMax,
        sector: args?.sector,
      });
    case "draft_equity_orders":
      return draftEquityOrders({
        symbols: args?.symbols || [],
        side: args?.side || "BUY",
        qty: args?.qty,
        rationale: args?.rationale || "",
      });
    default:
      return { error: `Unknown tool ${name}` };
  }
}

/**
 * Run one Genie turn, emitting live steps so the UI can render Classic widgets
 * as Genie "navigates" Markets → Positions → Chain → Scenario → Ticket.
 *
 * onEvent({ type, ... })
 *   status      { label }
 *   step_start  { id, tool, label, args }
 *   step_done   { id, tool, label, widget, data, args, summary }
 *   reply       { reply }
 */
export async function genieChat(history, onEvent = () => {}, tone = "terse", scene = null, profile = "default") {
  const emit = (event) => {
    try {
      onEvent(event);
    } catch {
      /* UI disconnects shouldn't kill the loop */
    }
  };

  const oa = getClient();
  if (!oa) {
    emit({
      type: "reply",
      reply:
        "OpenAI API key missing. Paste your key into genie-poc/.env (OPENAI_API_KEY=sk-...) — the server picks it up on restart.",
    });
    return;
  }

  const input = history.map((m, i) => {
    const last = i === history.length - 1 && m.role === "user";
    let content = m.content;
    if (last && scene) {
      content = `${m.content}

(Context, not from the user: session clock ${scene.time}. On-screen headline: "${scene.headline}". Morning plan: ${scene.plan || "Hold unless 23,350."}. Answer their ask. Do not repeat the on-screen situation unless they ask.)`;
    }
    return { role: m.role, content };
  });
  let stepSeq = 0;

  emit({ type: "status", label: "Reading the book…" });

  for (let iter = 0; iter < 8; iter++) {
    emit({ type: "status", label: iter === 0 ? "Deciding which screens to open…" : "Reading tool results…" });

    const response = await oa.responses.create({
      model: MODEL,
      instructions: instructionsFor(tone, profile),
      input,
      tools: profile === "copilot" ? [...TOOLS, ...COPILOT_TOOLS] : TOOLS,
    });

    const calls = response.output.filter((item) => item.type === "function_call");
    if (calls.length === 0) {
      emit({ type: "status", label: "Composing answer…" });
      emit({ type: "reply", reply: response.output_text || "(no reply)" });
      return;
    }

    input.push(...response.output);
    for (const call of calls) {
      let args = {};
      try {
        args = JSON.parse(call.arguments || "{}");
      } catch {
        /* leave as {} */
      }
      const meta = TOOL_META[call.name] || { label: call.name, widget: "raw" };
      const id = `s${++stepSeq}`;
      emit({ type: "step_start", id, tool: call.name, label: meta.label, args });

      let result;
      try {
        result = runTool(call.name, args);
      } catch (err) {
        result = { error: String(err?.message || err) };
      }

      emit({
        type: "step_done",
        id,
        tool: call.name,
        label: meta.label,
        widget: meta.widget,
        data: result,
        args,
        summary: result?.error ? String(result.error) : summarize(call.name, result, args),
      });

      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
    }
  }
  emit({ type: "reply", reply: "Stopped after too many tool steps — try rephrasing." });
}
