import { useCallback, useEffect, useState } from "react";
import { fetchPositions, fetchSituation, fetchSnapshot, fetchWatchlist, inr, postClock } from "./api";
import type { Position, Situation, Snapshot, WatchItem } from "./types";
import ClassicView from "./ClassicView";
import EnabledView from "./EnabledView";
import CopilotView from "./CopilotView";
import GenieView from "./GenieView";

type Mode = "traditional" | "enabled" | "copilot" | "native";

function readMode(): Mode {
  const m = localStorage.getItem("mode");
  if (m === "classic" || m === "traditional") return "traditional";
  if (m === "enabled") return "enabled";
  if (m === "copilot") return "copilot";
  if (m === "genie" || m === "native") return "native";
  return "native";
}

export default function App() {
  const [mode, setMode] = useState<Mode>(readMode);
  const [opened, setOpened] = useState<Record<Mode, boolean>>({
    traditional: true,
    enabled: true,
    copilot: true,
    native: true,
  });
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [sit, setSit] = useState<Situation | null>(null);
  const [riiseTab, setRiiseTab] = useState<"explore" | "positions" | "chain" | "orders">("explore");

  const refreshPositions = useCallback(() => {
    fetchPositions().then((r) => setPositions(r.positions)).catch(() => {});
  }, []);

  const refreshAll = useCallback(() => {
    fetchSnapshot().then(setSnap).catch(() => {});
    fetchWatchlist()
      .then((r) => setWatchlist(r.items))
      .catch(() => {});
    refreshPositions();
    fetchSituation().then(setSit).catch(() => {});
  }, [refreshPositions]);

  useEffect(() => {
    refreshAll();
    const t = setInterval(refreshAll, 1000);
    return () => clearInterval(t);
  }, [refreshAll]);

  const switchMode = (m: Mode) => {
    setMode(m);
    localStorage.setItem("mode", m);
    setOpened((prev) => ({ ...prev, [m]: true }));
  };

  const goClock = async (body: { id?: string; action?: "advance" }) => {
    const next = await postClock(body);
    setSit(next);
    fetchSnapshot().then(setSnap).catch(() => {});
    fetchWatchlist()
      .then((r) => setWatchlist(r.items))
      .catch(() => {});
    refreshPositions();
  };

  const openDepth = (tab: "positions" | "chain" | "orders") => {
    setRiiseTab(tab);
    switchMode("traditional");
  };

  const up = (snap?.change ?? 0) >= 0;
  const brand =
    mode === "traditional"
      ? "Riise"
      : mode === "enabled"
        ? "Riise · Genie"
        : mode === "copilot"
          ? "Riise · Native"
          : "Trading agent";
  const clockIdx = sit ? sit.clocks.findIndex((c) => c.id === sit.clockId) : -1;

  return (
    <div className={`app theme-${mode === "copilot" ? "enabled" : mode}`}>
      <header className="header">
        <div className="header-top">
          <div className="brand">
            <span className="brand-mo">MO</span>
            <span className="brand-name">{brand}</span>
          </div>
          {snap && (
            <div className="header-metrics">
              <span>
                NIFTY{" "}
                <b className={up ? "up" : "down"}>
                  {snap.spot.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </b>
              </span>
              <span>
                MTM <b className={snap.totalMtm >= 0 ? "up" : "down"}>{inr(snap.totalMtm)}</b>
              </span>
              <span className="dim">
                Δ {snap.netDeltaUnits > 0 ? "+" : ""}
                {snap.netDeltaUnits}
              </span>
            </div>
          )}
          <div className="header-right">
            <div className="mode-toggle">
              <button className={mode === "traditional" ? "active" : ""} onClick={() => switchMode("traditional")}>
                Traditional
              </button>
              <button className={mode === "enabled" ? "active" : ""} onClick={() => switchMode("enabled")}>
                AI-enabled
              </button>
              <button className={mode === "copilot" ? "active" : ""} onClick={() => switchMode("copilot")}>
                Native
              </button>
              <button className={mode === "native" ? "active" : ""} onClick={() => switchMode("native")}>
                Trading agent
              </button>
            </div>
          </div>
        </div>
        {sit && (
          <nav className="clock clock-header" aria-label="Session clock">
            {sit.clocks.map((c, i) => (
              <button
                key={c.id}
                className={`clock-step ${c.id === sit.clockId ? "current" : ""} ${i < clockIdx ? "past" : ""}`}
                onClick={() => void goClock({ id: c.id })}
              >
                <span className="clock-dot" />
                <span className="clock-time">{c.time}</span>
                <span className="clock-label">{c.label}</span>
              </button>
            ))}
          </nav>
        )}
      </header>

      {opened.traditional && (
        <div className="view-slot" style={{ display: mode === "traditional" ? "flex" : "none" }}>
          <ClassicView
            snap={snap}
            positions={positions}
            watchlist={watchlist}
            onOrderChange={refreshAll}
            hideWatcherDrafts
            openTab={riiseTab}
            onGenieClick={() => switchMode("enabled")}
          />
        </div>
      )}
      {opened.enabled && (
        <div className="view-slot" style={{ display: mode === "enabled" ? "flex" : "none" }}>
          <EnabledView
            snap={snap}
            positions={positions}
            watchlist={watchlist}
            clockId={sit?.clockId || "0915"}
            onOrderChange={refreshAll}
          />
        </div>
      )}
      {opened.copilot && (
        <div className="view-slot" style={{ display: mode === "copilot" ? "flex" : "none" }}>
          <CopilotView
            snap={snap}
            positions={positions}
            watchlist={watchlist}
            clockId={sit?.clockId || "0915"}
            onOrderChange={refreshAll}
          />
        </div>
      )}
      {opened.native && (
        <div className="view-slot" style={{ display: mode === "native" ? "flex" : "none" }}>
          <GenieView
            sit={sit}
            onBookChange={refreshAll}
            onAdvance={() => void goClock({ action: "advance" })}
            onOpenDepth={openDepth}
          />
        </div>
      )}
    </div>
  );
}
