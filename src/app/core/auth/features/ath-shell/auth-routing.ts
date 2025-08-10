import { Routes } from '@angular/router';

export default [
  {
    path: 'sign',
    loadComponent: () => import('../sign-up/sign-up').then((m) => m.SignUp),
  },
  {
    path: 'login',
    loadComponent: () => import('../login-in/login-in').then((m) => m.LoginIn),
  },
] as Routes;
