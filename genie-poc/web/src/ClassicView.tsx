import { useEffect, useState } from "react";
import { confirmTicket, fetchChain, fetchOrders, inr, rejectTicket } from "./api";
import { BOOK_THESIS } from "./book";
import type { NewsItem } from "./briefs";
import type { Chain, ExtraTab, Position, Snapshot, Ticket, WatchItem } from "./types";
import { PriceChart } from "./Sparkline";
import { buildPricePath, pathReturnPct } from "./pricePath";

type Tab = string;

const CORE_TABS = [
  ["explore", "Explore"],
  ["portfolio", "Portfolio"],
  ["positions", "Positions"],
  ["chain", "Option Chain"],
  ["orders", "Orders"],
] as const;

const RAIL_EXTRA = [
  { symbol: "PINELABS", ltp: 202.17, change: 29.0, pct: 16.75 },
  { symbol: "PWL", ltp: 136.1, change: 9.37, pct: 7.39 },
  { symbol: "YESBANK", ltp: 23.48, change: 1.18, pct: 5.29 },
  { symbol: "INDUSTOWER", ltp: 388.0, change: 36.6, pct: 10.3 },
  { symbol: "GROWW", ltp: 200.24, change: 4.4, pct: 2.25 },
  { symbol: "SUZLON", ltp: 71.42, change: 3.18, pct: 4.66 },
  { symbol: "IDEA", ltp: 8.92, change: 0.41, pct: 4.82 },
  { symbol: "IRFC", ltp: 142.3, change: -1.85, pct: -1.28 },
];

const HOT = [
  { name: "HDFCBANK", tag: "H", ltp: 708.25, chg: 14.45, pct: 2.08 },
  { name: "ESDS", tag: "E", ltp: 1740.4, chg: 158.2, pct: 10.0 },
  { name: "PINELABS", tag: "P", ltp: 202.17, chg: 29.0, pct: 16.75 },
  { name: "BSE", tag: "BSE", ltp: 3384.7, chg: 78.0, pct: 2.36 },
  { name: "CRUDEOIL", tag: "C", ltp: 9532.0, chg: -190.0, pct: -1.95 },
];

const TRADED = [
  { name: "RELIANCE", tag: "R", ltp: 1384.2, chg: -8.45, pct: -0.61 },
  { name: "TCS", tag: "T", ltp: 3921.0, chg: 22.1, pct: 0.57 },
  { name: "INFY", tag: "I", ltp: 1512.4, chg: 18.9, pct: 1.27 },
  { name: "SBIN", tag: "S", ltp: 812.55, chg: 6.4, pct: 0.79 },
  { name: "GOLD", tag: "G", ltp: 72840, chg: 210, pct: 0.29 },
];

const BTX = [
  { name: "CDMO PLAY", by: "By Motilal Oswal F…", min: "₹43,072.75" },
  { name: "CHEMICAL BASKET", by: "Min investment", min: "₹36,474.20" },
  { name: "PRECISION ENGIN…", by: "Min investment", min: "₹18,980.37" },
  { name: "METAL BASKET", by: "Min investment", min: "₹22,410.00" },
];

const HOLDINGS = [
  { name: "HDFCBANK", qty: 40, ltp: 708.25, value: 28330, pnl: 612 },
  { name: "RELIANCE", qty: 15, ltp: 1384.2, value: 20763, pnl: -128 },
  { name: "MOTILALOFS", qty: 50, ltp: 912.4, value: 45620, pnl: 1840 },
  { name: "NIFTYBEES", qty: 120, ltp: 268.1, value: 32172, pnl: 410 },
];

