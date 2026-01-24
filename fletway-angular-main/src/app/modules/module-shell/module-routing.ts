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
    path: 'fletero/historial',
    loadComponent: () =>
      import('../fletero/historial-fletero/historial-fletero').then(
        (m) => m.HistorialFleteroComponent,
      ),
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
  {
    path: 'cliente/detallePresupuesto/:id',
    loadComponent: () =>
      import('../cliente/cliente-presupuesto/cliente-presupuesto').then(
        (m) => m.ClientePresupuesto,
      ),
  },
  {
    path: 'map',
    loadComponent: () =>
      import('../../shared/features/map/map').then((m) => m.MapComponent),
  },
] as Routes;
