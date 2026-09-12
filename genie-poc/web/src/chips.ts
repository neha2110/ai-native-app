export const ASK_CHIPS: Record<string, { label: string; prompt: string }[]> = {
  "0915": [
    { label: "Morning brief", prompt: "Give me a morning brief on my book and the tape." },
    { label: "Hedge my futures", prompt: "Draft a hedge for my long NIFTY futures. I still want to hold unless we lose 23,350." },
    { label: "What's my risk?", prompt: "In plain language, what can go wrong with this book from here?" },
  ],
  "0942": [
    { label: "Why is MTM red?", prompt: "NIFTY dropped. Explain what is leaking in my book versus the 09:15 plan." },
    { label: "What if −100 more?", prompt: "What happens to my book if NIFTY drops another 100 points from here?" },
    { label: "Hedge this drop", prompt: "The 23,350 trigger is gone. Draft two ways out: a put, or flatten the futures." },
  ],
  "1120": [
    { label: "What's moving?", prompt: "What's moving on my watchlist, and does it matter for this NIFTY book?" },
    { label: "Hedge the mismatch", prompt: "Banknifty and VIX broke. My book is still long NIFTY. Draft a hedge." },
  ],
  "1405": [
    { label: "The 23600 CE", prompt: "What should I do with my short 23600 call now that spot has walked up?" },
    { label: "Show my strike", prompt: "Show the chain around 23600 and draft a buy-back or a roll to 23800." },
  ],
  "1531": [
    { label: "Day vs the plan", prompt: "How did each leg do versus the 09:15 plan (hold unless 23,350)? No new trade unless I ask." },
    { label: "Note for tomorrow", prompt: "Write a short close note for tomorrow from this book. Do not draft an order." },
  ],
};

export const COPILOT_CHIPS: { label: string; prompt: string }[] = [
  {
    label: "Add watchlist tab",
    prompt: "Add a Watchlist tab on the app. Do not paste the table in chat. Then ask if I want to keep it after this session as a default.",
  },
  {
    label: "Watchlist with plots",
    prompt: "Add a Watchlist tab with historical plots for each scrip. Then ask if I want to keep it as a default after this session.",
  },
  {
    label: "Track performance",
    prompt: "Add a tab that tracks my stocks and portfolio performance over time. Then ask if I want to keep it as a default.",
  },
  {
    label: "PE < 50, ROE > 30",
    prompt:
      "Screen equities with PE below 50 and ROE above 30. Open them on a Screener tab. Then ask if I want to buy any of them.",
  },
  {
    label: "Remove extra tabs",
    prompt:
      "Remove every extra tab I asked you to create, including ones marked Default. Leave only the core Riise tabs.",
  },
];
