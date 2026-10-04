// Live-backend check: signs in as each dev user against the real API (mocks off) and visits every page.
// Reports failed /api responses, console errors and what each page rendered.
// Needs: docker compose stack up in the backend repo, `ng serve` on :4200 (proxy /api -> :8080).
// Run: node e2e/live.mjs   (BASE=http://localhost:4200 by default; SHOTS=dir to save screenshots)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4200';
const SHOTS = process.env.SHOTS ?? 'e2e/out/live';
mkdirSync(SHOTS, { recursive: true });

const PASSWORD = 'Driveos123!';
const USERS = [
  { email: 'owner@driveos.dev', label: 'owner' },
  { email: 'manager@driveos.dev', label: 'manager' },
  { email: 'technician@driveos.dev', label: 'technician' },
];
const PAGES = ['overview', 'orders', 'telemetry', 'inventory', 'billing', 'agenda', 'tasks'];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

let problems = 0;
const report = (line) => console.log(line);

for (const user of USERS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const issues = [];
  let apiCalls = 0;
  page.on('console', (m) => {
    if (m.type() === 'error') issues.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => {
    // Navigating away cancels in-flight XHRs (net::ERR_ABORTED): not an application error.
    if (r.failure()?.errorText === 'net::ERR_ABORTED') return;
    issues.push(`requestfailed: ${r.method()} ${r.url()} ${r.failure()?.errorText ?? ''}`);
  });
  page.on('response', (r) => {
    if (!r.url().includes('/api/')) return;
    apiCalls++;
    if (r.status() >= 400) issues.push(`HTTP ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}${new URL(r.url()).search}`);
  });

  report(`\n== ${user.label} (${user.email})`);
  await page.goto(`${BASE}/sign-in?mock=0`, { waitUntil: 'networkidle' });
  await page.fill('#si-email', user.email);
  await page.fill('#si-password', PASSWORD);
  await page.click('button[type=submit]');
  try {
    await page.waitForURL(/\/app\//, { timeout: 10000 });
  } catch {
    issues.push(`sign-in did not reach /app (url ${page.url()})`);
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  report(`   landed on ${new URL(page.url()).pathname}`);

  for (const route of PAGES) {
    const before = issues.length;
    await page.goto(`${BASE}/app/${route}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(800);
    const path = new URL(page.url()).pathname;
    if (!path.startsWith('/app')) {
      issues.push(`lost session on ${route} -> ${path}`);
      break;
    }
    const redirected = path !== `/app/${route}`;
    const text = (await page.locator('main, .page, app-root').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const rows = await page.locator('tr, li, article, .card').count();
    await page.screenshot({ path: `${SHOTS}/${user.label}-${route}.png` });
    const newIssues = issues.slice(before);
    report(`   ${route.padEnd(10)} ${redirected ? `-> ${path} (role redirect)` : 'ok'.padEnd(2)}  elems=${rows} chars=${text.length} issues=${newIssues.length}`);
    for (const i of newIssues) report(`      ! ${i}`);
  }
  report(`   api calls: ${apiCalls}, issues: ${issues.length}`);
  problems += issues.length;
  await ctx.close();
}

await browser.close();
console.log(`\n${problems === 0 ? 'PASS' : 'FAIL'}: ${problems} issue(s)`);
process.exit(problems === 0 ? 0 : 1);
