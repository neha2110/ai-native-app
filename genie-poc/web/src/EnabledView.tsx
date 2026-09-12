import ClassicView from "./ClassicView";
import AskAgent from "./AskAgent";
import { ASK_CHIPS } from "./chips";
import { CLOCK_MARKET, CLOCK_NEWS } from "./briefs";
import type { Position, Snapshot, WatchItem } from "./types";

export default function EnabledView({
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

  return (
    <div className="enabled">
      <ClassicView
        snap={snap}
        positions={positions}
        watchlist={watchlist}
        onOrderChange={onOrderChange}
        hideWatcherDrafts
        emptyOrders="No orders yet. Ask Genie to draft one — then confirm."
        news={news}
      />
      <aside className="genie-dock">
        <DockBrief clockId={clockId} snap={snap} bankLtp={bank?.ltp} news={news} market={market} />
        <AskAgent
          variant="dock"
          tone="explain"
          chips={ASK_CHIPS[clockId] || []}
          onBookChange={onOrderChange}
        />
      </aside>
    </div>
  );
}

export function DockBrief({
  clockId,
  snap,
  bankLtp,
  news,
  market,
}: {
  clockId: string;
  snap: Snapshot | null;
  bankLtp?: number;
  news: { source: string; title: string; time: string }[];
  market: (typeof CLOCK_MARKET)[string];
}) {
  const time = { "0915": "09:15", "0942": "09:42", "1120": "11:20", "1405": "14:05", "1531": "15:31" }[clockId] || clockId;

  return (
    <div className="dock-brief">
      <section className="dock-card">
        <p className="dock-kicker">Market · {time}</p>
        <h2 className="dock-headline">{market.headline}</h2>
        <p className="dock-summary">{market.body}</p>
        {snap && (
          <p className="dock-stats dim">
            Nifty {snap.spot.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            {bankLtp != null ? ` · Banknifty ${bankLtp.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : ""}
            {" · "}
            VIX {snap.vix}
          </p>
        )}
        <ul className="dock-sectors">
          {market.sectors.map((s) => (
            <li key={s.name}>
              <span className="dock-sector-name">{s.name}</span>
              <span className={`dock-sector-bias ${s.bias}`}>
                {s.bias === "up" ? "▲" : s.bias === "down" ? "▼" : "–"}
              </span>
              <span className="dim">{s.note}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="dock-card">
        <p className="dock-kicker">News</p>
        <ul className="dock-news">
          {news.map((n) => (
            <li key={n.title}>
              <span className="dock-news-meta">
                {n.source} · {n.time}
              </span>
              {n.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
