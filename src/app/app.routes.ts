import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        // Importa el componente nombrado (recomendado)
        loadComponent: () =>
          import('./core/auth/features/login-in/login-in').then(m => m.LoginIn)
      },
      {
        path: 'sign',
        loadComponent: () =>
          import('./core/auth/features/sign-up/sign-up').then(m => m.SignUp)
      }
    ]
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' }
];
