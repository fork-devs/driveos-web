import { Routes } from '@angular/router';
import { authGuard, homeGuard, roleGuard } from './core/auth/auth.guard';
import { LandingPage } from './landing/landing.page';

export const routes: Routes = [
  { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
  { path: 'landing', component: LandingPage },
  {
    path: 'sign-in',
    loadComponent: () => import('./features/auth/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./features/auth/sign-up.page').then((m) => m.SignUpPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeGuard], children: [] },
      {
        path: 'overview',
        canActivate: [roleGuard('manager')],
        loadComponent: () => import('./features/manager/overview.page').then((m) => m.OverviewPage),
      },
      {
        path: 'orders',
        canActivate: [roleGuard('manager')],
        loadComponent: () => import('./features/manager/orders.page').then((m) => m.OrdersPage),
      },
      {
        path: 'telemetry',
        loadComponent: () => import('./features/iot/telemetry.page').then((m) => m.TelemetryPage),
      },
      {
        path: 'alerts',
        redirectTo: 'telemetry',
        pathMatch: 'full',
      },
      {
        path: 'inventory',
        canActivate: [roleGuard('manager')],
        loadComponent: () => import('./features/manager/inventory.page').then((m) => m.InventoryPage),
      },
      {
        path: 'billing',
        canActivate: [roleGuard('manager')],
        loadComponent: () => import('./features/billing/billing.page').then((m) => m.BillingPage),
      },
      {
        path: 'agenda',
        loadComponent: () => import('./features/manager/agenda.page').then((m) => m.AgendaPage),
      },
      {
        path: 'tasks',
        canActivate: [roleGuard('technician')],
        loadComponent: () => import('./features/technician/tasks.page').then((m) => m.TasksPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
