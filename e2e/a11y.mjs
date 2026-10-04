// Accessibility scan with axe on the main screens, in light and dark. Run with the dev server up.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE ?? 'http://localhost:4200';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let total = 0;

async function scan(page, name) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  for (const v of r.violations) {
    total++;
    console.log(`[${name}] ${v.impact} ${v.id}: ${v.help} (${v.nodes.length})`);
    for (const n of v.nodes.slice(0, 3)) console.log('    ', n.target.join(' '), '|', (n.any[0]?.message ?? n.all[0]?.message ?? '').slice(0, 140));
  }
}

for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/landing`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  for (const s of ['#how', '#features', '#roles', '#plans', '#demo']) {
    await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ behavior: 'instant' }), s);
    await page.waitForTimeout(900);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(500);
  await scan(page, `landing-${scheme}`);

  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await scan(page, `sign-in-${scheme}`);
  await page.fill('#si-email', 'elena@taller.pe');
  await page.fill('#si-password', 'secreta123');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/app\//);
  for (const href of ['overview', 'orders', 'inventory', 'billing', 'telemetry', 'agenda']) {
    await page.click(`nav a[href="/app/${href}"]`);
    await page.waitForTimeout(1200);
    await scan(page, `${href}-${scheme}`);
  }
  await ctx.close();
}
await browser.close();
console.log(total ? `${total} violation groups` : 'NO VIOLATIONS');
