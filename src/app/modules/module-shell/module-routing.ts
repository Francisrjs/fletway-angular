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
    path: 'fletero/detalle/:id',
    loadComponent: () =>
      import(
        '../fletero/detalles-solicitud-fletero/detalles-solicitud-fletero'
      ).then((m) => m.DetallesSolicitudFleteroComponent),
  },
  {
    path: 'cliente',
    loadComponent: () =>
      import('../cliente/cliente-component/cliente-component').then(
        (m) => m.ClienteComponent,
      ),
  },
  {
    path: 'cliente/nuevaSolicitud',
    loadComponent: () =>
      import('../cliente/detalles-solicitud-cliente/solicitud').then(
        (m) => m.SolicitudFormComponent,
      ),
  },
] as Routes;
