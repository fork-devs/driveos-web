// Screenshots of the manager dashboard in both themes plus a mid-transition frame. Dev server must be up.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4200';
const OUT = process.env.OUT ?? 'e2e/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript((t) => localStorage.setItem('driveos_theme', t), theme);
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.fill('#si-email', 'elena@taller.pe');
  await page.fill('#si-password', 'secreta123');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/app\/overview/);
  await page.waitForSelector('.hero');
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/overview-${theme}.png`, fullPage: true });

  if (theme === 'light') {
    await page.click('nav a[href="/app/orders"]');
    await page.waitForTimeout(180);
    await page.screenshot({ path: `${OUT}/transition-mid.png` });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/orders-light.png` });
  }
  console.log(theme, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'no console errors');
  await ctx.close();
}
await browser.close();
