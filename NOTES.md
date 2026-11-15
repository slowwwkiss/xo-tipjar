# XO TipJar — NOTES

## What was built
**XO TipJar** — "A public tip page with a funding goal". One-page static web
app (no backend, no custody) for **BCH Blaze 2026, Build With XO bounty**.
Source: `~/workspace/makefun/xo-tipjar/` (see `README.md` for the full layout).

1. **Create a tip jar** — name + message + target (tBCH) → shareable URL
   (`#/tip?id=…&name=…&target=…&to=…`) + QR code. Each jar gets a fresh
   receive address from the XO Engine.
2. **Tip the jar** — shows name / message / progress bar / target / jar
   address. Pay via the XO Engine (`sendSatoshis` invitation flow) → real
   chipnet tx with txid + explorer link.
3. **Feed + progress** — recent tips (this browser's ledger, each with txid)
   and per-jar progress = sum of recorded tips to that jar's address.
4. **Banner + explanation** — bounty banner on top (repo link + XO docs) and
   a "How it works" section explaining the full XO flow.
5. **Wallet card** — throwaway chipnet XO account in the browser
   (mnemonic in localStorage, testnet only), faucet button, balance.

## Why this concept
- A judge can understand it in 2 minutes and try it for free in the same
  session (chipnet faucet is one click, no wallet install needed).
- It exercises the XO Stack end-to-end exactly as documented: Engine,
  Template, Wallet, State, Utils, libauth.
- Tip pages with a goal are a real, simple use case that only makes sense on
  BCH (sub-cent fees, fast confirmation).
- No backend, no custody, no cost — nothing to break, nothing to fund.

## Track / bounty
Build With XO — 3 BCH (0.3 BCH x 10 winners). New project required (XO
Template + XO SDK + XO Wallet). Submit deadline 22 Nov 2026 21:00 WIB.
**This is a NEW app from scratch, NOT a copy of BlazePay** (different
concept: public tip pages + goal + progress + feed, vs BlazePay's private
one-to-one payment links).

## Links (targets — see blocker below)
- Demo (GitHub Pages): https://slowwwkiss.github.io/xo-tipjar/
- Demo (jsDelivr fallback, works as soon as the repo exists):
  https://cdn.jsdelivr.net/gh/slowwwkiss/xo-tipjar@main/docs/index.html
- Repo: https://github.com/slowwwkiss/xo-tipjar
- Hackathon: https://dorahacks.io/hackathon/bchblaze2026/detail

## Verification results (15 Nov 2026, all in this VM)
- **Install:** `npm install @xo-cash/engine@0.1.0-next.17612568780
  @xo-cash/state @xo-cash/templates @xo-cash/utils
  "@bitauth/libauth@^3.1.0-next.8"` OK (267 packages; engine 0.1.0-next.
  17612568780, templates 0.0.12, state 0.0.6, utils 0.0.11, libauth
  3.1.0-next.8). NOTE: my first `package.json` had wrong ranges for
  state/utils (`^0.1.0-next.17612568780` doesn't exist) — fixed to the
  installed versions.
- **Template/API verified in Node (no engine import):**
  `generateBip39Mnemonic()` → 12 words; `p2pkhTemplate` actions include
  `sendSatoshis` (sender role, requires variables `transferredSatoshis` +
  `recipientLockingscript`, secret `ownerKey`); transaction
  `transferSatoshisTransaction` output `transferSatoshisOutput` — exactly the
  identifiers the getting-started guide uses. Engine method signatures
  confirmed from `dist/index.d.mts` (`Engine.create`, `importTemplate`,
  `setDefaultPolicies`, `generateLockingBytecodeFromDefaultPolicy`,
  `listSpendableUnspentOutputs`, `createInvitation`, `appendInvitation`,
  `calculateChange`, `estimateTransactionFee`, `addChangeToInvitation`,
  `listOwnInputIndexes`, `signInvitation`, `executeAction`).
- **Build:** `vite build` OK (docs/ output, 1.98 MB JS, chunk-size warning
  only). Bundle parses as a valid ES module (`vm.SourceTextModule` check).
- **Headless Chromium (Playwright, local server, 2 full runs 11:12 + 11:14
  WIB):** page loads; banner shows all 3 links; hero + wallet card + create
  form + feed + jars + how-it-works all render; tip link
  (`#/tip?id=jar-demo&name=…&target=1000000&to=bchtest:…`) renders the tip
  card with correct title/message/target (0.01 tBCH), progress bar at 0.0%,
  tip form; create-jar click shows the engine-offline alert; pay-tip click
  shows "Tip failed: XO Engine is not connected." — graceful failure paths
  all work. Screenshots: `tools/shot-1-home.png`, `shot-2-engine-settled.png`,
  `shot-3-tip-page.png`. Videos: `tools/video/page@92c5732c….webm` (11:12,
  4.96 MB) and `page@1d911853….webm` (11:14, 4.78 MB) — full Playwright
  recordings of those runs.
- **Electrum WSS blocked (expected, VM limit):** console shows
  `WebSocket connection to 'wss://chipnet.imaginary.cash:50004/' failed:
  Establishing a tunnel via proxy server failed` (both default chipnet
  servers). No alternative transport exists in `XOEngineOptions` — the engine
  only takes an `electrumServers` list (WSS via `@electrum-cash/network` /
  `ElectrumWebSocket`); there is no HTTP/REST transport option. Verified by
  reading the engine source + type definitions.
- **Two REAL browser-shim bugs found and fixed (would have broken the app on
  ANY network, not just this VM):**
  1. `path.resolve is not a function` — `@electrum-cash/application` imports
     `node:path` and calls `path.resolve(databasePath)`; Vite externalises it
     into a stub. Fixed: alias `path` + `node:path` → `path-browserify` in
     `vite.config.js`.
  2. `process is not defined` — path-browserify's `resolve()` falls back to
     `process.cwd()`. Fixed: Vite `define` maps `process.cwd` → `(() => "/")`,
     `process.env` → `{}`, and bare `global` → `globalThis` (state +
     electrum-cache call `setGlobalVars(global, …)`).
  After the fixes the built bundle contains zero `process.cwd` /
  `process.env` references and the path-browserify `resolve` is present.
  The 11:16 bundle (`docs/assets/index-D6-E-KUN.js`) is the fixed one.

## What could NOT be verified in this VM (sandbox limits, not app bugs)
- **Live chipnet tip end-to-end (txid): NOT verified.** `Engine.create()`
  cannot connect here because Electrum WSS is blocked (see above). The tip
  code path (`sendTip` in `src/main.js`) is the documented getting-started
  flow verbatim, and every input to it (template identifiers, variable types,
  UTXO shape) was verified against the installed packages — but no real
  chipnet transaction was broadcast from this VM. **Must be re-verified on a
  normal network (judge's browser or the parent agent's live browser) before
  submission: open the demo, fund from the faucet, create a jar, send a tip,
  confirm the txid on the explorer.**
- **Final-bundle headless re-check: NOT verified.** At ~11:15 WIB all
  browsers in this VM stopped launching (Chromium 1193 + 1255, headless shell,
  and Firefox all die at startup: Chrome SIGTRAP/exit 133, Firefox SIGSEGV —
  even `about:blank` with `--no-sandbox --single-process`, clean env, and
  HOME=/tmp). Two full Playwright runs worked 11:12–11:14 WIB, then every
  launch failed. This is a VM-level breakage, unrelated to the app (the
  browser dies before loading any page). The screenshots/video above are from
  the pre-fix bundles; the final bundle was verified statically only (parses,
  shims present, no bare Node globals).
- **Shell writes to /home/hatch broke ~11:17 WIB** (overlay FS: small writes
  OK, writes ≥ ~1 MB fail EPERM; `vite build` writing the 1.98 MB bundle now
  fails). The `docs/` output is therefore the 11:16 build; the only later
  source change (removing the `⚡` from the H1 via CSS) was applied by hand
  to both `src/style.css` and the built `docs/assets/index-jqPPl7Aj.css`.
  If the shell recovers, re-run `npm run build` to confirm docs/ is fresh.
- **No mainnet BCH was spent** (by design — chipnet only, and no funds exist).

## BLOCKER — needs one human step (repo + hosting)
Same pattern as BlazePay: the GitHub App cannot create repos. Exact steps
for the parent/user (browser, ~2 minutes):
1. On github.com, create a **public** repo named **`xo-tipjar`** under
   `slowwwkiss` (no README — the push includes everything).
2. Open the GitHub App installation (Connectors → GitHub → "Select
   repositories") and select `xo-tipjar` (or "All repositories").
3. Tell this agent — it will push all files (source + built `docs/`) in one
   commit and verify.
4. **Enable GitHub Pages** (browser): repo Settings → Pages → Deploy from
   branch → `main` / `/docs` → Save. Demo goes live at
   https://slowwwkiss.github.io/xo-tipjar/ (also verify the jsDelivr fallback
   URL works immediately after push — no Pages needed for that one).
**DO NOT** push XO TipJar into an existing repo (`yoloo`, `lonk`,
`blazepay`, …) — the bounty needs its own repo.

## Costs
$0. No BCH spent, no paid hosting, no paid services. Faucet tBCH only.

## Files
- `index.html`, `src/main.js`, `src/style.css`, `vite.config.js`,
  `package.json`, `README.md`, `.gitignore`
- `docs/` — built output (committed for GitHub Pages `/docs` source)
- `tools/` — local-only verification scripts (NOT pushed): headless check
  (Playwright, video + screenshots), crash/firefox probes
- `NOTES.md` (this file), `SUBMISSION-DRAFT.md`, `DEMO-SCRIPT.md`
