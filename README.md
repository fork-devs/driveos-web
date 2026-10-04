# DriveOS Web

Frontend of DriveOS Workshop (ForkDevs, course 1ASI0657). Angular 21, SCSS tokens, Transloco (es/en), three.js, GSAP.

## Run

```bash
npm install
npm start          # http://localhost:4200
npm run build      # production build in dist/
```

## Test (with the dev server running)

```bash
npm run e2e        # 16 behaviour checks: validation, i18n, role guards, order flow, offline queue
npm run a11y       # axe scan (WCAG 2.1 AA) on landing, sign-in and manager screens, light and dark
npm run shots      # screenshots of every screen in e2e/out (needs `npx playwright install chromium` once)
```

## Try the app

The backend does not exist yet, so `src/app/core/api/mock-api.interceptor.ts` answers the API.
Turn it off with `USE_MOCKS = false` in `src/app/core/config.ts`.

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

## Endpoints the mock uses that are not yet in endpoints.md

`GET /tasks?assignee=me`, `PATCH /tasks/{id}/status` (idempotent by `Idempotency-Key`), `GET /vehicles/dtc-alerts`.
Add them to the API contract before building the services.

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
