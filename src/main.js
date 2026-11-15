// XO TipJar — public tip pages with a funding goal, paid on-chain via the XO Engine.
// Static SPA, no backend. Chipnet (testnet) only — no real BCH.
// Flow (stack.xo.cash/getting-started):
//   Engine.create -> importTemplate(p2pkhTemplate) -> setDefaultPolicies
//   -> generateLockingBytecodeFromDefaultPolicy('receive') [funding/jar address]
//   -> invitation (sendSatoshis) -> appendInvitation -> addChangeToInvitation
//   -> signInvitation -> executeAction({ broadcastTransaction: true })
import './style.css';
import {
  Engine,
  XO_SUPPORTED_NETWORKS,
  DUST_LIMIT_SATOSHIS,
  getTemplateLockingScriptOrThrow,
} from '@xo-cash/engine';
import { p2pkhTemplate } from '@xo-cash/templates';
import {
  generateBip39Mnemonic,
  hexToBin,
  binToHex,
  lockingBytecodeToCashAddress,
  cashAddressToLockingBytecode,
} from '@bitauth/libauth';
import QRCode from 'qrcode';

// ---------------------------------------------------------------- config
const REPO_URL = 'https://github.com/slowwwkiss/xo-tipjar';
const FAUCET_URL = 'https://rest-unstable.mainnet.cash/faucet/get_testnet_bch';
const SATS_PER_BCH = 100_000_000n;
const MNEMONIC_KEY = 'xo-tipjar-mnemonic'; // throwaway CHIPNET account only
const JARS_KEY = 'xo-tipjar-jars';
const TIPS_KEY = 'xo-tipjar-tips';
const ENGINE_TIMEOUT_MS = 45_000; // Electrum connect can take a while on a good network

const $ = (id) => document.getElementById(id);
const els = {
  engineStatus: $('engine-status'), engineError: $('engine-error'),
  xoAddr: $('xo-addr'), xoBalance: $('xo-balance'),
  btnFaucet: $('btn-faucet'), btnRefreshBalance: $('btn-refresh-balance'),
  createForm: $('create-form'), inName: $('in-name'), inMessage: $('in-message'),
  inTarget: $('in-target'), jarResult: $('jar-result'), outLink: $('out-link'),
  btnCopyLink: $('btn-copy-link'), btnOpenLink: $('btn-open-link'), qrImg: $('qr-img'),
  tipCard: $('tip-card'), tipTitle: $('tip-title'), tipMessage: $('tip-message'),
  progressFill: $('progress-fill'), progressRaised: $('progress-raised'),
  progressTarget: $('progress-target'), progressPct: $('progress-pct'),
  tipAddr: $('tip-addr'), tipForm: $('tip-form'), inTipAmount: $('in-tip-amount'),
  inTipper: $('in-tipper'), btnTip: $('btn-tip'), tipStatus: $('tip-status'),
  tipReceipt: $('tip-receipt'), rcTxid: $('rc-txid'), rcExplorer: $('rc-explorer'),
  btnReceiptCopy: $('btn-receipt-copy'),
  feedList: $('feed-list'), feedEmpty: $('feed-empty'), btnRefreshFeed: $('btn-refresh-feed'),
  jarsList: $('jars-list'), jarsEmpty: $('jars-empty'),
};

const state = {
  engine: null,
  templateIdentifier: null,
  walletAddress: null, // this browser's XO receive address (also the jar address for jars created here)
  jar: null, // currently open tip jar { id, name, message, targetSats, to }
};

