import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_BASE } from '../config';

const AUTH_PATH = `${API_BASE}/authentication`;

/**
 * Adds the JWT to every call to the gateway. A 401 on any other call means the token expired or was
 * revoked: the session is dropped and the user is sent to sign-in. Sign-in's own 401 stays with the form.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE)) return next(req);
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken();
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !req.url.startsWith(AUTH_PATH) && token) {
        auth.signOut();
        void router.navigateByUrl('/sign-in');
      }
      return throwError(() => err);
    }),
  );
};
