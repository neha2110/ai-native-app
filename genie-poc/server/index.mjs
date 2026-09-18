import "dotenv/config";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import {
  marketSnapshot,
  positionsView,
  optionChain,
  confirmOrder,
  rejectOrder,
  state,
  startTicking,
  draftEquityOrders,
  watchlistView,
} from "./market.mjs";
import { genieChat } from "./genie.mjs";
import { situation, setClock, advanceClock } from "./session.mjs";

// Also load .env from the genie-poc root (one level up from server/).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env") });

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasKey: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || "gpt-5.5" });
});

app.get("/api/market", (_req, res) => res.json(marketSnapshot()));
app.get("/api/watchlist", (_req, res) => res.json(watchlistView()));
app.get("/api/positions", (_req, res) => res.json({ positions: positionsView() }));
app.get("/api/chain", (req, res) => res.json(optionChain(Math.min(Number(req.query.width) || 8, 15))));
app.get("/api/orders", (_req, res) => res.json({ orders: state.orders }));
app.get("/api/situation", (_req, res) => res.json(situation()));

app.post("/api/clock", (req, res) => {
  const id = req.body?.id;
  const action = req.body?.action;
  if (action === "advance") {
    res.json(advanceClock());
    return;
  }
  if (id) {
    res.json(setClock(id));
    return;
  }
  res.json(situation());
});

app.post("/api/orders/equity", (req, res) => {
  const result = draftEquityOrders(req.body || {});
  res.json(result);
});

app.post("/api/orders/:id/confirm", (req, res) => {
  const result = confirmOrder(req.params.id);
  res.status(result.error ? 400 : 200).json(result);
});

app.post("/api/orders/:id/reject", (req, res) => {
  const result = rejectOrder(req.params.id);
  res.status(result.error ? 400 : 200).json(result);
});

app.post("/api/genie/chat", async (req, res) => {
  const history = Array.isArray(req.body?.messages) ? req.body.messages : [];
  if (history.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const sit = situation();
    await genieChat(
      history
        .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-20),
      send,
      req.body?.tone === "explain" ? "explain" : "terse",
      {
        time: sit.time,
        headline: sit.headline,
        plan: sit.morning?.plan,
      },
      req.body?.profile === "copilot" ? "copilot" : "default",
    );
  } catch (err) {
    console.error("genie error:", err);
    const cause = err?.cause?.cause || err?.cause;
    const tls =
      cause?.code === "SELF_SIGNED_CERT_IN_CHAIN" ||
      String(cause?.message || "").includes("self-signed certificate");
    send({
      type: "error",
      error: tls
        ? "Could not reach OpenAI: this network intercepts HTTPS. Restart the server with `node --use-system-ca` (already in npm run dev)."
        : String(err?.message || err),
    });
  } finally {
    send({ type: "done" });
    res.end();
  }
});

const PORT = process.env.PORT || 8787;
startTicking();
app.listen(PORT, () => {
  console.log(`genie-poc server on http://localhost:${PORT}`);
  console.log(`OpenAI key: ${process.env.OPENAI_API_KEY ? "loaded" : "MISSING — copy .env.example to .env"}`);
});