// ---------------------------------------------------------------- helpers
function explorerTxUrl(txid) {
  return `https://blockchair.com/bitcoin-cash/testnet/transaction/${txid}`;
}
function fmtBch(satsBig) {
  const negative = satsBig < 0n;
  const v = negative ? -satsBig : satsBig;
  const whole = v / SATS_PER_BCH;
  const frac = (v % SATS_PER_BCH).toString().padStart(8, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${frac ? '.' + frac : ''}`;
}
function bchToSats(bchStr) {
  const n = Number(bchStr);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Enter an amount greater than 0.');
  const sats = BigInt(Math.round(n * 100_000_000));
  if (sats < BigInt(DUST_LIMIT_SATOSHIS)) throw new Error(`Amount is below the dust limit (${DUST_LIMIT_SATOSHIS} sat).`);
  return sats;
}
function showTipStatus(msg, kind = 'info') {
  els.tipStatus.classList.remove('hidden');
  els.tipStatus.textContent = msg;
  els.tipStatus.dataset.kind = kind;
}
function clearTipStatus() { els.tipStatus.classList.add('hidden'); els.tipStatus.textContent = ''; }
function hideReceipt() { els.tipReceipt.classList.add('hidden'); }
function showReceipt(txid) {
  els.rcTxid.textContent = txid;
  els.rcExplorer.href = explorerTxUrl(txid);
  els.tipReceipt.classList.remove('hidden');
}
async function copyText(text, btn, doneLabel = 'Copied!') {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  if (btn) {
    const old = btn.textContent; btn.textContent = doneLabel;
    setTimeout(() => { btn.textContent = old; }, 1500);
  }
}
function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)),
  ]);
}

// ---------------------------------------------------------------- XO engine
function getOrCreateMnemonic() {
  let mnemonic = localStorage.getItem(MNEMONIC_KEY);
  if (!mnemonic) {
    mnemonic = generateBip39Mnemonic();
    localStorage.setItem(MNEMONIC_KEY, mnemonic);
  }
  return mnemonic;
}

async function initEngine() {
  els.engineStatus.textContent = 'connecting to Electrum…';
  els.engineStatus.className = 'pill';
  try {
    const mnemonic = getOrCreateMnemonic();
    const engine = await withTimeout(
      Engine.create(mnemonic, { network: XO_SUPPORTED_NETWORKS.chipnet }),
      ENGINE_TIMEOUT_MS,
      'Engine.create (Electrum connect)',
    );
    state.engine = engine;
    const { templateIdentifier } = await engine.importTemplate(p2pkhTemplate);
    state.templateIdentifier = templateIdentifier;
    await engine.setDefaultPolicies({
      change: { templateIdentifier },
      receive: { templateIdentifier },
      address: { templateIdentifier },
    });
    const lockingBytecode = await engine.generateLockingBytecodeFromDefaultPolicy('receive');
    const addr = lockingBytecodeToCashAddress({ bytecode: hexToBin(lockingBytecode), prefix: 'bchtest' });
    if (typeof addr === 'string') throw new Error(addr);
    state.walletAddress = addr.address;
    els.xoAddr.textContent = state.walletAddress;
    els.engineStatus.textContent = 'engine online (chipnet)';
    els.engineStatus.className = 'pill ok';
    await refreshBalance();
    return engine;
  } catch (e) {
    els.engineStatus.textContent = 'engine offline';
    els.engineStatus.className = 'pill err';
    els.xoAddr.textContent = 'unavailable — engine could not connect';
    els.engineError.textContent = `XO Engine could not connect: ${e.message}. The engine needs an Electrum WebSocket (wss://chipnet.imaginary.cash:50004); this network blocks it. Creating jars and the feed still work locally, but tipping needs a network where Electrum WSS is reachable.`;
    els.engineError.classList.remove('hidden');
    throw e;
  }
}

async function refreshBalance() {
  if (!state.engine) return 0n;
  try {
    const outputs = await state.engine.listSpendableUnspentOutputs();
    const total = outputs.reduce((sum, o) => sum + BigInt(o.valueSatoshis || 0), 0n);
    els.xoBalance.textContent = `${fmtBch(total)} tBCH (${total.toString()} sat)`;
    return total;
  } catch (e) {
    els.xoBalance.textContent = `error: ${e.message}`;
    throw e;
  }
}

async function fundWallet() {
  if (!state.engine || !state.walletAddress) {
    showTipStatus('Start the XO Engine first — it could not connect.', 'error');
    return;
  }
  els.btnFaucet.disabled = true;
  els.btnFaucet.textContent = 'Requesting…';
  try {
    const res = await fetch(FAUCET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cashaddr: state.walletAddress }),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`faucet answered ${res.status}: ${body.slice(0, 120)}`);
    showTipStatus('Faucet request sent — waiting for the coins to arrive (usually under a minute)…');
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const bal = await refreshBalance();
      if (bal > BigInt(DUST_LIMIT_SATOSHIS)) { showTipStatus(`Funded! Balance is now ${fmtBch(bal)} tBCH.`, 'ok'); return; }
    }
    showTipStatus('Faucet accepted the request but no coins arrived yet — wait a bit and press Refresh balance.', 'error');
  } catch (e) {
    showTipStatus(`Faucet failed: ${e.message}. Use the fallback faucet link below.`, 'error');
  } finally {
    els.btnFaucet.disabled = false;
    els.btnFaucet.textContent = 'Get free chipnet BCH';
  }
}

