export interface WatchItem {
  symbol: string;
  kind: "INDEX" | "FUT" | "OPT" | "VIX";
  ltp: number;
  change: number;
  changePct: number;
  note?: string;
}

export interface Snapshot {
  index: string;
  spot: number;
  change: number;
  changePct: number;
  futures: number;
  vix: number;
  expiry: string;
  daysToExpiry: number;
  lotSize: number;
  totalMtm: number;
  netDeltaUnits: number;
  availableMargin: number;
  usedMargin: number;
  asOf: string;
  note: string;
}

export interface Position {
  id: string;
  instrument: string;
  kind: "FUT" | "CE" | "PE" | "EQ";
  strike: number | null;
  side: "BUY" | "SELL";
  lots: number;
  qty?: number;
  avgPrice: number;
  openedAt: string;
  ltp: number;
  mtm: number;
  greeks: { delta: number; gamma: number; theta: number; vega: number };
}

export interface ChainSide {
  ltp: number;
  iv: number;
  oi: number;
  oiChgPct: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface ChainRow {
  strike: number;
  isAtm: boolean;
  ce: ChainSide;
  pe: ChainSide;
}

export interface Chain {
  spot: number;
  atm: number;
  expiry: string;
  rows: ChainRow[];
}

export interface TicketLeg {
  id: string;
  instrument: string;
  kind: "FUT" | "CE" | "PE" | "EQ";
  strike: number | null;
  side: "BUY" | "SELL";
  lots: number;
  qty?: number;
  entryPrice: number;
  orderType: string;
}

export interface OrderForm {
  exchange: string;
  scrip: string;
  side: string;
  product: string;
  orderType: string;
  qty: number;
  price: number;
  validity: string;
  disclosedQty: number;
}

export interface Ticket {
  id: string;
  label: string;
  legs: TicketLeg[];
  estMargin: number;
  netPremium: number;
  maxProfit: number | "Unlimited";
  maxLoss: number | "Unlimited";
  warnings: string[];
  rationale: string;
  status: "PENDING" | "EXECUTED" | "REJECTED";
  createdAt: string;
  origin?: "watcher" | "ask";
  form?: OrderForm;
}

export interface ScreenerRow {
  symbol: string;
  name?: string;
  sector?: string;
  ltp: number;
  pe?: number;
  pb?: number;
  roe?: number;
  changePct?: number;
  path?: number[];
  qty?: number;
  pnlPct?: number;
}

export interface ExtraTab {
  id: string;
  kind: "watchlist" | "watchlist-history" | "performance" | "screener";
  title: string;
  closable?: boolean;
  pinned?: boolean;
  filterNote?: string;
  rows?: ScreenerRow[];
}

export type WorkspaceEvent = {
  action?: string;
  which?: string;
  tab?: ExtraTab;
  tickets?: Ticket[];
  count?: number;
};

export interface ScenarioLeg {
  instrument: string;
  side: string;
  lots: number;
  priceNow: number;
  priceScenario: number;
  pnlChange: number;
}

export interface Scenario {
  scenario: { spotNow: number; spotScenario: number; daysForward: number; ivChangePts: number };
  legs: ScenarioLeg[];
  totalPnlChange: number;
  currentMtm: number;
  note: string;
}

export type WidgetKind =
  | "market"
  | "watchlist"
  | "positions"
  | "chain"
  | "scenario"
  | "ticket"
  | "raw"
  | "workspace"
  | "screener";

export interface ToolStep {
  id: string;
  tool: string;
  label: string;
  args?: Record<string, unknown>;
  widget?: WidgetKind;
  data?: unknown;
  summary?: string;
  status: "running" | "done";
}

export interface AttributionLeg {
  instrument: string;
  mtmMorning: number;
  mtmNow: number;
  delta: number;
}

export interface ClockStep {
  id: string;
  time: string;
  label: string;
}

export interface PathPoint {
  id: string;
  time: string;
  label: string;
  spot: number;
  mtm: number;
  vix: number;
}

export interface Situation {
  clocks: ClockStep[];
  clockId: string;
  time: string;
  hasNext: boolean;
  kicker: string;
  headline: string;
  terse: string;
  explain: string;
  evidence: "positions" | "scenario" | "watchlist" | "chain" | "attribution";
  snapshot: Snapshot;
  positions: Position[];
  tickets: Ticket[];
  scenario: Scenario | null;
  chain: Chain | null;
  watchlist: { items: WatchItem[] } | null;
  attribution: AttributionLeg[] | null;
  morning: { spot: number; mtm: number; plan: string } | null;
  path: PathPoint[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  steps?: ToolStep[];
  statusLabel?: string;
  streaming?: boolean;
  score?: "no" | "maybe" | "yes";
}
