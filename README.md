# MO Riise · Trading agent POC

Leadership demo of four ways into the same Motilal Oswal Riise session: **Traditional**, **AI-enabled**, **Native**, and **Trading agent**. Mocked NIFTY F&O book. Genie drafts only — the trader confirms.

App lives in [`genie-poc/`](./genie-poc). Demo spine: [`genie-poc/docs/demo-script.md`](./genie-poc/docs/demo-script.md).

## Run

```bash
cd genie-poc
cp .env.example .env   # paste OPENAI_API_KEY
npm run install:all
npm run dev
```

Open http://localhost:5173. Server is **8787**, Vite is **5173**. Restart if anyone confirmed a ticket earlier.
