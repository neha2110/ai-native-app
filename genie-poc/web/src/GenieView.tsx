import { useEffect, useState } from "react";
import { inr } from "./api";
import type { Situation } from "./types";
import AskAgent from "./AskAgent";
import Sparkline from "./Sparkline";
import { ChainWidget, PositionsWidget, ScenarioCard, TicketCard, WatchlistWidget } from "./Widgets";

export type DepthTab = "positions" | "chain" | "orders";

export default function GenieView({
  sit,
  onBookChange,
  onAdvance,
  onOpenDepth,
}: {
  sit: Situation | null;
  onBookChange: () => void;
  onAdvance: () => void;
  onOpenDepth: (tab: DepthTab) => void;
}) {
  const [tone, setTone] = useState<"terse" | "explain">("terse");
  const [scores, setScores] = useState<Record<string, "no" | "maybe" | "yes">>({});
  const [showHedges, setShowHedges] = useState(false);

  useEffect(() => {
    setShowHedges(false);
  }, [sit?.clockId]);

  if (!sit) {
    return <div className="native-shell dim">Loading situation…</div>;
  }

  const body = tone === "explain" ? sit.explain : sit.terse;
  const idx = sit.clocks.findIndex((c) => c.id === sit.clockId);
  const nextClock = sit.clocks[idx + 1];
  const scored = Object.values(scores);
  const tally = {
    yes: scored.filter((s) => s === "yes").length,
    maybe: scored.filter((s) => s === "maybe").length,
    no: scored.filter((s) => s === "no").length,
  };

  const evidenceCaption =
    sit.evidence === "positions"
      ? "Your book"
      : sit.evidence === "scenario"
        ? "The drop since 09:15 — and if we fall another 100"
        : sit.evidence === "watchlist"
          ? "What moved"
          : sit.evidence === "chain"
            ? "Around the short 23,600"
            : "Versus the 09:15 plan";

  const showPath = sit.path.length > 1 && sit.evidence !== "watchlist";
  const pathSeries = sit.evidence === "attribution" || sit.evidence === "scenario" ? "mtm" : "spot";
  const quietOpen = sit.clockId === "0915" && !showHedges;
  const depth =
    sit.evidence === "chain"
      ? { tab: "chain" as const, label: "Open the full chain in Riise" }
      : sit.evidence === "watchlist"
        ? { tab: "positions" as const, label: "Open the watchlist in Riise" }
        : { tab: "positions" as const, label: "Open the book in Riise" };

  return (
    <div className="native-shell">
      <article className="situation">
        <p className="kicker">{sit.kicker}</p>
        <h1 className="headline">{sit.headline}</h1>
        <p className="lede">{body}</p>

        <div className="tone-row">
          <button className={tone === "terse" ? "link-on" : "link"} onClick={() => setTone("terse")}>
            Short
          </button>
          <span className="sep">·</span>
          <button className={tone === "explain" ? "link-on" : "link"} onClick={() => setTone("explain")}>
            Plain language
          </button>
        </div>

        <section className="evidence">
          <p className="evidence-note">{evidenceCaption}</p>
          <div className="evidence-body">
            {showPath && <Sparkline points={sit.path} series={pathSeries} />}
            {sit.evidence === "positions" && <PositionsWidget positions={sit.positions} compact />}
            {sit.evidence === "scenario" && sit.scenario && <ScenarioCard data={sit.scenario} bare />}
            {sit.evidence === "watchlist" && sit.watchlist && (
              <WatchlistWidget items={sit.watchlist.items} />
            )}
            {sit.evidence === "chain" && sit.chain && (
              <ChainWidget chain={sit.chain} highlightStrike={23600} />
            )}
            {sit.evidence === "attribution" && sit.attribution && (
              <table className="grid-table compact">
                <thead>
                  <tr>
                    <th>Leg</th>
                    <th className="num">09:15</th>
                    <th className="num">Now</th>
                    <th className="num">Day</th>
                  </tr>
                </thead>
                <tbody>
                  {sit.attribution.map((a) => (
                    <tr key={a.instrument}>
                      <td>{a.instrument}</td>
                      <td className={`num ${a.mtmMorning >= 0 ? "up" : "down"}`}>{inr(a.mtmMorning)}</td>
                      <td className={`num ${a.mtmNow >= 0 ? "up" : "down"}`}>{inr(a.mtmNow)}</td>
                      <td className={`num ${a.delta >= 0 ? "up" : "down"}`}>{inr(a.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <button className="depth-link" onClick={() => onOpenDepth(depth.tab)}>
            {depth.label}
          </button>
        </section>

        {sit.tickets.length > 0 && quietOpen && (
          <section className="actions">
            <button className="hedges-ready" onClick={() => setShowHedges(true)}>
              Two hedges are ready — show them
            </button>
            <p className="dim small" style={{ marginTop: 8 }}>
              You do not have to. Plan is still hold unless 23,350.
            </p>
          </section>
        )}

        {sit.tickets.length > 0 && !quietOpen && (
          <section className="actions">
            <p className="kicker">One of these, or neither</p>
            <div className="ticket-grid">
              {sit.tickets.map((t) => (
                <TicketCard key={t.id} data={t} quiet onOrderChange={onBookChange} />
              ))}
            </div>
          </section>
        )}

        {sit.clockId === "1531" && <p className="close-note">No order. The gate is quiet.</p>}

        <AskAgent tone={tone} onBookChange={onBookChange} />

        {sit.hasNext && nextClock && (
          <button
            className="continue"
            onClick={() => {
              onAdvance();
            }}
          >
            Next · {nextClock.time} {nextClock.label}
          </button>
        )}

        <section className="score-block">
          <p className="score-q">Would you rather Native than Traditional or AI-enabled, for this moment?</p>
          <div className="score-row">
            {(["no", "maybe", "yes"] as const).map((s) => (
              <button
                key={s}
                className={scores[sit.clockId] === s ? "score-btn on" : "score-btn"}
                onClick={() => setScores((prev) => ({ ...prev, [sit.clockId]: s }))}
              >
                {s === "no" ? "No" : s === "maybe" ? "Not sure" : "Yes"}
              </button>
            ))}
          </div>
          {scored.length > 0 && (
            <p className="score-tally dim">
              Yes {tally.yes} · Not sure {tally.maybe} · No {tally.no}
            </p>
          )}
        </section>
      </article>
    </div>
  );
}
