// Firefox probe: load the app, log everything for 20s.
import { firefox } from 'playwright-core';

const BASE = 'http://127.0.0.1:4174/';

const browser = await firefox.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('console', (m) => console.log('[console.' + m.type() + ']', m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', (e.stack || e.message).slice(0, 800)));
page.on('crash', () => console.log('[CRASH] page crashed'));
try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('loaded, waiting...');
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(5000);
    console.log(`t=${(i + 1) * 5}s status:`, await page.textContent('#engine-status').catch((e) => 'ERR ' + e.message));
    console.log(`t=${(i + 1) * 5}s addr:`, (await page.textContent('#xo-addr').catch(() => '')).slice(0, 120));
  }
  await page.screenshot({ path: '/tmp/xo-ff-shot.png', fullPage: true });
  console.log('screenshot saved');
} catch (e) {
  console.log('[error]', (e.stack || e.message).slice(0, 500));
}
await browser.close();
console.log('DONE');
