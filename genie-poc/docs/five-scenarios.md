Companion for **how to run the room:** [demo-script.md](./demo-script.md). This file is the F&O story and the three UIs.

# Five scenarios — leadership demo

Same mocked NIFTY F&O book. Same session clock. Four UIs, so a viewer can ask: *for this moment, which would I rather use?*

| UI | Who starts | Who reasons first | What you see |
|---|---|---|---|
| **Traditional** | You | You | Riise Explore home. No Genie. |
| **AI-enabled** | You | AI, after you ask | Same terminal + news ticker. Genie dock. Chips / type. You confirm. |
| **Copilot** | You | AI, after you ask — and the app rearranges | Same terminal. Copilot adds tabs / screens, then a second ask: keep the tab as a default, or buy any of the names? You confirm orders. |
| **AI-native** | The system | AI, then you | Situation first. Evidence. Tickets already drafted (or none at close). Ask is a back pocket. You confirm. |

Shared tape (header clock): **09:15 Open → 09:42 Drop → 11:20 Vol → 14:05 Gamma → 15:31 Close.**

Human gate on every UI: Genie never executes. Confirm / Not this / do nothing.

---

## The book (all five clocks)

The trader is not “looking at the market.” They already have three legs.

**In one line:** *I expect NIFTY to rise, but I'm willing to give up gains above ~23,600 in exchange for protection against a large fall below ~23,000.*

That is a **covered-ish long**: long futures (the upside view), short 23,600 call (the cap they sold), long 23,000 put (the distant floor).

1. **Long 1 lot NIFTY futures** — bought from a higher level. Profits if NIFTY rises, loses almost 1:1 if it falls. This is the main risk.
2. **Short 23,600 call (CE)** — sold for a fee. Fine while NIFTY stays below 23,600. Hurts if NIFTY walks up into that strike. This is “giving up gains above ~23,600.”
3. **Long 23,000 put (PE)** — crash insurance. Only helps if NIFTY falls a long way. This is “protection below ~23,000,” and at the open it is still too far to matter.

**Morning plan:** hold. Act if NIFTY loses **23,350**.

**Delta (~+46 units):** the book still behaves like being net long NIFTY (a full futures lot is 75 units). The short call and far put only dampen it.

Tape (simulated, frozen after 09:15 except a faint drift at the open):

| Clock | NIFTY | BANKNIFTY | India VIX |
|---|---|---|---|
| 09:15 | 23,398 | 56,607 | 14.2 |
| 09:42 | 23,218 | 56,110 | 14.9 |
| 11:20 | 23,255 | 54,880 | 16.5 |
| 14:05 | 23,562 | 56,340 | 15.2 |
| 15:31 | 23,412 | 56,020 | 14.6 |

---

## 1. 09:15 — Open

**What is true:** Quiet open. Nothing has broken. The trader is still net long. The 23,000 put is too far. The short call is only a thin cushion. Doing nothing is a valid choice.

**Native headline:** Quiet open. You are still net long.

**Native tickets (already there):** Protective put (buy 23,100 PE) · Put spread (cheaper, capped).

**AI-enabled — user must ask**, e.g. “Morning brief”, “Hedge my futures.”

**Traditional — user must notice** net long + plan + hunt a put on the chain + type an order. Nothing prompts them.

**Why this moment:** AI-native value at a *quiet* open is optional hedges without a prompt. Traditional looks fine because nothing is on fire — that is the trap.

---

## 2. 09:42 — Drop

**What is true:** NIFTY is ~180 points below 09:15, **through 23,350**. The morning rule has printed. The futures are the leak. The 23,000 put still does not help much.

**Native headline:** Downside is worse than this morning.

**Native evidence:** One scenario — *if we drop another 100 from here*.

**Native tickets:** Buy 23,100 PE (stay in, shock absorber) · Flatten futures (exit the long).

**AI-enabled — user must ask**, e.g. “Why is MTM red?”, “What if −100 more?”, “Hedge this drop.”

**Traditional — user must connect** red NIFTY + red MTM + remembered 23,350 + build the order.

**Why this moment:** Same two tickets as a later clock; the *reason* is the broken plan vs 09:15.

---

## 3. 11:20 — Vol

**What is true:** NIFTY has bounced a little (not the emergency). **Banknifty has broken.** **VIX is up ~2 points.** The book’s delta has not moved. Risk is larger than the NIFTY print.

**Native headline:** Vol and Banknifty broke. This book is still long NIFTY.

**Native evidence:** Three names — NIFTY, BANKNIFTY, India VIX.

**Native tickets:** Same pair (put · flatten) on purpose. The choice did not change; the reason did.

**AI-enabled — user must ask**, e.g. “What’s moving on my watchlist?”, “Hedge the beta mismatch.”

**Traditional — user must look at the watchlist** and notice banks/VIX while staring at a calmer NIFTY.

**Why this moment:** Watchlist as argument, not as a list.

---

## 4. 14:05 — Gamma

**What is true:** NIFTY has ground **up toward 23,600**. The call sold for a fee is becoming a real short. P&L will start moving faster against the trader (gamma). Holding it from here is a different trade than 09:15.

**Native headline:** The 23,600 CE is no longer a cushion.

**Native evidence:** Chain slice with 23,600 marked.

**Native tickets:** Buy back 23,600 CE · Roll to 23,800 CE.

**AI-enabled — user must ask**, e.g. “What do I do with the 23600 CE?”, “Show the chain around my short.”

**Traditional — user must find 23,600** on a full chain and decide buy-back vs roll.

**Why this moment:** The wound flipped from downside (morning) to upside into the short (afternoon). Same book.

---

## 5. 15:31 — Close

**What is true:** Session over. No new trade unless the trader starts one.

**Native headline:** The day versus the 09:15 plan.

**Native evidence:** Attribution — each leg’s MTM at 09:15 vs now. **No ticket.**

**AI-enabled — user must ask**, e.g. “How did the day go vs the plan?”

**Traditional — user must reconstruct** the day from positions and memory.

**Why this moment:** Knowing when not to draft an order is part of the product.

---

## How to walk a comparison

1. Set the **clock** in the header (same tape for all three).
2. Open **Traditional**. Hunt. Notice how much you have to remember.
3. Open **AI-enabled**. Use a chip or type. Watch Genie fetch and maybe draft. Confirm or dismiss.
4. Open **Native**. Situation and tickets (or attribution) are already there. Ask only if you disagree.
5. Score on Native: *Would you rather this than the other two, for this moment?*

Do not auto-fire. Do not treat chips as the Native plot. Native stays system-started.

---

## Glossary (plain)

- **Futures:** you are long or short the index, almost rupee-for-rupee.
- **Call (CE):** right to buy at a strike. Buying a call likes upside. Selling a call collects a fee and hurts if the index rises through that strike.
- **Put (PE):** right to sell at a strike. Buying a put is downside insurance.
- **Hedge:** a second trade that reduces pain on the first.
- **Flatten:** close the futures so you are no longer long.
- **Roll:** close this option and open one further away.
- **MTM:** mark-to-market; running P&L if you closed now.
- **VIX:** how expensive fear is.
- **Delta:** how much the book behaves like being long (or short) the index.
- **Gamma:** how fast that exposure changes as the index moves — painful when you are short an option and spot walks into the strike.
