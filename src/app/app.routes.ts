import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./core/auth/features/ath-shell/auth-routing').then(
        (m) => m.default,
      ),
  },
];
