import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

/**
 * Signals for a GET that a screen needs: data, loading, error, plus reload.
 * Call it in a field initializer (it needs an injection context).
 */
export function loadable<T>(source: () => Observable<T>) {
  const destroyRef = inject(DestroyRef);
  const data = signal<T | null>(null);
  const loading = signal(true);
  const error = signal(false);

  const reload = () => {
    loading.set(true);
    error.set(false);
    source()
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe({
        next: (value) => {
          data.set(value);
          loading.set(false);
        },
        error: () => {
          error.set(true);
          loading.set(false);
        },
      });
  };

  reload();
  return { data, loading: loading.asReadonly(), error: error.asReadonly(), reload };
}
