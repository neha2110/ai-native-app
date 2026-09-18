import { useEffect, useRef, useState } from "react";
import { streamChat } from "./api";
import type {
  Chain,
  ChatMessage,
  Position,
  Scenario,
  Snapshot,
  Ticket,
  ToolStep,
  WatchItem,
  WorkspaceEvent,
} from "./types";
import GenieMark from "./GenieMark";
import ReplyBody from "./ReplyBody";
import {
  ChainWidget,
  MarketWidget,
  PositionsWidget,
  ScenarioCard,
  TicketCard,
  WatchlistWidget,
} from "./Widgets";

export default function AskAgent({
  tone,
  onBookChange,
  variant = "pocket",
  chips = [],
  chipHint,
  profile = "default",
  onWorkspace,
  onChipUsed,
}: {
  tone: "terse" | "explain";
  onBookChange: () => void;
  variant?: "pocket" | "dock";
  chips?: { label: string; prompt: string; next?: boolean }[];
  chipHint?: string;
  profile?: "default" | "copilot";
  onWorkspace?: (event: WorkspaceEvent) => void;
  onChipUsed?: (label: string) => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const reqRef = useRef(0);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (variant !== "dock") return;
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, variant]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const pending: ChatMessage = {
      role: "assistant",
      content: "",
      streaming: true,
      statusLabel: "Looking…",
      steps: [],
    };
    setMessages((prev) => [...prev, userMsg, pending]);
    setBusy(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const id = ++reqRef.current;
    const history = [...messages, userMsg];

    try {
      await streamChat(
        history,
        (ev) => {
          if (id !== reqRef.current) return;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (!last || last.role !== "assistant") return prev;
            if (ev.type === "status") {
              copy[copy.length - 1] = { ...last, statusLabel: ev.label };
            } else if (ev.type === "step_start") {
              copy[copy.length - 1] = {
                ...last,
                statusLabel: ev.label,
                steps: [
                  ...(last.steps || []),
                  { id: ev.id, tool: ev.tool, label: ev.label, args: ev.args, status: "running" },
                ],
              };
            } else if (ev.type === "step_done") {
              copy[copy.length - 1] = {
                ...last,
                steps: (last.steps || []).map((s) =>
                  s.id === ev.id
                    ? {
                        ...s,
                        status: "done" as const,
                        widget: ev.widget,
                        data: ev.data,
                        summary: ev.summary,
                      }
                    : s,
                ),
              };
              if (onWorkspace && (ev.widget === "workspace" || ev.widget === "screener") && ev.data) {
                queueMicrotask(() => onWorkspace(ev.data as WorkspaceEvent));
              }
            } else if (ev.type === "reply") {
              copy[copy.length - 1] = {
                ...last,
                content: ev.reply,
                streaming: false,
                statusLabel: undefined,
              };
            } else if (ev.type === "error") {
              copy[copy.length - 1] = { ...last, content: ev.error, streaming: false, statusLabel: undefined };
            }
            return copy;
          });
        },
        ac.signal,
        tone,
        profile,
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") {
          copy[copy.length - 1] = { ...last, content: String(e), streaming: false, statusLabel: undefined };
        }
        return copy;
      });
    } finally {
      if (id === reqRef.current) setBusy(false);
    }
  };

  return (
    <section className={`ask ask-${variant}`}>
      {variant === "dock" ? (
        <div className="ask-head">
          <GenieMark size={28} />
          <div>
            <p className="ask-title">{profile === "copilot" ? "Native" : "Ask Genie"}</p>
            <p className="ask-lead dim">
              {profile === "copilot" ? "Tabs · screener · drafts only" : "Drafts only · you confirm"}
            </p>
          </div>
        </div>
      ) : (
        <div className="ask-head ask-head-pocket">
          <GenieMark size={28} />
          <div>
            <p className="kicker" style={{ margin: 0 }}>
              Or ask trading agent
            </p>
            <p className="ask-lead dim">
              Disagree, change the hedge, or ask what a word means. Still drafts only.
            </p>
          </div>
        </div>
      )}
      {chips.length > 0 && (variant === "dock" || messages.length === 0) && (
        <div className="ask-chips">
          {chipHint && <p className="chip-hint">{chipHint}</p>}
          {chips.map((c) => (
            <button
              key={c.label}
              className={`chip ${c.next ? "chip-next" : ""}`}
              disabled={busy}
              onClick={() => {
                onChipUsed?.(c.label);
                void send(c.prompt);
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {(variant === "dock" || messages.length > 0) && (
        <div className="ask-thread" ref={threadRef}>
          {messages.map((m, i) => (
            <div key={i} className={`ask-msg ${m.role}`}>
              {m.role === "user" ? (
                <p className="ask-user">{m.content}</p>
              ) : (
                <div className="ask-assistant">
                  <GenieMark size={22} />
                  <div className="ask-assistant-body">
                    {m.statusLabel && <p className="ask-status dim">{m.statusLabel}</p>}
                    {m.steps && m.steps.length > 0 && (
                      <AskWidgets steps={m.steps} onBookChange={onBookChange} rich={variant === "dock"} />
                    )}
                    {m.content ? <ReplyBody text={m.content} /> : null}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={variant === "dock" ? "Ask about this book…" : "Ask anything about this book…"}
          disabled={busy}
          aria-label={
            profile === "copilot" ? "Ask Native" : variant === "dock" ? "Ask Genie" : "Ask trading agent"
          }
        />
        <button
          type="button"
          className="ask-mic"
          disabled
          title="Voice input — later"
          aria-label="Microphone (coming later)"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
            />
          </svg>
        </button>
        <button type="submit" className="ask-send" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}

function AskWidgets({
  steps,
  onBookChange,
  rich,
}: {
  steps: ToolStep[];
  onBookChange: () => void;
  rich: boolean;
}) {
  const useful = steps.filter((s) => {
    if (s.status !== "done") return false;
    if (s.widget === "ticket" || s.widget === "scenario") return true;
    return rich && (s.widget === "positions" || s.widget === "watchlist" || s.widget === "chain" || s.widget === "market");
  });
  const others = steps.filter((s) => s.status === "done" && !useful.includes(s));
  return (
    <>
      {others.length > 0 && (
        <p className="ask-checked dim">{others.map((s) => s.summary || s.label).join(" · ")}</p>
      )}
      {useful.map((s) => (
        <div key={s.id} className="ask-widget">
          {s.widget === "scenario" && s.data ? <ScenarioCard data={s.data as Scenario} bare /> : null}
          {s.widget === "ticket" && s.data ? (
            <TicketCard data={s.data as Ticket} quiet onOrderChange={onBookChange} />
          ) : null}
          {s.widget === "market" && s.data ? <MarketWidget data={s.data as Snapshot} /> : null}
          {s.widget === "positions" && s.data ? (
            <PositionsWidget positions={(s.data as { positions: Position[] }).positions} compact />
          ) : null}
          {s.widget === "watchlist" && s.data ? (
            <WatchlistWidget items={(s.data as { items: WatchItem[] }).items} />
          ) : null}
          {s.widget === "chain" && s.data ? <ChainWidget chain={s.data as Chain} /> : null}
        </div>
      ))}
    </>
  );
}
