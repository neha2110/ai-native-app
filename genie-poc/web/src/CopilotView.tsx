import { useEffect, useState } from "react";
import ClassicView from "./ClassicView";
import AskAgent from "./AskAgent";
import { COPILOT_CHIPS } from "./chips";
import { CLOCK_MARKET, CLOCK_NEWS } from "./briefs";
import { DockBrief } from "./EnabledView";
import { draftEquityTickets } from "./api";
import type { ExtraTab, Position, Snapshot, WatchItem, WorkspaceEvent } from "./types";

const PIN_KEY = "copilot-pinned-tabs";

function readPinned(): ExtraTab[] {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExtraTab[];
    return parsed.map((t) => ({ ...t, pinned: true, closable: true }));
  } catch {
    return [];
  }
}

function savePinned(tabs: ExtraTab[]) {
  localStorage.setItem(PIN_KEY, JSON.stringify(tabs.filter((t) => t.pinned)));
}

function kindFromWhich(which?: string) {
  if (which === "watchlist_history") return "watchlist-history";
  return which;
}

export default function CopilotView({
  snap,
  positions,
  watchlist,
  clockId,
  onOrderChange,
}: {
  snap: Snapshot | null;
  positions: Position[];
  watchlist: WatchItem[];
  clockId: string;
  onOrderChange: () => void;
}) {
  const news = CLOCK_NEWS[clockId] || CLOCK_NEWS["0915"];
  const market = CLOCK_MARKET[clockId] || CLOCK_MARKET["0915"];
  const bank = watchlist.find((w) => w.symbol.includes("BANK"));
  const [extraTabs, setExtraTabs] = useState<ExtraTab[]>(readPinned);
  const [focusTab, setFocusTab] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [follow, setFollow] = useState<"pin" | "buy" | null>(null);
  const [pendingTab, setPendingTab] = useState<ExtraTab | null>(null);

  useEffect(() => {
    savePinned(extraTabs);
  }, [extraTabs]);

  const screener = [...extraTabs].reverse().find((t) => t.kind === "screener");

  const applyWorkspace = (event: WorkspaceEvent) => {
    if (event.action === "add" && event.tab) {
      const next = event.tab;
      setExtraTabs((prev) => {
        const existing = prev.find((t) => t.id === next.id);
        const merged = {
          ...next,
          pinned: existing?.pinned || next.pinned,
          closable: true,
        };
        return [...prev.filter((t) => t.id !== merged.id), merged];
      });
      setFocusTab(next.id);
      if (next.kind === "screener") {
        setSelected([]);
        setPendingTab(next);
        setFollow("buy");
      } else if (next.pinned) {
        setPendingTab(null);
        setFollow(null);
      } else {
        setPendingTab(next);
        setFollow("pin");
      }
    }
    if (event.action === "pin") {
      const kind = kindFromWhich(event.which);
      setExtraTabs((prev) => {
        const target =
          prev.find((t) => t.id === event.which) || [...prev].reverse().find((t) => t.kind === kind);
        if (!target) return prev;
        return prev.map((t) => (t.id === target.id ? { ...t, pinned: true, closable: true } : t));
      });
      setFollow(null);
    }
    if (event.action === "unpin") {
      const kind = kindFromWhich(event.which);
      setExtraTabs((prev) => {
        const target =
          prev.find((t) => t.id === event.which) || [...prev].reverse().find((t) => t.kind === kind);
        if (!target) return prev;
        return prev.map((t) => (t.id === target.id ? { ...t, pinned: false, closable: true } : t));
      });
    }
    if (event.action === "remove") {
      const which = event.which || "all_optional";
      setExtraTabs((prev) => {
        if (which === "all_optional") return [];
        const kind = kindFromWhich(which);
        const byId = prev.filter((t) => t.id !== which);
        if (byId.length !== prev.length) return byId;
        return prev.filter((t) => t.kind !== kind);
      });
      setFocusTab("explore");
      setSelected([]);
      setFollow(null);
    }
    if (event.action === "open_orders") {
      setFocusTab("orders");
      setFollow(null);
      onOrderChange();
    }
  };

  const fillSelected = async () => {
    if (!selected.length) return;
    await draftEquityTickets(selected);
    setFocusTab("orders");
    setFollow(null);
    onOrderChange();
  };

  const followChips =
    follow === "pin" && pendingTab
      ? [
          {
            label: "Keep as default",
            prompt: `Yes, pin the ${pendingTab.title} tab as a default. Keep it after this session — not optional.`,
            next: true,
          },
          {
            label: "Only this session",
            prompt: `No, keep the ${pendingTab.title} tab optional. Only for this session.`,
            next: true,
          },
        ]
      : follow === "buy"
        ? [
            {
              label: "Help me buy",
              prompt:
                "Yes, I am interested in buying some of these. Help me pick, then fill BUY CNC LIMIT tickets on the Orders tab. I will confirm.",
              next: true,
            },
            ...(screener?.rows?.length
              ? [
                  {
                    label: "Fill all names",
                    prompt: `Draft BUY CNC LIMIT tickets for every name on the Screener: ${screener.rows.map((r) => r.symbol).join(", ")}. Qty 10. I will confirm.`,
                    next: true,
                  },
                ]
              : []),
            {
              label: "Not buying",
              prompt: "Not buying right now. Leave the Screener tab as is.",
              next: true,
            },
          ]
        : [];

  const chips = [
    ...followChips,
    ...(selected.length
      ? [
          {
            label: `Fill order (${selected.length})`,
            prompt: `Draft BUY CNC LIMIT tickets for these selected names and put them on the Orders tab: ${selected.join(", ")}. Qty 10 each. I will confirm.`,
            next: true,
          },
        ]
      : []),
    ...COPILOT_CHIPS,
  ];

  return (
    <div className="enabled">
      <ClassicView
        snap={snap}
        positions={positions}
        watchlist={watchlist}
        onOrderChange={onOrderChange}
        hideWatcherDrafts
        emptyOrders="No orders yet. Ask Native to fill a ticket — then confirm."
        news={news}
        extraTabs={extraTabs}
        openTab={focusTab}
        onCloseTab={(id) => {
          setExtraTabs((prev) => prev.filter((t) => t.id !== id));
          setFocusTab("explore");
          setFollow(null);
        }}
        selectedSymbols={selected}
        onToggleSymbol={(symbol) =>
          setSelected((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]))
        }
        onFillSelected={() => void fillSelected()}
      />
      <aside className="genie-dock">
        <DockBrief clockId={clockId} snap={snap} bankLtp={bank?.ltp} news={news} market={market} />
        <AskAgent
          variant="dock"
          tone="explain"
          profile="copilot"
          chips={chips}
          chipHint={follow === "pin" ? "Keep this tab?" : follow === "buy" ? "Buy any of these?" : undefined}
          onBookChange={onOrderChange}
          onWorkspace={applyWorkspace}
          onChipUsed={(label) => {
            if (label === "Keep as default" && pendingTab) {
              setExtraTabs((prev) =>
                prev.map((t) => (t.id === pendingTab.id ? { ...t, pinned: true, closable: true } : t)),
              );
              setFollow(null);
            }
            if (label === "Only this session" || label === "Not buying") setFollow(null);
          }}
        />
      </aside>
    </div>
  );
}
