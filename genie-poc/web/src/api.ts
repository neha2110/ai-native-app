import type {
  Chain,
  ChatMessage,
  Position,
  Situation,
  Snapshot,
  Ticket,
  ToolStep,
  WatchItem,
} from "./types";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export const fetchSnapshot = () => get<Snapshot>("/api/market");
export const fetchWatchlist = () => get<{ items: WatchItem[] }>("/api/watchlist");
export const fetchPositions = () => get<{ positions: Position[] }>("/api/positions");
export const fetchChain = () => get<Chain>("/api/chain?width=8");
export const fetchOrders = () => get<{ orders: Ticket[] }>("/api/orders");
export const fetchSituation = () => get<Situation>("/api/situation");

export async function postClock(body: { id?: string; action?: "advance" }): Promise<Situation> {
  const res = await fetch("/api/clock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`clock: ${res.status}`);
  return res.json();
}

export async function confirmTicket(id: string): Promise<{ ok?: boolean; error?: string; ticket?: Ticket }> {
  const res = await fetch(`/api/orders/${id}/confirm`, { method: "POST" });
  return res.json();
}

export async function rejectTicket(id: string): Promise<{ ok?: boolean; error?: string; ticket?: Ticket }> {
  const res = await fetch(`/api/orders/${id}/reject`, { method: "POST" });
  return res.json();
}

export async function draftEquityTickets(
  symbols: string[],
  side: "BUY" | "SELL" = "BUY",
  qty = 10,
): Promise<{ tickets?: Ticket[]; count?: number }> {
  const res = await fetch("/api/orders/equity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols, side, qty, rationale: "Native filled from screener selection." }),
  });
  return res.json();
}

export type ChatEvent =
  | { type: "status"; label: string }
  | { type: "step_start"; id: string; tool: string; label: string; args?: Record<string, unknown> }
  | {
      type: "step_done";
      id: string;
      tool: string;
      label: string;
      widget: ToolStep["widget"];
      data: unknown;
      args?: Record<string, unknown>;
      summary: string;
    }
  | { type: "reply"; reply: string }
  | { type: "error"; error: string }
  | { type: "done" };

export async function streamChat(
  messages: ChatMessage[],
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
  tone: "terse" | "explain" = "terse",
  profile: "default" | "copilot" = "default",
): Promise<void> {
  const res = await fetch("/api/genie/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      tone,
      profile,
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Chat failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(6)) as ChatEvent);
      } catch {
        /* ignore malformed frames */
      }
    }
  }
}

export function inr(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
}
