import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';
import { Profile } from '../../domain/models';
import { API_BASE, USE_MOCKS } from '../config';

const SESSION_KEY = 'driveos.session';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignInBody {
  email: string;
  password: string;
}

export interface SignUpBody extends SignInBody {
  name: string;
}

/** i18n keys under auth.errors, chosen from the HTTP status of a failed call. */
export function errorKey(err: unknown): 'invalidCredentials' | 'emailTaken' | 'generic' {
  const status = err instanceof HttpErrorResponse ? err.status : 0;
  if (status === 401) return 'invalidCredentials';
  if (status === 409) return 'emailTaken';
  return 'generic';
}

/**
 * Client for the Auth Service (endpoints.md, sections 1 and 2). Against the real gateway the session lives
 * in memory only (the refresh token is an httpOnly cookie). While mocks are on, it is mirrored to
 * sessionStorage so a page reload (or a dev-server reload) does not throw the user back to sign-in.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly restored = USE_MOCKS ? this.restore() : null;
  private readonly _tokens = signal<TokenPair | null>(this.restored?.tokens ?? null);
  private readonly _profile = signal<Profile | null>(this.restored?.profile ?? null);

  readonly accessToken = computed(() => this._tokens()?.accessToken ?? null);
  readonly profile = this._profile.asReadonly();
  readonly role = computed(() => this._profile()?.role ?? null);
  readonly isAuthenticated = computed(() => this._profile() !== null);

  constructor() {
    if (!USE_MOCKS) return;
    effect(() => {
      const tokens = this._tokens();
      const profile = this._profile();
      try {
        if (tokens && profile) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ tokens, profile }));
        else sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* storage blocked: session stays in memory */
      }
    });
  }

  private restore(): { tokens: TokenPair; profile: Profile } | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Signs in, then loads the profile (role, tenant, workshop) the app needs to pick its screens. */
  signIn(body: SignInBody): Observable<Profile> {
    return this.http.post<TokenPair>(`${API_BASE}/authentication/sign-in`, body).pipe(
      tap((tokens) => this._tokens.set(tokens)),
      switchMap(() => this.http.get<Profile>(`${API_BASE}/profiles/me`)),
      tap((profile) => this._profile.set(profile)),
      catchError((err) => {
        this.signOut();
        return throwError(() => err);
      }),
    );
  }

  signUp(body: SignUpBody): Observable<void> {
    return this.http.post<void>(`${API_BASE}/authentication/sign-up`, body);
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(`${API_BASE}/authentication/password-reset/request`, { email });
  }

  signOut(): void {
    this._tokens.set(null);
    this._profile.set(null);
  }
}
