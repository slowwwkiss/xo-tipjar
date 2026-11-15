# XO TipJar — Demo script (shot-by-shot)

Use this when recording the walkthrough video (the Playwright recordings in
`tools/video/` cover the pre-final bundles; re-record on a normal network
for the submission video). Total ~90 seconds. No real BCH anywhere — chipnet
only.

## Shot 1 — Homepage + banner (0:00–0:15)
- Open the demo. Point at the top banner: "BCH BLAZE 2026 · Build With XO
  bounty", links to How it works / Source code (GitHub) / XO Stack docs.
- Read the tagline: "A public tip page with a funding goal."
- Say: "XO TipJar — anyone can make a public tip page, and every tip is a
  real on-chain transaction through the XO Engine."

## Shot 2 — XO wallet + faucet (0:15–0:35)
- The wallet card shows "engine online (chipnet)" and a `bchtest:` address.
- Click **Get free chipnet BCH**. Wait for "Funded!" — balance shows
  0.0001 tBCH (10,000 sat).
- Say: "The app opens a throwaway XO account in the browser and funds it
  free from the faucet. No install, no real money."

## Shot 3 — Create a tip jar (0:35–0:55)
- Keep the defaults: name "Reza's coffee fund", message "Tips keep the demos
  coming!", target 0.01 tBCH. Click **Create my tip jar**.
- The result shows the shareable link + QR code.
- Say: "One click and the jar is live — a link and a QR, nothing else to set
  up. Each jar gets its own address from the XO Engine."

## Shot 4 — Open the tip page (0:55–1:10)
- Click **Open tip page**. The tip card shows the name, message, the progress
  bar at 0 tBCH of 0.01 tBCH (0.0%), and the jar address.
- Say: "This is what a tipper sees — a public page with a goal and a
  progress bar. Not a private payment link like BlazePay."

## Shot 5 — Send a tip on-chain (1:10–1:30)
- Amount 0.001 tBCH, name "anonymous". Click **Send tip via XO Engine**.
- Status walks through the flow; the receipt shows the txid + explorer link.
- Open the explorer link: the transaction is on chipnet.
- Back on the page, the progress bar moved to 10% and the tip is listed under
  "Recent tips".
- Say: "That tip was built by the XO Engine from the p2pkh template —
  invitation, change, sign, broadcast — and you can verify it on the
  explorer."

## Shot 6 — How it works (1:30–1:45)
- Scroll to "How it works". Point at the XO Engine / Template / Wallet /
  State / libauth bullets.
- Say: "Everything is the documented XO Stack flow. Static page, no backend,
  no custody — the jar is just a URL."

## Existing recordings (this VM, pre-final bundle)
- `tools/video/page@92c5732cb289afa758b3a9da83dde56f.webm` — 11:12 WIB run
  (page load, engine offline with the `path.resolve` bug, tip page render).
- `tools/video/page@1d911853cee2195de175eb84d8a5b28b.webm` — 11:14 WIB run
  (same, after the path-browserify fix; engine offline with `process is not
  defined`, fixed afterwards by the `define` shims).
- Screenshots: `tools/shot-1-home.png` (homepage), `shot-2-engine-settled.png`
  (wallet card after engine settles), `shot-3-tip-page.png` (tip page with
  progress bar).
