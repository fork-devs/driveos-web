# DriveOS Web

Frontend of DriveOS Workshop (ForkDevs, course 1ASI0657). Angular 21, SCSS tokens, Transloco (es/en), three.js, GSAP.

## Run

```bash
npm ci
npm start                 # dev server http://localhost:4200, mock API on, /api proxied to :8080
npm run build             # production build in dist/, mock API off, talks to the real gateway
```

## Configuration

| Setting | Where | Default (dev / prod) |
|---|---|---|
| `apiBase` | `src/environments/environment*.ts` | `/api/v1` / `/api/v1` (relative, or an absolute gateway URL) |
| `useMocks` | `src/environments/environment*.ts` | `true` / `false` |
| `?mock` or `?mock=0` | URL, per tab (kept in sessionStorage) | overrides `useMocks`, also in a production build |
| dev proxy | `proxy.conf.json` | `/api` to `http://localhost:8080` (the gateway) |

`ng serve` and `ng build --configuration development` use `environment.development.ts`; the production build uses `environment.ts`.

## Run against the real backend

1. Start the platform (repo `plat-ref`): the API Gateway listens on `:8080` and routes `/api/v1/**` to the services.
2. `npm start`, then open `http://localhost:4200/?mock=0` (the proxy forwards `/api` to the gateway, so there is no CORS).
3. Sign in with a user that has a Core profile (owner or employee). The role comes from `GET /profiles/roles`: OWNER shows the manager screens, EMPLOYEE the technician screens.

Production: `apiBase` is relative, so the host must send `/api/*` to the gateway. On Vercel add a rewrite before the SPA fallback in `vercel.json` (it cannot read env vars, so the URL is written in the file):

```json
{ "source": "/api/:path*", "destination": "https://YOUR-GATEWAY-HOST/api/:path*" }
```

Or set `apiBase` to the absolute gateway URL in `environment.ts` and enable CORS on the gateway.

Session: the gateway issues one JWT (no refresh token). It is kept with the profile in sessionStorage, dropped when it expires, and any 401 from the API signs the user out.

## Backend mapping

`src/app/domain/backend.ts` holds the JSON shapes of the Spring resources, `mappers.ts` turns them into the view models the screens use, and `lookups.ts` resolves ids owned by other services (vehicle, customer, employee, product). Every list is scoped by the selected branch (`BranchContext`).

Not in the backend yet, so the UI degrades: changing a work order status (derived from its tasks), clearing a DTC alert, battery / engine load / oil pressure gauges, bay numbers, voucher and quote dates, a sign-up name (the user resource takes only email and password), and a reset-password screen (`POST /authentication/password-resets` is not wired to a page).

## Test (with the dev server running; uses the mock API)

```bash
npm run e2e        # 18 behaviour checks: validation, i18n, role guards, order flow, offline queue
npm run a11y       # axe scan (WCAG 2.1 AA) on landing, sign-in and manager screens, light and dark
npm run shots      # screenshots of every screen in e2e/out (needs `npx playwright install chromium` once)
```

## Try the app with mocks

With `useMocks` on, `src/app/core/api/mock-api.interceptor.ts` answers the API.

| Sign in with | Result |
|---|---|
| any valid email, any password | manager screens (overview, orders, inventory, alerts, agenda) |
| an email containing `tecnico` | technician screens (my tasks with offline queue, agenda) |
| an email containing `bloqueado` | 401 error |
| sign-up email containing `existente` | 409 error |

## Structure

```
src/app/
  core/        config, API interceptors (auth, mock), auth service and guards, i18n, offline sync
  domain/      models and one typed API client per bounded context
  features/    auth, app-shell, manager, technician
  landing/     landing page and its sections
  loader/      intro screen
  scene/       three.js hero scene
  shared/      logo, badges, async states, pipes
public/
  brand/       logo SVGs and patterns
  i18n/        es.json, en.json
```

## Últimas Modificaciones (Registro de Cambios)

Se han implementado mejoras significativas en la arquitectura del Frontend y la Experiencia de Usuario (UX) enfocadas en el usuario final:

* **Arquitectura de Interfaz y ADD (Attribute-Driven Design):**
  * El *Dashboard* (`overview.page.ts`) fue rediseñado bajo la metodología **PARA** (Proyectos, Áreas, Recursos, Archivos) priorizando la atención inmediata (alertas y órdenes activas).
  * Se eliminó el lenguaje altamente técnico (ej. etiquetas de "Bounded Context") de las vistas de Telemetría, Agenda y Menú Lateral, reemplazándolos por términos amigables mediante el sistema de **i18n** (`Transloco`).
  * Los menús laterales y componentes principales fueron conectados en su totalidad a `es.json` y `en.json` (Ej. corrigiendo el bug de codificación UTF-8 en "Facturación").

* **Gemelo Digital y Hologramas CSS 3D (`Vehicle3dViewerComponent`):**
  * Se reemplazó el motor de renderizado pesado por una solución pura de **CSS 3D Transforms**.
  * Ahora los vehículos en la vista de Telemetría cuentan con un holograma en 3D que rota 360 grados sobre su propio eje (`rotateY`).
  * **Feedback Visual Instantáneo:** El holograma y la leyenda (con puntos de neón difuminados) cambian dinámicamente de Verde (Óptimo) a Rojo (Crítico) si el escáner reporta códigos de falla (DTC).
  * El ícono se adapta automáticamente a la carrocería (ej. `ph-jeep` para Pick-ups y Camionetas, `ph-car-profile` para automóviles).

* **Performance y Micro-interacciones:**
  * **Pantalla de Carga:** Se solucionó el "rebote" (glitch) y la congelación del componente de carga inicial separando la animación de los *promises* asíncronos.
  * **Latencia de Vistas:** Se redujo la latencia del `mock-api.interceptor.ts` de 250ms a 50ms, logrando que el cambio de pestañas (hacia Agenda y Bahías) con `ChangeDetectionStrategy.OnPush` sea 100% instantáneo y libre de cuellos de botella visuales.
  * **Selector de Sedes:** Se corrigió el problema de solapamiento del menú desplegable globalizando la clase `.branch-menu` en `styles.scss` con sombras correctas (Elevation / z-index) y el desenfoque estilo "cristal".
  * **Contraste de Alertas (WCAG):** Se añadió el estado `solid-red` al `StatusBadgeComponent` asegurando la correcta visibilidad (letras blancas sobre fondo rojo sólido) en la alerta "Crítica" por encima del fondo oscuro del panel.

* **Gateway (OmniRoute):** 
  * Se desplegó de manera independiente el proxy OmniRoute habilitando flujos de integración y el correcto manejo offline simulado en el entorno local.
