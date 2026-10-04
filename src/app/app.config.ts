import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

import { routes } from './app.routes';
import { authInterceptor } from './core/api/auth.interceptor';
import { mockApiInterceptor } from './core/api/mock-api.interceptor';
import { LanguageService } from './core/i18n/language.service';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';

const lastPointer = { x: 0, y: 0 };
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
    },
    { capture: true, passive: true },
  );
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // Page change = circular reveal that unfolds from the nav item the user clicked.
      withViewTransitions({
        onViewTransitionCreated: ({ transition }) => {
          const root = document.documentElement;
          // clip-path is relative to the named pane, so convert viewport coords to pane coords.
          const pane = document.querySelector('.stage')?.getBoundingClientRect();
          root.style.setProperty('--vt-x', `${lastPointer.x - (pane?.left ?? 0)}px`);
          root.style.setProperty('--vt-y', `${lastPointer.y - (pane?.top ?? 0)}px`);
          transition.finished.finally(() => {
            root.style.removeProperty('--vt-x');
            root.style.removeProperty('--vt-y');
          });
        },
      }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, mockApiInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['es', 'en'],
        defaultLang: 'es',
        fallbackLang: 'es',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    // Every route needs its language file before first render.
    provideAppInitializer(() => inject(LanguageService).init()),
  ],
};
