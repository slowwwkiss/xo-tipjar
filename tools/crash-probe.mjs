// Minimal crash probe: load the app, log everything for 20s.
import { chromium } from 'playwright-core';

const BASE = 'http://127.0.0.1:4174/';
const SHELL = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';

const browser = await chromium.launch({ executablePath: SHELL, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('console', (m) => console.log('[console.' + m.type() + ']', m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', (e.stack || e.message).slice(0, 800)));
page.on('crash', () => console.log('[CRASH] page crashed'));
page.on('requestfailed', (r) => console.log('[reqfail]', r.url()));
try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('loaded, waiting...');
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(5000);
    console.log(`t=${(i + 1) * 5}s status:`, await page.textContent('#engine-status').catch((e) => 'ERR ' + e.message));
  }
} catch (e) {
  console.log('[goto/wait error]', (e.stack || e.message).slice(0, 500));
}
await browser.close();
console.log('DONE');