export default function ClassicView({
  snap,
  positions,
  watchlist,
  onOrderChange,
  hideWatcherDrafts = false,
  emptyOrders = "No orders. Place one from a Buy/Sell on Explore — or switch to AI-enabled and ask.",
  openTab,
  onGenieClick,
  news,
  extraTabs = [],
  onCloseTab,
  selectedSymbols = [],
  onToggleSymbol,
  onFillSelected,
}: {
  snap: Snapshot | null;
  positions: Position[];
  watchlist: WatchItem[];
  onOrderChange: () => void;
  hideWatcherDrafts?: boolean;
  emptyOrders?: string;
  openTab?: string;
  onGenieClick?: () => void;
  news?: NewsItem[];
  extraTabs?: ExtraTab[];
  onCloseTab?: (id: string) => void;
  selectedSymbols?: string[];
  onToggleSymbol?: (symbol: string) => void;
  onFillSelected?: () => void;
}) {
  const [tab, setTab] = useState<Tab>(openTab || "explore");
  const [chain, setChain] = useState<Chain | null>(null);
  const [orders, setOrders] = useState<Ticket[]>([]);
  const [fundAmt, setFundAmt] = useState("5000");

  useEffect(() => {
    if (openTab) setTab(openTab);
  }, [openTab]);

  useEffect(() => {
    const load = () => {
      fetchChain().then(setChain).catch(() => {});
      fetchOrders().then((r) => setOrders(r.orders)).catch(() => {});
    };
    load();
    const t = setInterval(load, 1000);
    return () => clearInterval(t);
  }, []);

  const visibleOrders = (hideWatcherDrafts
    ? orders.filter((o) => o.origin !== "watcher" || o.status !== "PENDING")
    : orders
  ).filter((o) => o.status !== "REJECTED");
  const totalMtm = positions.reduce((s, p) => s + p.mtm, 0);
  const bank = watchlist.find((w) => w.symbol.includes("BANK"));
  const niftyUp = (snap?.change ?? 0) >= 0;

  return (
    <div className="classic">
      <div className="riise-chrome">
        <div className="riise-top">
          <button type="button" className="trade-tab on">
            Trade <span className="live">LIVE</span>
          </button>
          <button type="button" className="trade-tab">
            StratX
          </button>
          {snap && (
            <span className="idx">
              Nifty{" "}
              <b>{snap.spot.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b>{" "}
              <span className={niftyUp ? "green" : "red"}>
                {niftyUp ? "+" : ""}
                {snap.change.toFixed(2)} ({snap.changePct.toFixed(2)}%)
              </span>
            </span>
          )}
          {bank && (
            <span className="idx">
              Nifty Bank <b>{bank.ltp.toLocaleString("en-IN")}</b>{" "}
              <span className={bank.change >= 0 ? "green" : "red"}>
                {bank.change >= 0 ? "+" : ""}
                {bank.change.toFixed(2)} ({bank.changePct.toFixed(2)}%)
              </span>
            </span>
          )}
          {bank && (
            <span className="idx">
              Sensex <b>{(bank.ltp * 1.3218).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b>{" "}
              <span className={bank.change >= 0 ? "green" : "red"}>
                {bank.change >= 0 ? "+" : ""}
                {(bank.change * 0.9).toFixed(2)} ({(bank.changePct * 0.72).toFixed(2)}%)
              </span>
            </span>
          )}
          {snap && (
            <span className="idx">
              VIX <b>{snap.vix}</b>
            </span>
          )}
          <span className="toolbar-spacer" />
          <span className="funds-chip">
            ₹0.00 <button type="button" className="funds-plus">+</button>
          </span>
          <span className="avatar">NS</span>
        </div>
        {news && news.length > 0 && (
          <div className="news-ticker" aria-label="Market news">
            {news.map((n) => (
              <span key={n.title} className="news-tick">
                <b>{n.source}</b> {n.title}
              </span>
            ))}
          </div>
        )}

        <div className="classic-mid">
          <aside className="rail">
            <div className="rail-search">Search scrips</div>
            <div className="rail-filter">
              Trending Under 500 <span className="dim">▾</span>
            </div>
            <div className="rail-cols">
              <span>Scrips</span>
              <span>Change(%)</span>
            </div>
            {RAIL_EXTRA.map((w) => (
              <RailQuote key={w.symbol} name={w.symbol} value={w.ltp} chg={w.change} pct={w.pct} />
            ))}
            <div className="rail-cols" style={{ marginTop: 10 }}>
              <span>F&O book</span>
              <span>LTP</span>
            </div>
            {watchlist.map((w) => (
              <RailQuote
                key={w.symbol}
                name={w.symbol}
                value={w.ltp}
                chg={w.change}
                pct={w.changePct}
              />
            ))}
          </aside>

          <div className="classic-body">
            <nav className="riise-nav">
              {CORE_TABS.map(([id, label]) => (
                <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
              {extraTabs.map((t) => (
                <span key={t.id} className={`extra-tab ${tab === t.id ? "on" : ""}`}>
                  <button type="button" onClick={() => setTab(t.id)}>
                    {t.title}
                    {t.pinned ? <span className="tab-pin">Default</span> : null}
                  </button>
                  {onCloseTab && (
                    <button
                      type="button"
                      className="tab-x"
                      aria-label={`Remove ${t.title}`}
                      onClick={() => onCloseTab(t.id)}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              <span className="toolbar-spacer" />
              <button type="button" className="older">
                Switch to Older Version
              </button>
            </nav>

            <main className="main">
              {tab === "explore" && (
                <ExploreHome
                  fundAmt={fundAmt}
                  setFundAmt={setFundAmt}
                  snap={snap}
                  totalMtm={totalMtm}
                />
              )}

              {tab === "portfolio" && (
                <div>
                  <div className="stat-strip">
                    <div className="stat">
                      <div className="stat-value">₹4.82 L</div>
                      <div className="stat-label">Equity value (demo)</div>
                    </div>
                    <div className="stat">
                      <div className={`stat-value ${totalMtm >= 0 ? "green" : "red"}`}>{inr(totalMtm)}</div>
                      <div className="stat-label">F&O MTM</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">₹0.00</div>
                      <div className="stat-label">Available funds</div>
                    </div>
                  </div>
                  <p className="loaded-note dim">Holdings, MFs, US stocks and more would sit here. Your F&O book is under Positions.</p>
                  <table className="grid-table">
                    <thead>
                      <tr>
                        <th>Holding</th>
                        <th className="num">Qty</th>
                        <th className="num">LTP</th>
                        <th className="num">Value</th>
                        <th className="num">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {HOLDINGS.map((h) => (
                        <tr key={h.name}>
                          <td>{h.name}</td>
                          <td className="num">{h.qty}</td>
                          <td className="num">{h.ltp.toLocaleString("en-IN")}</td>
                          <td className="num">{h.value.toLocaleString("en-IN")}</td>
                          <td className={`num ${h.pnl >= 0 ? "green" : "red"}`}>
                            {h.pnl >= 0 ? "+" : ""}
                            {h.pnl.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" className="linkish" onClick={() => setTab("positions")}>
                    Go to Positions →
                  </button>
                </div>
              )}

              {tab === "positions" && (
                <>
                  <p className="book-thesis">{BOOK_THESIS}</p>
                  <div className="stat-strip">
                    <div className="stat">
                      <div className={`stat-value ${totalMtm >= 0 ? "green" : "red"}`}>{inr(totalMtm)}</div>
                      <div className="stat-label">Overall MTM</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{snap ? inr(snap.usedMargin) : "—"}</div>
                      <div className="stat-label">Margin used</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{snap ? snap.netDeltaUnits : "—"}</div>
                      <div className="stat-label">Net delta (units)</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{snap ? `${snap.daysToExpiry}d` : "—"}</div>
                      <div className="stat-label">To expiry</div>
                    </div>
                  </div>
                  <table className="grid-table">
                    <thead>
                      <tr>
                        <th>Instrument</th>
                        <th>Side</th>
                        <th className="num">Lots</th>
                        <th className="num">Avg</th>
                        <th className="num">LTP</th>
                        <th className="num">MTM</th>
                        <th className="num">Δ units</th>
                        <th className="num">θ/day</th>
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
                          <td className="num">{p.avgPrice.toLocaleString("en-IN")}</td>
                          <td className="num">{p.ltp.toLocaleString("en-IN")}</td>
                          <td className={`num ${p.mtm >= 0 ? "green" : "red"}`}>{inr(p.mtm)}</td>
                          <td className="num">{p.greeks.delta}</td>
                          <td className="num">{p.greeks.theta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {tab === "chain" && chain && (
                <table className="grid-table chain-table">
                  <thead>
                    <tr>
                      <th className="num">OI</th>
                      <th className="num">IV</th>
                      <th className="num">Δ</th>
                      <th className="num ce-col">CE LTP</th>
                      <th className="num strike-col">STRIKE</th>
                      <th className="num pe-col">PE LTP</th>
                      <th className="num">Δ</th>
                      <th className="num">IV</th>
                      <th className="num">OI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chain.rows.map((r) => (
                      <tr key={r.strike} className={r.isAtm ? "atm-row" : ""}>
                        <td className="num dim">{(r.ce.oi / 1000).toFixed(0)}k</td>
                        <td className="num dim">{r.ce.iv}</td>
                        <td className="num dim">{r.ce.delta}</td>
                        <td className="num ce-col">{r.ce.ltp.toLocaleString("en-IN")}</td>
                        <td className="num strike-col">
                          {r.strike.toLocaleString("en-IN")}
                          {r.isAtm ? " ·ATM" : ""}
                        </td>
                        <td className="num pe-col">{r.pe.ltp.toLocaleString("en-IN")}</td>
                        <td className="num dim">{r.pe.delta}</td>
                        <td className="num dim">{r.pe.iv}</td>
                        <td className="num dim">{(r.pe.oi / 1000).toFixed(0)}k</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "orders" && (
                <div className="orders-list">
                  {visibleOrders.length === 0 && <div className="empty">{emptyOrders}</div>}
                  {visibleOrders.map((o) => (
                    <div key={o.id} className="order-row">
                      <div>
                        <b>{o.label}</b>{" "}
                        <span className={`badge status-${o.status.toLowerCase()}`}>{o.status}</span>
                        <div className="dim small">
                          {o.legs.map((l) =>
                            l.kind === "EQ"
                              ? `${l.side} ${l.qty ?? l.lots} ${l.instrument} @ ${l.entryPrice}`
                              : `${l.side} ${l.lots}L ${l.instrument} @ ${l.entryPrice}`,
                          ).join(" · ")}
                        </div>
                        {o.form && (
                          <div className="order-form">
                            <span>
                              <em>Exch</em> {o.form.exchange}
                            </span>
                            <span>
                              <em>Scrip</em> {o.form.scrip}
                            </span>
                            <span>
                              <em>Side</em> {o.form.side}
                            </span>
                            <span>
                              <em>Qty</em> {o.form.qty}
                            </span>
                            <span>
                              <em>Type</em> {o.form.orderType} {o.form.price.toLocaleString("en-IN")}
                            </span>
                            <span>
                              <em>Product</em> {o.form.product}
                            </span>
                            <span>
                              <em>Validity</em> {o.form.validity}
                            </span>
                          </div>
                        )}
                      </div>
                      {o.status === "PENDING" && (
                        <div className="order-actions">
                          <button
                            className="btn confirm"
                            onClick={() =>
                              confirmTicket(o.id).then(() => {
                                onOrderChange();
                                fetchOrders().then((r) => setOrders(r.orders));
                              })
                            }
                          >
                            Confirm
                          </button>
                          <button
                            className="btn reject"
                            onClick={() =>
                              rejectTicket(o.id).then(() => {
                                onOrderChange();
                                fetchOrders().then((r) => setOrders(r.orders));
                              })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {extraTabs.map(
                (xt) =>
                  tab === xt.id && (
                    <ExtraTabPanel
                      key={xt.id}
                      tab={xt}
                      selectedSymbols={selectedSymbols}
                      onToggleSymbol={onToggleSymbol}
                      onFillSelected={onFillSelected}
                    />
                  ),
              )}
            </main>
          </div>
        </div>
      </div>

      {onGenieClick && (
        <button type="button" className="mo-genie-fab" onClick={onGenieClick} title="MO Genie">
          moGenie
        </button>
      )}
    </div>
  );
}

function ExploreHome({
  fundAmt,
  setFundAmt,
  snap,
  totalMtm,
}: {
  fundAmt: string;
  setFundAmt: (s: string) => void;
  snap: Snapshot | null;
  totalMtm: number;
}) {
  const [hotTab, setHotTab] = useState<"searched" | "traded">("searched");
  const cards = hotTab === "searched" ? HOT : TRADED;
  return (
    <div className="explore">
      <div className="funds-banner">
        <div>
          <div className="funds-hello">Hey Neha,</div>
          <div className="funds-title">We’re thrilled to have you on board.</div>
          <div className="dim small">Let’s start your trading journey by adding funds.</div>
        </div>
        <div className="funds-box">
          <div className="small dim">Enter amount to add</div>
          <div className="funds-row">
            <span>₹</span>
            <input value={fundAmt} onChange={(e) => setFundAmt(e.target.value)} />
            <button type="button" className="add-funds">
              Add Funds
            </button>
          </div>
          <div className="fund-pills">
            {["5000", "10000", "50000"].map((n) => (
              <button key={n} type="button" className={fundAmt === n ? "on" : ""} onClick={() => setFundAmt(n)}>
                + ₹{Number(n).toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="hot-head">
        <h2>Hot Stocks</h2>
        <div className="hot-tabs">
          <button type="button" className={hotTab === "searched" ? "on" : ""} onClick={() => setHotTab("searched")}>
            Most Searched
          </button>
          <button type="button" className={hotTab === "traded" ? "on" : ""} onClick={() => setHotTab("traded")}>
            Most Traded
          </button>
        </div>
      </div>
      <div className="hot-row">
        {cards.map((h) => {
          const up = h.chg >= 0;
          return (
            <div key={h.name} className="hot-card">
              <div className="hot-tag">{h.tag}</div>
              <div className="hot-name">{h.name}</div>
              <div className="small dim">NSE</div>
              <div className="hot-px">
                {h.ltp.toLocaleString("en-IN")}{" "}
                <span className={up ? "green" : "red"}>
                  {up ? "+" : ""}
                  {h.chg.toFixed(2)} ({up ? "+" : ""}
                  {h.pct.toFixed(2)}%)
                </span>
              </div>
              <div className="hot-actions">
                <button type="button" className="bs buy">
                  Buy
                </button>
                <button type="button" className="bs sell">
                  Sell
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hot-head" style={{ marginTop: 22 }}>
        <h2>All BTX</h2>
        <span className="view-all">View All</span>
      </div>
      <div className="btx-row">
        {BTX.map((b) => (
          <div key={b.name} className="btx-card">
            <div className="btx-letter">{b.name[0]}</div>
            <div>
              <div className="btx-name">{b.name}</div>
              <div className="small dim">{b.by}</div>
              <div className="btx-min">
                Min investment <b>{b.min}</b>
              </div>
              <span className="btx-pill">New</span> <span className="btx-pill ghost">Free Subscription</span>
            </div>
          </div>
        ))}
      </div>

      <p className="loaded-note dim">
        F&O book MTM {inr(totalMtm)}
        {snap ? ` · NIFTY ${snap.spot.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : ""}. Buried under Explore.
      </p>
    </div>
  );
}

function RailQuote({
  name,
  value,
  chg,
  pct,
}: {
  name: string;
  value: number;
  chg: number;
  pct: number;
}) {
  const up = chg >= 0;
  return (
    <div className="rail-quote">
      <div>
        <div className="rail-name">{name}</div>
        <div className="small dim">NSE</div>
      </div>
      <div className="rail-right">
        <div>{value.toLocaleString("en-IN")}</div>
        <div className={`small ${up ? "green" : "red"}`}>
          {up ? "+" : ""}
          {chg.toFixed(2)} ({up ? "+" : ""}
          {pct.toFixed(2)}%)
        </div>
      </div>
    </div>
  );
}

function ExtraTabPanel({
  tab,
  selectedSymbols,
  onToggleSymbol,
  onFillSelected,
}: {
  tab: ExtraTab;
  selectedSymbols: string[];
  onToggleSymbol?: (symbol: string) => void;
  onFillSelected?: () => void;
}) {
  const showPlot = tab.kind === "watchlist-history" || tab.kind === "performance";
  const showScreen = tab.kind === "screener";
  const rows = tab.rows || [];

  if (tab.kind === "watchlist-history") {
    return (
      <div className="extra-panel">
        <div className="hot-head">
          <h2>{tab.title}</h2>
          <span className="dim small">Last 1 month · daily close</span>
        </div>
        <div className="plot-grid">
          {rows.map((r) => {
            const path = r.path && r.path.length >= 24 ? r.path : buildPricePath(r.symbol, r.ltp);
            const period = pathReturnPct(path);
            const todayUp = (r.changePct ?? 0) >= 0;
            const periodUp = period >= 0;
            return (
              <article key={r.symbol} className="plot-card">
                <header className="plot-card-head">
                  <div>
                    <b>{r.symbol}</b>
                    <div className="small dim">
                      {r.name}
                      {r.sector ? ` · ${r.sector}` : ""}
                    </div>
                  </div>
                  <div className="plot-px">
                    <div>{r.ltp.toLocaleString("en-IN")}</div>
                    <div className={`small ${todayUp ? "green" : "red"}`}>
                      {todayUp ? "+" : ""}
                      {(r.changePct ?? 0).toFixed(2)}% today
                    </div>
                  </div>
                </header>
                <PriceChart values={path} size="md" />
                <footer className="plot-card-foot">
                  <span>1M</span>
                  <span className={periodUp ? "green" : "red"}>
                    {path[0].toLocaleString("en-IN")} → {path[path.length - 1].toLocaleString("en-IN")}{" "}
                    {periodUp ? "+" : ""}
                    {period}%
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="extra-panel">
      <div className="hot-head">
        <h2>{tab.title}</h2>
        {tab.filterNote && <span className="dim small">{tab.filterNote}</span>}
        {showScreen && (
          <button
            type="button"
            className="add-funds"
            disabled={!selectedSymbols.length}
            onClick={onFillSelected}
          >
            Fill order for selected
          </button>
        )}
      </div>
      {showScreen && (
        <p className="dim small">Select names, then fill the Orders ticket. You still Confirm.</p>
      )}
      <table className="grid-table">
        <thead>
          <tr>
            {showScreen && <th />}
            <th>Scrip</th>
            <th>Sector</th>
            <th className="num">LTP</th>
            {showScreen && (
              <>
                <th className="num">PE</th>
                <th className="num">PB</th>
                <th className="num">ROE</th>
              </>
            )}
            {tab.kind === "performance" && (
              <>
                <th className="num">Qty</th>
                <th className="num">1M</th>
              </>
            )}
            {showPlot && <th>Trend</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const up = (r.changePct ?? 0) >= 0;
            const checked = selectedSymbols.includes(r.symbol);
            return (
              <tr key={r.symbol}>
                {showScreen && (
                  <td>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSymbol?.(r.symbol)}
                    />
                  </td>
                )}
                <td>
                  <b>{r.symbol}</b>
                  {r.name && <div className="small dim">{r.name}</div>}
                </td>
                <td className="dim">{r.sector}</td>
                <td className={`num ${up ? "green" : "red"}`}>{r.ltp.toLocaleString("en-IN")}</td>
                {showScreen && (
                  <>
                    <td className="num">{r.pe}</td>
                    <td className="num">{r.pb}</td>
                    <td className="num">{r.roe}%</td>
                  </>
                )}
                {tab.kind === "performance" && (
                  <>
                    <td className="num">{r.qty}</td>
                    <td className={`num ${(r.pnlPct ?? 0) >= 0 ? "green" : "red"}`}>
                      {(r.pnlPct ?? 0) >= 0 ? "+" : ""}
                      {r.pnlPct}%
                    </td>
                  </>
                )}
                {showPlot && (
                  <td className="plot-cell">
                    <PriceChart
                      values={r.path && r.path.length >= 24 ? r.path : buildPricePath(r.symbol, r.ltp)}
                      size="sm"
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
