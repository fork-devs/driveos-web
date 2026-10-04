import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, tap, throwError } from 'rxjs';
import {
  AuthenticatedUserDto,
  BranchDto,
  EmployeeRegistrationDto,
  PersonDto,
  ProfileRoleDto,
  UserDto,
  WorkshopDto,
} from '../../domain/backend';
import { Lookups } from '../../domain/lookups';
import { fullName, toBranch } from '../../domain/mappers';
import { Profile, Role } from '../../domain/models';
import { API_BASE, USE_MOCKS } from '../config';

const SESSION_KEY = 'driveos.session';

export interface TokenPair {
  accessToken: string;
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
  // The backend answers a failed sign-in with 404 (user not found) or 401 (bad password).
  if (status === 401 || status === 404) return 'invalidCredentials';
  if (status === 409) return 'emailTaken';
  return 'generic';
}

/** Expiry (ms since epoch) from the JWT payload, or null when the token is not a readable JWT. */
function expiryOf(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = JSON.parse(atob(payload)).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

const isExpired = (token: string): boolean => {
  const exp = expiryOf(token);
  return exp !== null && exp <= Date.now();
};

/**
 * Client for the IAM service. The backend issues one JWT (no refresh token), so the session is the
 * token plus the resolved profile, kept in sessionStorage: it survives a reload, dies with the tab, and
 * is dropped when the JWT expires or any call answers 401 (see auth.interceptor).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly lookups = inject(Lookups);
  private readonly restored = this.restore();
  private readonly _tokens = signal<TokenPair | null>(this.restored?.tokens ?? null);
  private readonly _profile = signal<Profile | null>(this.restored?.profile ?? null);

  readonly accessToken = computed(() => this._tokens()?.accessToken ?? null);
  readonly profile = this._profile.asReadonly();
  readonly role = computed(() => this._profile()?.role ?? null);
  readonly isAuthenticated = computed(() => this._profile() !== null);

  constructor() {
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
      const saved = raw ? (JSON.parse(raw) as { tokens: TokenPair; profile: Profile }) : null;
      return saved && !isExpired(saved.tokens.accessToken) ? saved : null;
    } catch {
      return null;
    }
  }

  /** Signs in, then loads the profile (role, workshop, branch) the app needs to pick its screens. */
  signIn(body: SignInBody): Observable<Profile> {
    const session$ = USE_MOCKS ? this.mockSignIn(body) : this.realSignIn(body);
    return session$.pipe(
      tap((profile) => this._profile.set(profile)),
      catchError((err) => {
        this.signOut();
        return throwError(() => err);
      }),
    );
  }

  private mockSignIn(body: SignInBody): Observable<Profile> {
    return this.http.post<{ accessToken: string }>(`${API_BASE}/authentication/sign-in`, body).pipe(
      tap((t) => this._tokens.set({ accessToken: t.accessToken })),
      switchMap(() => this.http.get<Profile>(`${API_BASE}/profiles/me`)),
    );
  }

  private realSignIn(body: SignInBody): Observable<Profile> {
    return this.http.post<AuthenticatedUserDto>(`${API_BASE}/authentication/sessions`, body).pipe(
      tap((user) => this._tokens.set({ accessToken: user.token })),
      switchMap((user) => this.resolveProfile(user.id)),
    );
  }

  /**
   * Builds the Profile from the user (IAM) and the person record that Core keeps for them:
   * OWNER -> manager, EMPLOYEE -> technician, CUSTOMER -> owner (vehicle owner).
   */
  private resolveProfile(userId: string): Observable<Profile> {
    return forkJoin({
      user: this.http.get<UserDto>(`${API_BASE}/users/me`),
      roles: this.http.get<ProfileRoleDto[]>(`${API_BASE}/profiles/roles`, { params: { userId } }),
    }).pipe(
      switchMap(({ user, roles }) => {
        if (roles.includes('OWNER')) return this.ownerProfile(user, 'manager');
        if (roles.includes('EMPLOYEE')) return this.employeeProfile(user);
        if (roles.includes('CUSTOMER')) return this.customerProfile(user);
        // Signed up but no Core profile yet: nothing to show.
        return throwError(() => new HttpErrorResponse({ status: 403, statusText: 'No profile for this user' }));
      }),
    );
  }

  private base(user: UserDto, person: PersonDto | null, role: Role): Profile {
    return {
      id: user.id,
      name: fullName(person) === '—' ? user.email : fullName(person),
      email: user.email,
      role,
      tenantId: '',
      workshopName: '',
    };
  }

  private ownerProfile(user: UserDto, role: Role): Observable<Profile> {
    return this.http.get<PersonDto>(`${API_BASE}/owners`, { params: { userId: user.id } }).pipe(
      switchMap((owner) =>
        this.http.get<WorkshopDto[]>(`${API_BASE}/workshops`, { params: { ownerId: owner.id } }).pipe(
          switchMap((workshops) => {
            const workshop = workshops[0];
            if (!workshop) return of({ ...this.base(user, owner, role) });
            return this.http.get<BranchDto[]>(`${API_BASE}/branches`, { params: { workshopId: workshop.id } }).pipe(
              map((branches) => ({
                ...this.base(user, owner, role),
                tenantId: workshop.id,
                workshopId: workshop.id,
                workshopName: workshop.brandName || workshop.businessName,
                currentBranch: branches[0] ? toBranch(branches[0]) : undefined,
              })),
            );
          }),
        ),
      ),
    );
  }

  private employeeProfile(user: UserDto): Observable<Profile> {
    return this.http.get<PersonDto>(`${API_BASE}/employees`, { params: { userId: user.id } }).pipe(
      switchMap((employee) =>
        this.http
          .get<EmployeeRegistrationDto[]>(`${API_BASE}/employee-registrations`, {
            params: { employeeId: employee.id, status: 'ACTIVE' },
          })
          .pipe(
            switchMap((regs) => {
              const reg = regs[0];
              const base = { ...this.base(user, employee, 'technician'), employeeId: employee.id };
              if (!reg) return of(base as Profile);
              return this.http.get<BranchDto>(`${API_BASE}/branches/${reg.branchId}`).pipe(
                switchMap((branch) =>
                  this.http.get<WorkshopDto>(`${API_BASE}/workshops/${branch.workshopId}`).pipe(
                    map((workshop) => ({
                      ...base,
                      tenantId: workshop.id,
                      workshopId: workshop.id,
                      workshopName: workshop.brandName || workshop.businessName,
                      currentBranch: toBranch(branch),
                    })),
                  ),
                ),
              );
            }),
          ),
      ),
    );
  }

  private customerProfile(user: UserDto): Observable<Profile> {
    return this.http
      .get<PersonDto>(`${API_BASE}/customers`, { params: { userId: user.id } })
      .pipe(map((customer) => this.base(user, customer, 'owner')));
  }

  /** The sign-up resource only takes credentials; the person record is created in a later step (Core). */
  signUp(body: SignUpBody): Observable<void> {
    if (USE_MOCKS) return this.http.post<void>(`${API_BASE}/authentication/sign-up`, body);
    return this.http
      .post<UserDto>(`${API_BASE}/users`, { email: body.email, password: body.password })
      .pipe(map(() => undefined));
  }

  requestPasswordReset(email: string): Observable<void> {
    const path = USE_MOCKS ? 'password-reset/request' : 'password-recoveries';
    return this.http.post<void>(`${API_BASE}/authentication/${path}`, { email });
  }

  signOut(): void {
    this._tokens.set(null);
    this._profile.set(null);
    this.lookups.clear();
  }
}
