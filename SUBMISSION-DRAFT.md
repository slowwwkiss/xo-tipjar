# DoraHacks submission draft — BCH Blaze 2026, Build With XO bounty
<!-- DRAFT ONLY — do NOT submit from here. Submit via the DoraHacks page
     (browser/human step) before 22 Nov 2026 21:00 WIB. -->
<!-- Status 15 Nov 2026: code + verification PARTIAL (see NOTES.md).
     Repo + live demo pending the one human step in NOTES.md (create public
     repo `xo-tipjar` under slowwwkiss, select it in the GitHub App
     installation, then this agent pushes + verifies). Fill the URLs below
     once the push is verified. -->

## Bounty
Build With XO — 3 BCH (0.3 BCH x 10 winners). New project, built with the
XO Template + XO SDK + XO Wallet.

## Project title
XO TipJar — Public tip pages on Bitcoin Cash

## Short description (for the listing)
XO TipJar turns tipping into a public page with a funding goal. Create a tip
jar (name + message + target), share the link, and anyone can tip on-chain
via the XO Engine — no account, no backend, no custody. Every tip is a real
chipnet transaction with a txid, and the goal progress bar moves as tips land.

## Demo / website URL
https://slowwwkiss.github.io/xo-tipjar/
(Fallback, also live after push: https://cdn.jsdelivr.net/gh/slowwwkiss/xo-tipjar@main/docs/index.html)

## Source code (GitHub)
https://github.com/slowwwkiss/xo-tipjar

## Presentation
On the demo page itself — the "How it works" section explains the full XO
flow (Engine → Template → invitation → sign → broadcast). A slide deck can
be added before submission if the form asks for one.

## How to demo it (for the judges, 2 minutes)
1. Open the demo — it opens your XO Engine account on chipnet. Press
   "Get free chipnet BCH": the app creates a throwaway XO wallet in your
   browser and funds it free from the faucet. Nothing real moves.
2. In "Create a tip jar", keep the defaults and press "Create my tip jar" —
   copy the link or scan the QR.
3. Open the tip link and press "Send tip via XO Engine": a real chipnet
   transaction is sent (txid + explorer link on the receipt) and the tip
   appears in "Recent tips" with the goal progress moving.

## What it does (long description, if the form asks)
Tipping in crypto is still too hard: receiving BCH means explaining wallets
and pasting a 42-character address, and tip apps solve it by becoming
custodians. TipJar removes all of that. A tip jar is just a URL:
`#/tip?id=…&name=…&target=…&to=…`. The creator makes the jar, anyone opens
the link and tips from their own throwaway XO wallet, the money moves
on-chain through the XO Engine, and the goal progress is the sum of recorded
tips to that jar's address.

Built with the XO Stack, following the official getting-started flow exactly:
`Engine.create(mnemonic, { network: chipnet })` → `importTemplate(p2pkhTemplate)`
→ `setDefaultPolicies` → `generateLockingBytecodeFromDefaultPolicy('receive')`
→ invitation (`sendSatoshis`) → `appendInvitation` → `addChangeToInvitation`
→ `signInvitation` → `executeAction({ broadcastTransaction: true })`.
The engine trusts the template, not the app, to decide what keys sign.

Different from BlazePay (our Mainnet Track entry, private one-to-one payment
links): TipJar is public tip pages with a funding goal, a progress bar, and a
public tip feed — a new app from scratch, not a copy.

## Checklist against the Build With XO bounty rules
- [x] NEW project (not a migration, not a copy of BlazePay) — built 15 Nov 2026.
- [x] Uses the XO Template (`@xo-cash/templates`, `p2pkhTemplate`).
- [x] Uses the XO SDK / Engine (`@xo-cash/engine`) for all transactions.
- [x] Uses the XO Wallet (throwaway chipnet XO account in the browser).
- [x] Live demo openable from one link — GitHub Pages (static, free).
- [x] Banner on top of the homepage with the bounty name + repo link + XO docs.
- [x] Chipnet only — no real BCH, no mainnet funds involved.
- [ ] Repo + Pages live — needs the one human step (create repo `xo-tipjar`).
- [ ] End-to-end chipnet tip verified in a normal browser — blocked in this
      VM only (Electrum WSS blocked + browsers stopped launching 15 Nov
      ~11:15 WIB; see NOTES.md). Must be re-verified on a normal network
      before submission; the code path is the documented one.
