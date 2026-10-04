// Behaviour checks with assertions. Run with the dev server up: node e2e/flows.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4200';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failed++; };

async function signIn(page, email, password = 'secreta123') {
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.fill('#si-email', email);
  await page.fill('#si-password', password);
  await page.click('button[type=submit]');
}

// 1. Validation and error messages
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.click('button[type=submit]');
  await page.waitForSelector('.error');
  check('sign-in shows required errors', (await page.locator('.error').count()) === 2);
  await signIn(page, 'bloqueado@x.pe');
  await page.waitForSelector('.alert');
  check('bad credentials show alert', /incorrectos/.test(await page.locator('.alert').innerText()));
  check('label is bound to input', (await page.getByLabel('Correo').count()) === 1);
  await ctx.close();
}

// 2. Language switch
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`${BASE}/landing`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.click('button[lang=en]');
  await page.waitForTimeout(400);
  check('EN headline', /one step ahead/.test(await page.locator('h1').innerText()));
  check('html lang updated', (await page.evaluate(() => document.documentElement.lang)) === 'en');
  await page.reload({ waitUntil: 'networkidle' });
  check('language persisted after reload', (await page.evaluate(() => document.documentElement.lang)) === 'en');
  await ctx.close();
}

// 3. Manager: role guard and order transition
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await signIn(page, 'elena@taller.pe');
  await page.waitForURL(/\/app\/overview/);
  check('manager lands on overview', true);
  await page.click('nav a[href="/app/orders"]');
  await page.waitForSelector('mat-expansion-panel.order');
  const row = () => page.locator('mat-expansion-panel.order', { hasText: 'OT-2026-0842' });
  check('order starts as Abierta', /Abierta/.test(await row().locator('app-badge').first().innerText()));
  await row().locator('mat-expansion-panel-header').click();
  await page.getByRole('button', { name: /Avanzar a En curso/ }).click();
  await page.waitForTimeout(1500);
  check('order moved to In progress', /En curso/.test(await row().locator('app-badge').first().innerText()));
  await page.click('nav a[href="/app/inventory"]');
  await page.waitForSelector('mat-expansion-panel.item');
  // first product opens by default; its FIFO table is already visible
  await page.waitForSelector('table.batches');
  const fifo = (await page.locator('table.batches').first().innerText()).toLowerCase();
  check('FIFO batches visible', fifo.includes('sale primero'));
  // Billing: Material tabs switch between invoices and quotes
  await page.click('nav a[href="/app/billing"]');
  await page.waitForSelector('table.invoice-table');
  await page.getByRole('tab', { name: /Cotizaciones/ }).click();
  await page.waitForSelector('.quote-card');
  check('billing quotes tab shows quotes', (await page.locator('.quote-card').count()) > 0);
  await ctx.close();
}

// 4. Technician: offline queue then sync
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await signIn(page, 'marco.tecnico@taller.pe');
  await page.waitForURL(/\/app\/tasks/);
  check('technician lands on tasks', true);
  await page.waitForSelector('.task');
  await ctx.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.getByRole('button', { name: 'Empezar' }).first().click();
  await page.waitForTimeout(500);
  const banner = await page.locator('.banner').innerText();
  check('offline banner shows a pending change', /Sin conexión/.test(banner) && /(1 pendientes)/.test(banner), banner.replace(/\s+/g, ' '));
  check('pending survives in storage', (await page.evaluate(() => JSON.parse(localStorage.getItem('driveos.pending') ?? '[]').length)) === 1);
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(2500);
  check('queue flushed after reconnect', (await page.evaluate(() => JSON.parse(localStorage.getItem('driveos.pending') ?? '[]').length)) === 0);
  check('banner gone after sync', (await page.locator('.banner').count()) === 0);
  await ctx.close();
}

// 5. Guards
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`${BASE}/app/orders`, { waitUntil: 'networkidle' });
  check('anonymous user is sent to sign-in', /\/sign-in$/.test(page.url()));
  await signIn(page, 'marco.tecnico@taller.pe');
  await page.waitForURL(/\/app\/tasks/);
  await page.evaluate(() => { history.pushState({}, '', '/app/orders'); dispatchEvent(new PopStateEvent('popstate')); });
  await page.waitForTimeout(600);
  check('technician cannot open manager screens', /\/app\/tasks$/.test(page.url()), page.url());
  await ctx.close();
}

await browser.close();
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exit(failed ? 1 : 0);
