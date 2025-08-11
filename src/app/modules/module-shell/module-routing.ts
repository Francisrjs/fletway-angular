import { Routes } from '@angular/router';

export default [
  {
    path: 'fletero',
    loadComponent: () =>
      import('../fletero/fletero-component/fletero-component').then(
        (m) => m.FleteroComponent,
      ),
  },
  {
    path: 'cliente',
    loadComponent: () =>
      import('../cliente/cliente-component/cliente-component').then(
        (m) => m.ClienteComponent,
      ),
  },
] as Routes;
