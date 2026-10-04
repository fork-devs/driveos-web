// Smoke test: opens each screen in headless Chromium, records console errors, saves screenshots.
// Run with the dev server up: node e2e/smoke.mjs [outDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4200';
const OUT = process.argv[2] ?? 'e2e/out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`[${tag}] requestfailed: ${r.url()}`));
};

async function landing(name, viewport, scheme) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  watch(page, name);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}-loader.png` });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `${OUT}/${name}-hero.png` });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = viewport.height;
  const sections = ['#how', '#features', '#roles', '#plans', '#demo'];
  for (const s of sections) {
    await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ behavior: 'instant' }), s);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${name}-${s.slice(1)}.png` });
  }
  console.log(name, 'scrollHeight', h, 'viewport', vh);
  await ctx.close();
}

async function appFlow(name, email, viewport, scheme) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme });
  const page = await ctx.newPage();
  watch(page, name);
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/${name}-signin.png` });
  await page.fill('#si-email', email);
  await page.fill('#si-password', 'secreta123');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/app\//, { timeout: 8000 });
  await page.waitForTimeout(1200);
  const routes = email.includes('tecnico') ? ['tasks', 'agenda'] : ['overview', 'orders', 'inventory', 'alerts', 'agenda'];
  for (const r of routes) {
    await page.goto(`${BASE}/app/${r}`, { waitUntil: 'networkidle' }).catch(() => {});
    if (!page.url().includes('/app/')) { errors.push(`[${name}] lost session on ${r}`); break; }
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${name}-${r}.png` });
  }
  await ctx.close();
}

// SPA reload drops the in-memory session, so the flow above navigates by clicking instead.
async function appFlowClicks(name, email, viewport, scheme) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme });
  const page = await ctx.newPage();
  watch(page, name);
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/${name}-signin.png` });
  await page.fill('#si-email', email);
  await page.fill('#si-password', 'secreta123');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/app\//, { timeout: 8000 });
  await page.waitForTimeout(1500);
  const links = await page.$$eval('nav a[href^="/app/"]', (as) => as.map((a) => a.getAttribute('href')));
  for (const href of links) {
    await page.click(`nav a[href="${href}"]`);
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${OUT}/${name}-${href.split('/').pop()}.png` });
  }
  await ctx.close();
}

const mode = process.env.MODE ?? 'all';
const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };

if (mode === 'all' || mode === 'landing') {
  await landing('landing-light', desktop, 'light');
  await landing('landing-dark', desktop, 'dark');
  await landing('landing-phone', phone, 'light');
}
if (mode === 'all' || mode === 'app') {
  await appFlowClicks('manager', 'elena@taller.pe', desktop, 'light');
  await appFlowClicks('manager-dark', 'elena@taller.pe', desktop, 'dark');
  await appFlowClicks('tech-phone', 'marco.tecnico@taller.pe', phone, 'light');
}

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no errors');
