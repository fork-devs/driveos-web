// A page reload must keep the session and skip the intro loader. Dev server must be up.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4200';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
let failed = 0; const check = (n, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); if (!ok) failed++; };
await p.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
check('intro loader shows on first visit', (await p.locator('.loader-overlay').count()) === 1);
await p.waitForSelector('#si-email'); await p.waitForTimeout(3500);
await p.fill('#si-email', 'elena@taller.pe'); await p.fill('#si-password', 'secreta123'); await p.click('button[type=submit]');
await p.waitForURL(/\/app\/overview/);
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('.hero');
check('reload keeps the session', /\/app\/overview/.test(p.url()));
check('reload skips the intro loader', (await p.locator('.loader-overlay').count()) === 0);
await p.click('nav a[href="/app/telemetry"]');
await p.waitForSelector('.gauge-card');
check('telemetry selects first vehicle on load', (await p.locator('.gauge-card').count()) === 6);
await b.close(); process.exit(failed ? 1 : 0);
