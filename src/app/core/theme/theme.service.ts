import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'driveos_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.loadStoredMode());
  readonly activeTheme = signal<ResolvedTheme>('light');

  constructor() {
    this.updateActiveTheme();

    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.mode() === 'system') {
          this.updateActiveTheme();
        }
      });
    }

    effect(() => {
      const currentMode = this.mode();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, currentMode);
      }
      this.updateActiveTheme();
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  toggle(): void {
    const current = this.activeTheme();
    this.setMode(current === 'dark' ? 'light' : 'dark');
  }

  private loadStoredMode(): ThemeMode {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (val === 'light' || val === 'dark' || val === 'system') return val;
    }
    return 'system';
  }

  private updateActiveTheme(): void {
    let resolved: ResolvedTheme = 'light';

    if (this.mode() === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } else {
      resolved = this.mode() === 'dark' ? 'dark' : 'light';
    }

    this.activeTheme.set(resolved);

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved);
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  }
}
