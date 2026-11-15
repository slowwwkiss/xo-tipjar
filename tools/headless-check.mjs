// Headless verification of the built XO TipJar app (docs/) in Chromium.
// Collects console errors / failed requests, checks the banner, wallet card,
// engine status, jar creation, and tip-link rendering. Records video.
// Run while a static server serves docs/ on http://127.0.0.1:4174.
import { chromium } from 'playwright-core';

const BASE = process.env.XOTIPJAR_URL || 'http://127.0.0.1:4174/';
const SHELL = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const OUT = new URL('./', import.meta.url).pathname;

const browser = await chromium.launch({ executablePath: SHELL, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  recordVideo: { dir: `${OUT}video`, size: { width: 390, height: 844 } },
});
const page = await context.newPage();
const errors = [];
const failedReqs = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('requestfailed', (r) => failedReqs.push(r.url() + ' :: ' + (r.failure()?.errorText || '')));
page.on('response', (r) => { if (r.status() >= 400) failedReqs.push(r.url() + ' :: HTTP ' + r.status()); });
page.on('dialog', async (d) => { console.log('dialog:', d.type(), d.message()); await d.accept(); });

console.log('== load home ==');
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(5000);
console.log('title:', await page.title());
console.log('banner links:', await page.$$eval('#top-banner a', (els) => els.map((e) => (e.textContent || '').trim() + ' -> ' + e.href)));
console.log('hero h1:', await page.textContent('.hero h1'));
console.log('engine status (5s):', await page.textContent('#engine-status'));
await page.screenshot({ path: `${OUT}shot-1-home.png`, fullPage: true });

// Wait for the engine init to settle (45s timeout in the app) and report.
await page.waitForTimeout(45000);
console.log('engine status (50s):', await page.textContent('#engine-status'));
console.log('wallet addr:', await page.textContent('#xo-addr'));
console.log('wallet balance:', await page.textContent('#xo-balance'));
console.log('engine error visible:', await page.$eval('#engine-error', (el) => !el.classList.contains('hidden')).catch(() => 'n/a'));
console.log('engine error text:', (await page.textContent('#engine-error').catch(() => '')).slice(0, 300));
await page.screenshot({ path: `${OUT}shot-2-engine-settled.png`, fullPage: true });

console.log('== create jar (engine offline path) ==');
await page.click('#create-form button[type=submit]');
await page.waitForTimeout(1500);
console.log('jar result visible:', await page.$eval('#jar-result', (el) => !el.classList.contains('hidden')).catch(() => 'n/a'));

console.log('== open a tip link (no engine needed to render) ==');
const tipUrl = `${BASE}#/tip?id=jar-demo&name=${encodeURIComponent("Reza's coffee fund")}&msg=${encodeURIComponent('Tips keep the demos coming!')}&target=1000000&to=bchtest:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a`;
await page.goto(tipUrl, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
console.log('tip card visible:', await page.$eval('#tip-card', (el) => !el.classList.contains('hidden')));
console.log('tip title:', await page.textContent('#tip-title'));
console.log('progress target:', await page.textContent('#progress-target'));
console.log('progress raised:', await page.textContent('#progress-raised'));
await page.screenshot({ path: `${OUT}shot-3-tip-page.png`, fullPage: true });

console.log('== pay tip (engine offline path) ==');
await page.click('#tip-form button[type=submit]');
await page.waitForTimeout(3000);
console.log('tip status:', await page.textContent('#tip-status'));

console.log('== feed / jars ==');
console.log('feed empty visible:', await page.$eval('#feed-empty', (el) => !el.classList.contains('hidden')));
console.log('jars empty visible:', await page.$eval('#jars-empty', (el) => !el.classList.contains('hidden')));

console.log('== errors ==');
console.log('JS errors:', JSON.stringify(errors, null, 1));
console.log('failed requests:', JSON.stringify(failedReqs, null, 1));

await context.close();
await browser.close();
console.log('DONE');
