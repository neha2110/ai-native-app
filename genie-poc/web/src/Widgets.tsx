import { useState } from "react";
import { confirmTicket, inr, rejectTicket } from "./api";
import { BOOK_THESIS } from "./book";
import type { Chain, Position, Scenario, Snapshot, Ticket, WatchItem } from "./types";

export function WatchlistWidget({ items }: { items: WatchItem[] }) {
  return (
    <table className="grid-table compact">
      <thead>
        <tr>
          <th>Scrip</th>
          <th>Note</th>
          <th className="num">LTP</th>
          <th className="num">Chg</th>
        </tr>
      </thead>
      <tbody>
        {items.map((w) => {
          const up = w.change >= 0;
          return (
            <tr key={w.symbol}>
              <td>{w.symbol}</td>
              <td className="dim">{w.note}</td>
              <td className="num">{w.ltp.toLocaleString("en-IN")}</td>
              <td className={`num ${up ? "green" : "red"}`}>
                {up ? "+" : ""}
                {w.change.toFixed(1)} ({w.changePct.toFixed(2)}%)
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function MarketWidget({ data }: { data: Snapshot }) {
  const up = data.change >= 0;
  return (
    <div className="stat-strip widget-strip">
      <div className="stat">
        <div className={`stat-value ${up ? "green" : "red"}`}>
          {data.spot.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
        </div>
        <div className="stat-label">
          NIFTY {up ? "▲" : "▼"} {Math.abs(data.change).toFixed(1)} ({data.changePct.toFixed(2)}%)
        </div>
      </div>
      <div className="stat">
        <div className="stat-value">{data.futures.toLocaleString("en-IN")}</div>
        <div className="stat-label">Futures</div>
      </div>
      <div className="stat">
        <div className="stat-value">{data.vix}</div>
        <div className="stat-label">India VIX</div>
      </div>
      <div className="stat">
        <div className={`stat-value ${data.totalMtm >= 0 ? "green" : "red"}`}>{inr(data.totalMtm)}</div>
        <div className="stat-label">Book MTM</div>
      </div>
      <div className="stat">
        <div className="stat-value">{data.netDeltaUnits}</div>
        <div className="stat-label">Net Δ units</div>
      </div>
      <div className="stat">
        <div className="stat-value">{data.daysToExpiry}d</div>
        <div className="stat-label">To expiry</div>
      </div>
    </div>
  );
}

export function PositionsWidget({
  positions,
  compact = false,
}: {
  positions: Position[];
  compact?: boolean;
}) {
  const totalMtm = positions.reduce((s, p) => s + p.mtm, 0);
  return (
    <div>
      <p className="book-thesis">{BOOK_THESIS}</p>
      {!compact && (
        <div className="dim small" style={{ marginBottom: 6 }}>
          Overall MTM <b className={totalMtm >= 0 ? "green" : "red"}>{inr(totalMtm)}</b>
        </div>
      )}
      <table className="grid-table compact">
        <thead>
          <tr>
            <th>Instrument</th>
            <th>Side</th>
            <th className="num">Lots</th>
            {!compact && <th className="num">Avg</th>}
            <th className="num">LTP</th>
            <th className="num">MTM</th>
            <th className="num">Δ</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.id}>
              <td>{p.instrument}</td>
              <td>
                <span className={p.side === "BUY" ? "badge buy" : "badge sell"}>{p.side}</span>
              </td>
              <td className="num">{p.lots}</td>
              {!compact && <td className="num">{p.avgPrice.toLocaleString("en-IN")}</td>}
              <td className="num">{p.ltp.toLocaleString("en-IN")}</td>
              <td className={`num ${p.mtm >= 0 ? "green" : "red"}`}>{inr(p.mtm)}</td>
              <td className="num">{p.greeks.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChainWidget({
  chain,
  highlightStrike,
}: {
  chain: Chain;
  highlightStrike?: number;
}) {
  return (
    <table className="grid-table chain-table compact">
      <thead>
        <tr>
          <th className="num">OI</th>
          <th className="num">IV</th>
          <th className="num ce-col">CE LTP</th>
          <th className="num strike-col">Strike</th>
          <th className="num pe-col">PE LTP</th>
          <th className="num">IV</th>
          <th className="num">OI</th>
        </tr>
      </thead>
      <tbody>
        {chain.rows.map((r) => (
          <tr
            key={r.strike}
            className={[r.isAtm ? "atm-row" : "", r.strike === highlightStrike ? "book-row" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <td className="num dim">{(r.ce.oi / 1000).toFixed(0)}k</td>
            <td className="num dim">{r.ce.iv}</td>
            <td className="num ce-col">{r.ce.ltp.toLocaleString("en-IN")}</td>
            <td className="num strike-col">
              {r.strike.toLocaleString("en-IN")}
              {r.strike === highlightStrike ? " · short" : r.isAtm ? " · ATM" : ""}
            </td>
            <td className="num pe-col">{r.pe.ltp.toLocaleString("en-IN")}</td>
            <td className="num dim">{r.pe.iv}</td>
            <td className="num dim">{(r.pe.oi / 1000).toFixed(0)}k</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ScenarioCard({ data, bare = false }: { data: Scenario; bare?: boolean }) {
  const s = data.scenario;
  return (
    <div className={bare ? "scenario-bare" : "card scenario-card"}>
      {!bare && (
        <div className="card-title">
          SCENARIO · NIFTY {s.spotNow.toLocaleString("en-IN")} → {s.spotScenario.toLocaleString("en-IN")}
          {s.daysForward > 0 ? ` · +${s.daysForward}d` : ""}
          {s.ivChangePts !== 0 ? ` · IV ${s.ivChangePts > 0 ? "+" : ""}${s.ivChangePts}pt` : ""}
        </div>
      )}
      {bare && (
        <p className="scenario-path dim">
          {s.spotNow.toLocaleString("en-IN", { maximumFractionDigits: 0 })} →{" "}
          {s.spotScenario.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>Leg</th>
            <th className="num">Now</th>
            <th className="num">Then</th>
            <th className="num">P&L</th>
          </tr>
        </thead>
        <tbody>
          {data.legs.map((l) => (
            <tr key={l.instrument + l.side}>
              <td>
                {l.side} {l.lots}L {l.instrument}
              </td>
              <td className="num">{l.priceNow.toLocaleString("en-IN")}</td>
              <td className="num">{l.priceScenario.toLocaleString("en-IN")}</td>
              <td className={`num ${l.pnlChange >= 0 ? "green" : "red"}`}>{inr(l.pnlChange)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="card-total">
        Book impact{" "}
        <b className={data.totalPnlChange >= 0 ? "green" : "red"}>{inr(data.totalPnlChange)}</b>
      </div>
    </div>
  );
}

export function TicketCard({
  data,
  onOrderChange,
  quiet = false,
}: {
  data: Ticket;
  onOrderChange: () => void;
  quiet?: boolean;
}) {
  const [status, setStatus] = useState(data.status);
  const [err, setErr] = useState("");

  const act = async (fn: typeof confirmTicket, next: Ticket["status"]) => {
    const res = await fn(data.id);
    if (res.error) setErr(res.error);
    else {
      setStatus(next);
      onOrderChange();
    }
  };

  return (
    <div className={`card ticket-card ${quiet ? "quiet" : ""} ${status !== "PENDING" ? "settled" : ""}`}>
      {quiet ? (
        <div className="ticket-name">
          {data.label}
          {status !== "PENDING" && (
            <span className={`badge status-${status.toLowerCase()}`}>{status === "EXECUTED" ? "Done" : "Passed"}</span>
          )}
        </div>
      ) : (
        <div className="card-title">
          ORDER TICKET · {data.label.toUpperCase()}
          <span className={`badge status-${status.toLowerCase()}`}>{status}</span>
        </div>
      )}
      {data.rationale && <div className="rationale">{data.rationale}</div>}
      <table>
        <thead>
          <tr>
            <th>Leg</th>
            <th className="num">Lots</th>
            <th className="num">Est.</th>
          </tr>
        </thead>
        <tbody>
          {data.legs.map((l) => (
            <tr key={l.id}>
              <td>
                <span className={l.side === "BUY" ? "badge buy" : "badge sell"}>{l.side}</span> {l.instrument}
              </td>
              <td className="num">{l.lots}</td>
              <td className="num">{l.entryPrice.toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ticket-stats">
        <span>
          Premium <b>{data.netPremium >= 0 ? "+" : ""}{inr(data.netPremium)}</b>
        </span>
        {!quiet && (
          <>
            <span>
              Margin <b>{inr(data.estMargin)}</b>
            </span>
            <span>
              Max profit{" "}
              <b className="green">{typeof data.maxProfit === "number" ? inr(data.maxProfit) : data.maxProfit}</b>
            </span>
            <span>
              Max loss{" "}
              <b className="red">{typeof data.maxLoss === "number" ? inr(data.maxLoss) : data.maxLoss}</b>
            </span>
          </>
        )}
        {quiet && (
          <span>
            Margin <b>{inr(data.estMargin)}</b>
          </span>
        )}
      </div>
      {data.warnings.map((w) => (
        <div key={w} className="warning">
          {w}
        </div>
      ))}
      {err && <div className="warning">{err}</div>}
      {status === "PENDING" && (
        <div className="ticket-actions">
          <button className="btn confirm" onClick={() => act(confirmTicket, "EXECUTED")}>
            Confirm
          </button>
          <button className="btn reject" onClick={() => act(rejectTicket, "REJECTED")}>
            {quiet ? "Not this" : "Reject"}
          </button>
          {!quiet && <span className="dim small">You approve every trade — Genie only drafts.</span>}
        </div>
      )}
    </div>
  );
}
