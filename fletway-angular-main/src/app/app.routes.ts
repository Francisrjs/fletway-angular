import { Routes } from '@angular/router';

import { privateGuard, publicGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [publicGuard],
    loadChildren: () =>
      import('./core/auth/features/ath-shell/auth-routing').then(
        (m) => m.default,
      ),
  },
  {
    path: '',
    canActivate: [privateGuard],
    loadChildren: () =>
      import('./modules/module-shell/module-routing').then((m) => m.default),
  },
  {
    path: '',
    canActivate: [privateGuard],
    loadComponent: () => import('./modules/home/home').then((m) => m.Home),
  },
  {
    path: '',
    canActivate: [privateGuard],
    loadComponent: () =>
      import('./modules/fletero/fletero-component/fletero-component').then(
        (m) => m.FleteroComponent,
      ),
  },
];
