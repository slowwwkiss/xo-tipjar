# XO TipJar — Public tip pages on Bitcoin Cash

**BCH Blaze 2026, Build With XO bounty** (3 BCH = 0.3 BCH x 10 winners).
Submit deadline: **22 Nov 2026 21:00 WIB**.

A public tip page with a funding goal. Create your jar (name + message +
target), share the link, and every tip lands on-chain through the XO Engine.
No account, no backend, no custody — a static page.

**Chipnet (testnet) only — no real BCH moves here.**

## How to demo it (for the judges, 2 minutes)

1. Open the demo — it starts by opening your XO Engine account on chipnet.
   Press **"Get free chipnet BCH"**: the app creates a throwaway XO wallet in
   your browser and funds it free from the faucet. Nothing real moves.
2. In **"Create a tip jar"**, keep the defaults (Reza's coffee fund, 0.01
   tBCH target) and press **Create my tip jar** — copy the link or scan the QR.
3. Open the tip link and press **Send tip via XO Engine**: a real chipnet
   transaction is sent (txid + explorer link on the receipt) and the tip
   appears in **"Recent tips"** below, with the goal progress bar moving.
4. Read **"How it works"** on the page for the full XO flow.

## What it does

Getting tipped in crypto is still too hard: receiving BCH means explaining
wallets and pasting a 42-character address, and tip apps solve it by becoming
custodians. TipJar removes all of that. A tip jar is just a URL:
`#/tip?id=…&name=…&target=…&to=…`. The creator opens the link, anyone tips
from their own throwaway XO wallet, the money moves on-chain, and the goal
progress is the sum of recorded tips to that jar's address.

**Different from BlazePay** (our Mainnet Track entry): BlazePay is private
one-to-one payment links; TipJar is public tip pages with a funding goal, a
progress bar, and a public tip feed.

## Built with the XO Stack

- **XO Engine** (`@xo-cash/engine` 0.1.0-next.17612568780) — opens one account
  per mnemonic on chipnet, connects to Electrum, and builds every transaction
  from a template. This app follows the official getting-started flow:
  `Engine.create` → `importTemplate(p2pkhTemplate)` → `setDefaultPolicies` →
  `generateLockingBytecodeFromDefaultPolicy('receive')` → invitation
  (`sendSatoshis`) → `appendInvitation` → `addChangeToInvitation` →
  `signInvitation` → `executeAction({ broadcastTransaction: true })`.
- **XO Template** (`@xo-cash/templates` 0.0.12) — the `p2pkhTemplate`
  describes the pay-to-public-key-hash use case; the engine trusts the
  template, not the app, to decide what your keys sign.
- **XO Wallet** — the throwaway chipnet wallet in the app is the XO account:
  its mnemonic never leaves the browser (localStorage, testnet only), and its
  receive address is the tip jar's address.
- **XO State / Utils** (`@xo-cash/state`, `@xo-cash/utils`) — the engine's
  account storage and invitation helpers.
- **libauth** (`@bitauth/libauth`) — cashaddr ↔ locking-bytecode conversion
  and BIP39 mnemonic generation.

## Browser shims (worth knowing)

The XO Engine's dependencies assume Node globals that browsers don't have.
Vite externalises them into stubs that crash `Engine.create()` before it even
reaches Electrum, so this project pins them in `vite.config.js`:

- `path` / `node:path` → `path-browserify` (`@electrum-cash/application`
  calls `path.resolve()`; `@xo-cash/state` imports `{ join }` from `path`).
- `global` → `globalThis` (state + electrum-cache call
  `setGlobalVars(global, …)`).
- `process.cwd` → `(() => "/")`, `process.env` → `{}` (path-browserify's
  `resolve()` falls back to `process.cwd()`).

Without these, the app dies with `path.resolve is not a function` /
`process is not defined` in any browser. See `NOTES.md` for the full story.

## Project layout

- `index.html`, `src/main.js`, `src/style.css`, `vite.config.js`,
  `package.json`
- `docs/` — built output (committed for GitHub Pages `/docs` source)
- `tools/` — local-only verification scripts (NOT pushed): headless browser
  check (Playwright, video + screenshots), crash/firefox probes
- `README.md` (this file), `NOTES.md`, `SUBMISSION-DRAFT.md`

## Run it

```bash
npm install
npm run build   # -> docs/
npm run preview # serves docs/ on http://127.0.0.1:4174/
```

## Costs

$0. No BCH spent, no paid hosting, no paid services. Faucet tBCH only.