// ---------------------------------------------------------------- tip jars
function buildTipLink(jar) {
  const q = new URLSearchParams({
    id: jar.id,
    name: jar.name,
    msg: jar.message || '',
    target: jar.targetSats.toString(),
    to: jar.to,
  });
  return `${location.origin}${location.pathname}#/tip?${q.toString()}`;
}
function parseTipHash() {
  const h = location.hash;
  if (!h.startsWith('#/tip?')) return null;
  const q = new URLSearchParams(h.slice(6));
  const to = q.get('to') || '';
  const target = q.get('target') || '';
  if (!to || !target) return null;
  return {
    id: q.get('id') || `remote-${to.slice(-8)}`,
    name: q.get('name') || 'Tip jar',
    message: q.get('msg') || '',
    targetSats: BigInt(target),
    to,
  };
}
function raisedForJar(jar) {
  const tips = loadJson(TIPS_KEY, []);
  return tips
    .filter((t) => t.jarId === jar.id || t.to === jar.to)
    .reduce((sum, t) => sum + BigInt(t.sats), 0n);
}
function renderTipCard() {
  const jar = state.jar;
  if (!jar) { els.tipCard.classList.add('hidden'); return; }
  els.tipCard.classList.remove('hidden');
  els.tipTitle.textContent = `Tip ${jar.name}`;
  els.tipMessage.textContent = jar.message || '(no message)';
  els.tipAddr.textContent = jar.to;
  const raised = raisedForJar(jar);
  const pct = jar.targetSats > 0n ? Number((raised * 10000n) / jar.targetSats) / 100 : 0;
  els.progressFill.style.width = `${Math.min(100, pct)}%`;
  els.progressRaised.textContent = `${fmtBch(raised)} tBCH`;
  els.progressTarget.textContent = `${fmtBch(jar.targetSats)} tBCH`;
  els.progressPct.textContent = `${pct.toFixed(1)}%`;
  hideReceipt(); clearTipStatus();
}
function renderJars() {
  const jars = loadJson(JARS_KEY, []);
  els.jarsList.innerHTML = '';
  els.jarsEmpty.classList.toggle('hidden', jars.length > 0);
  for (const jar of jars) {
    const raised = raisedForJar(jar);
    const li = document.createElement('li');
    li.innerHTML = `<b>${escapeHtml(jar.name)}</b>
      <span class="muted">${fmtBch(raised)} / ${fmtBch(BigInt(jar.targetSats))} tBCH raised</span><br/>
      <a href="${buildTipLink(jar)}">open tip page</a> · <code>${escapeHtml(jar.to)}</code>`;
    els.jarsList.appendChild(li);
  }
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------------------------------------------------------- feed
function renderFeed() {
  const tips = loadJson(TIPS_KEY, []).slice().reverse();
  els.feedList.innerHTML = '';
  els.feedEmpty.classList.toggle('hidden', tips.length > 0);
  for (const t of tips.slice(0, 20)) {
    const when = t.time ? new Date(t.time).toLocaleString() : 'unconfirmed';
    const li = document.createElement('li');
    li.innerHTML = `<b>${fmtBch(BigInt(t.sats))} tBCH</b>
      <span class="muted">from ${escapeHtml(t.tipper || 'anonymous')} to ${escapeHtml(t.jarName || 'a tip jar')} · ${when}</span><br/>
      <a href="${explorerTxUrl(t.txid)}" target="_blank" rel="noopener">${t.txid.slice(0, 16)}…${t.txid.slice(-8)}</a>`;
    els.feedList.appendChild(li);
  }
}
function recordTip(tip) {
  const tips = loadJson(TIPS_KEY, []);
  tips.push(tip);
  saveJson(TIPS_KEY, tips);
}

// ---------------------------------------------------------------- pay a tip (XO Engine sendSatoshis)
async function sendTip(sats, jar) {
  const engine = state.engine;
  if (!engine) throw new Error('XO Engine is not connected.');
  // Recipient locking bytecode from the jar's cashaddr.
  const decoded = cashAddressToLockingBytecode(jar.to);
  if (typeof decoded === 'string') throw new Error(`Bad jar address: ${decoded}`);
  const recipientLockingBytecode = binToHex(decoded.bytecode);

  const funded = await engine.listSpendableUnspentOutputs();
  if (funded.length === 0) throw new Error('No spendable outputs — fund the wallet from the faucet first.');
  const fundedOutput = funded[0];
  const total = funded.reduce((s, o) => s + BigInt(o.valueSatoshis || 0), 0n);
  if (total < sats + 1000n) throw new Error(`Not enough tBCH: balance ${fmtBch(total)}, need ${fmtBch(sats)} + fee.`);

  const template = await engine.getTemplate(state.templateIdentifier);
  if (!template) throw new Error('Template not imported.');
  const lockingScript = getTemplateLockingScriptOrThrow(template, 'receivingLockingScript');
  const receiverIntents = lockingScript.roles?.receiver?.actions ?? [];
  const sendIntent = receiverIntents.find((i) => i.action === 'sendSatoshis');
  if (!sendIntent) throw new Error('sendSatoshis intent not found in p2pkhTemplate.');

  const created = await engine.createInvitation({
    templateIdentifier: state.templateIdentifier,
    actionIdentifier: 'sendSatoshis',
    intent: sendIntent,
    variables: [
      { variableIdentifier: 'transferredSatoshis', roleIdentifier: 'sender', value: sats },
      { variableIdentifier: 'recipientLockingscript', roleIdentifier: 'sender', value: recipientLockingBytecode },
    ],
    inputs: [{
      outpointTransactionHash: hexToBin(fundedOutput.outpointTransactionHash),
      outpointIndex: fundedOutput.outpointIndex,
    }],
  });
  const { invitationIdentifier } = created.invitation;

  await engine.appendInvitation(invitationIdentifier, {
    templateIdentifier: state.templateIdentifier,
    actionIdentifier: 'sendSatoshis',
    outputs: [{ outputIdentifier: 'transferSatoshisOutput' }],
  });

  const leftover = await engine.calculateChange(invitationIdentifier);
  const estimatedFee = await engine.estimateTransactionFee(invitationIdentifier);
  const changeSatoshis = leftover.valueSatoshis - BigInt(estimatedFee);
  if (changeSatoshis >= BigInt(DUST_LIMIT_SATOSHIS) || leftover.tokens.length > 0) {
    await engine.addChangeToInvitation(invitationIdentifier);
  }

  const ownInputIndexes = await engine.listOwnInputIndexes(invitationIdentifier);
  for (const inputIndex of ownInputIndexes) {
    await engine.signInvitation(invitationIdentifier, inputIndex);
  }

  const { builtTransaction } = await engine.executeAction(invitationIdentifier, { broadcastTransaction: true });
  return builtTransaction.transactionHash;
}

async function payTip() {
  const jar = state.jar;
  if (!jar) return;
  clearTipStatus(); hideReceipt();
  els.btnTip.disabled = true;
  try {
    const sats = bchToSats(els.inTipAmount.value.trim());
    showTipStatus('Building the tip with the XO Engine — invitation, change, sign, broadcast…');
    const txid = await sendTip(sats, jar);
    recordTip({
      jarId: jar.id, jarName: jar.name, to: jar.to,
      tipper: els.inTipper.value.trim() || 'anonymous',
      sats: sats.toString(), txid, time: Date.now(),
    });
    showTipStatus(`Tip sent! Transaction ${txid} — confirming on-chain…`, 'ok');
    showReceipt(txid);
    renderTipCard(); renderFeed();
    await refreshBalance();
  } catch (e) {
    showTipStatus(`Tip failed: ${e.message}`, 'error');
  } finally {
    els.btnTip.disabled = false;
  }
}

// ---------------------------------------------------------------- events
els.createForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    if (!state.engine || !state.walletAddress) {
      alert('The XO Engine is not connected yet — the tip jar needs a receive address from the engine. Wait for it to connect (or check the error above).');
      return;
    }
    const targetSats = bchToSats(els.inTarget.value.trim());
    // Fresh receive address per jar, so each jar tracks its own tips.
    const lockingBytecode = await state.engine.generateLockingBytecodeFromDefaultPolicy('receive');
    const addr = lockingBytecodeToCashAddress({ bytecode: hexToBin(lockingBytecode), prefix: 'bchtest' });
    if (typeof addr === 'string') throw new Error(addr);
    const jar = {
      id: `jar-${Date.now().toString(36)}`,
      name: els.inName.value.trim(),
      message: els.inMessage.value.trim(),
      targetSats: targetSats.toString(),
      to: addr.address,
    };
    const jars = loadJson(JARS_KEY, []);
    jars.push(jar);
    saveJson(JARS_KEY, jars);
    const link = buildTipLink(jar);
    els.outLink.value = link;
    els.btnOpenLink.href = link;
    els.qrImg.src = await QRCode.toDataURL(link, { width: 220, margin: 1 });
    els.jarResult.classList.remove('hidden');
    els.jarResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    renderJars();
  } catch (e) {
    alert(e.message);
  }
});
els.btnCopyLink.addEventListener('click', () => copyText(els.outLink.value, els.btnCopyLink));
els.btnReceiptCopy.addEventListener('click', () => copyText(els.rcTxid.textContent, els.btnReceiptCopy));
els.btnFaucet.addEventListener('click', fundWallet);
els.btnRefreshBalance.addEventListener('click', () => refreshBalance().catch(() => {}));
els.btnRefreshFeed.addEventListener('click', () => { renderFeed(); renderTipCard(); });
els.tipForm.addEventListener('submit', (ev) => { ev.preventDefault(); payTip(); });
window.addEventListener('hashchange', () => {
  state.jar = parseTipHash();
  renderTipCard();
});

// ---------------------------------------------------------------- init
(function init() {
  $('link-repo').href = REPO_URL;
  state.jar = parseTipHash();
  renderTipCard();
  renderFeed();
  renderJars();
  initEngine().catch(() => { /* error shown in the wallet card */ });
})();
