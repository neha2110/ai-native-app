export type NewsItem = {
  source: string;
  title: string;
  time: string;
};

export type SectorBias = "up" | "down" | "flat";

export type MarketBrief = {
  headline: string;
  body: string;
  sectors: { name: string; bias: SectorBias; note: string }[];
};

/** Mocked tape news — POC only. Clock-matched so the dock brief moves with the demo. */
export const CLOCK_NEWS: Record<string, NewsItem[]> = {
  "0915": [
    { source: "ET Now", time: "09:12", title: "Nifty opens little changed; IT mixed, private banks bid at the open." },
    { source: "Reuters", time: "09:08", title: "Overnight Wall Street steady. Crude holds. Rupee opens almost flat." },
    { source: "Moneycontrol", time: "08:55", title: "FIIs were net sellers yesterday; DIIs absorbed most of the flow." },
  ],
  "0942": [
    { source: "CNBC-TV18", time: "09:41", title: "Nifty slips ~180 pts from the open as banks and metals lead the drop." },
    { source: "Bloomberg", time: "09:38", title: "Risk-off after a softer global cue. Put writers defending 23,200." },
    { source: "ET Now", time: "09:35", title: "Heavyweights HDFC Bank and ICICI drag the Nifty; VIX ticks up." },
  ],
  "1120": [
    { source: "Reuters", time: "11:18", title: "Banknifty breaks while Nifty holds a bounce — beta mismatch on the tape." },
    { source: "ET Now", time: "11:14", title: "India VIX jumps about two points. Options desks flag a vol event, not a drift." },
    { source: "Moneycontrol", time: "11:10", title: "PSU banks and private lenders both offered; index heavyweights not confirming Nifty." },
  ],
  "1405": [
    { source: "Bloomberg", time: "14:02", title: "Nifty grinds back toward 23,600. Call writers at that strike under pressure." },
    { source: "CNBC-TV18", time: "13:55", title: "Index futures short-covering into the afternoon. Gamma picking up near ATM." },
    { source: "ET Now", time: "13:48", title: "Banks recover some of the morning damage; VIX off the midday high." },
  ],
  "1531": [
    { source: "Reuters", time: "15:30", title: "Nifty closes off the highs. Banks still lag the cash index on the day." },
    { source: "ET Now", time: "15:28", title: "VIX eases from the midday spike. Street waits on global cues into tomorrow." },
    { source: "Moneycontrol", time: "15:22", title: "FII selling in banks was the day’s story; IT held up better into the close." },
  ],
};

/** Market / sector tape — not the trader's book. */
export const CLOCK_MARKET: Record<string, MarketBrief> = {
  "0915": {
    headline: "Quiet open. Breadth mixed.",
    body: "Nifty almost unchanged versus last close. Private banks bid, IT mixed, metals flat. India VIX still subdued.",
    sectors: [
      { name: "Banks", bias: "up", note: "Private names bid" },
      { name: "IT", bias: "flat", note: "Mixed at the open" },
      { name: "Metals", bias: "flat", note: "Little changed" },
      { name: "Energy", bias: "flat", note: "Crude steady" },
    ],
  },
  "0942": {
    headline: "Risk-off. Banks and metals lead.",
    body: "Nifty is about 180 points off the open. Bank heavyweights are the drag. VIX ticking up.",
    sectors: [
      { name: "Banks", bias: "down", note: "HDFC Bank, ICICI offered" },
      { name: "Metals", bias: "down", note: "Leading the slide" },
      { name: "IT", bias: "down", note: "Softer, not the story" },
      { name: "VIX", bias: "up", note: "Vol bid" },
    ],
  },
  "1120": {
    headline: "Banknifty broke. Nifty’s bounce is not confirming.",
    body: "Cash Nifty holds a small bounce while banks and VIX say risk is up. PSU and private lenders both offered.",
    sectors: [
      { name: "Banks", bias: "down", note: "PSU and private offered" },
      { name: "IT", bias: "up", note: "Holding vs banks" },
      { name: "Metals", bias: "down", note: "Still offered" },
      { name: "VIX", bias: "up", note: "About +2 pts" },
    ],
  },
  "1405": {
    headline: "Nifty grinds toward 23,600. Banks recover some.",
    body: "Index futures covering into the afternoon. Call writers near 23,600 under pressure. VIX off the midday high.",
    sectors: [
      { name: "Banks", bias: "up", note: "Recovering the morning" },
      { name: "IT", bias: "up", note: "Quiet bid" },
      { name: "Metals", bias: "flat", note: "Stabilising" },
      { name: "VIX", bias: "down", note: "Off the high" },
    ],
  },
  "1531": {
    headline: "Nifty closes off the highs. Banks still lag.",
    body: "The day’s story was selling in banks. IT held up better into the close. VIX eases from the midday spike.",
    sectors: [
      { name: "Banks", bias: "down", note: "Lag the cash index" },
      { name: "IT", bias: "up", note: "Held into the close" },
      { name: "Metals", bias: "down", note: "Weak on the day" },
      { name: "VIX", bias: "down", note: "Eases from spike" },
    ],
  },
};
