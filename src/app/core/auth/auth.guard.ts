import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../../domain/models';
import { AuthService } from './auth.service';

/** Requires a signed-in user, otherwise sends them to sign-in. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/sign-in']);
};

const homeOf = (role: Role | null) => (role === 'technician' ? '/app/tasks' : '/app/overview');

/** Keeps each role inside its own screens. A wrong role is sent to its home. */
export const roleGuard =
  (role: Role): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    return auth.role() === role ? true : inject(Router).createUrlTree([homeOf(auth.role())]);
  };

/** /app on its own goes to the home of the signed-in role. */
export const homeGuard: CanActivateFn = () =>
  inject(Router).createUrlTree([homeOf(inject(AuthService).role())]);
