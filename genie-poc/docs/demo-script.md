# Demo script

**URL:** http://localhost:5173 · `cd genie-poc && npm run dev`  
Restart the server if anyone confirmed a ticket earlier. Clock on **09:15**. Browser full width.

---

## Setup

She is an **active NIFTY F&O trader**. On any ordinary day she already has a book — she is not “looking at the market” from zero.

Today, three legs:

1. **Long 1 lot NIFTY futures** — she expects the index to rise. Hurt if it falls.
2. **Short 23,600 call** — she sold a cap. She gives up gains above ~23,600.
3. **Long 23,000 put** — crash insurance. Too far to help unless it really breaks.

In one line:

> I expect NIFTY to rise, but I'm willing to give up gains above ~23,600 in exchange for protection against a large fall below ~23,000.

**Morning plan:** hold unless NIFTY loses **23,350**.

Same mocked book on all three UIs. Genie **never fires** — she Confirm / Reject / does nothing.

---

## The day (five conditions)

We freeze one session and walk five moments. Header clock is the tape.

| Clock | Condition | What is true |
|---|---|---|
| **09:15 Open** | Quiet | Nothing broken. She is still net long. Doing nothing is valid. |
| **09:42 Drop** | Plan trigger | NIFTY through **23,350**. Futures are the leak. |
| **11:20 Vol** | Mismatch | Banknifty and VIX broke. Nifty looks calmer than her risk. |
| **14:05 Gamma** | Short call | Spot into **23,600**. The fee she sold is now a real short. |
| **15:31 Close** | Attribution | Session over. No new ticket unless she starts one. |

---

## Three versions of the same minute

| | Who starts | What she sees |
|---|---|---|
| **Traditional** | She hunts | Riise as today. Watchlist, Explore, Positions, chain. Nothing prompts her. |
| **AI-enabled** | She asks | Same Riise + Genie dock. She must ask. It may draft. She confirms. |
| **Copilot** | She asks; the app changes | Same Riise. Copilot adds tabs / screens, then asks the next step (keep as default, or buy). She confirms. |
| **Native** | The situation starts | Pulse + one picture + optional tickets already there. Ask is a back pocket. She confirms. |

Line to leave them with: Traditional = she seeks. AI-enabled = she asks. Copilot = she asks and the **app** rearranges. Native = the system anticipates. **She keeps authority.**

---

## How to run it (12–15 min)

Do **not** play all five clocks × three UIs.

1. **Frame** (1 min) — say the setup above. Point at the clock.
2. **09:15 Traditional → AI-enabled → Native** (5 min) — quiet open is the trap.
3. **Copilot, any clock** (3 min) — same Riise as AI-enabled. Chip **Add watchlist tab**: tab opens, Copilot asks **Keep as default?** (pin) vs **Only this session**. Then **PE < 50, ROE > 30**: Screener opens and Copilot asks **Buy any of these?** Tick two names → **Fill order for selected**. Orders shows a filled CNC LIMIT ticket. She Confirm.
4. **09:42 Native, then glance Traditional** (3 min) — the plan printed.
5. **One more Native clock** — **11:20** or **14:05**, then **15:31** (no ticket).
6. **Ask** — *For this minute, which would you rather use?*

Prefer not confirming flatten if you still want later clocks to be a long book.

---

## Close

Same trader. Same three positions. Same five conditions. Only the **door she opens the app through** changes.

Deeper notes: [five-scenarios.md](./five-scenarios.md).
