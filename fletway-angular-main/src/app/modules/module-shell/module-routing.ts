import { Routes } from '@angular/router';

import {
  clienteGuard,
  fleteroGuard,
  privateGuard,
} from '../../shared/guards/auth.guard';

export default [
  {
    path: 'fletero',
    canActivate: [privateGuard, fleteroGuard],
    loadComponent: () =>
      import('../fletero/fletero-component/fletero-component').then(
        (m) => m.FleteroComponent,
      ),
  },
  {
    path: 'fletero/detalle/:id',
    canActivate: [privateGuard, fleteroGuard],
    loadComponent: () =>
      import(
        '../fletero/detalles-solicitud-fletero/detalles-solicitud-fletero'
      ).then((m) => m.DetallesSolicitudFleteroComponent),
  },
  {
    path: 'fletero/historial',
    canActivate: [privateGuard, fleteroGuard],
    loadComponent: () =>
      import('../fletero/historial-fletero/historial-fletero').then(
        (m) => m.HistorialFleteroComponent,
      ),
  },
{
    path: 'fletero/configuracion',
    canActivate: [privateGuard, fleteroGuard],
    loadComponent: () =>
      import('../fletero/config-fletero/config-fletero').then(
        (m) => m.ConfigFleteroComponent, // Asegúrate de que este sea el nombre de la clase en tu .ts
      ),
  },

  {
    path: 'cliente',
    canActivate: [privateGuard, clienteGuard],
    loadComponent: () =>
      import('../cliente/cliente-component/cliente-component').then(
        (m) => m.ClienteComponent,
      ),
  },
  {
    path: 'cliente/nuevaSolicitud',
    canActivate: [privateGuard, clienteGuard],
    loadComponent: () =>
      import('../cliente/detalles-solicitud-cliente/solicitud').then(
        (m) => m.SolicitudFormComponent,
      ),
  },
  {
    path: 'cliente/detallePresupuesto/:id',
    canActivate: [privateGuard, clienteGuard],
    loadComponent: () =>
      import('../cliente/cliente-presupuesto/cliente-presupuesto').then(
        (m) => m.ClientePresupuesto,
      ),
  },
  {
    path: 'cliente/configuracion',
    canActivate: [privateGuard, clienteGuard],
    loadComponent: () =>
      import('../cliente/config-cliente/config-cliente').then(
        (m) => m.ConfigClienteComponent, // Asegúrate de que este sea el nombre de la clase en tu .ts
      ),
  },
  {
    path: 'map',
    canActivate: [privateGuard],
    loadComponent: () =>
      import('../../shared/features/map/map').then((m) => m.MapComponent),
  },
  {
    path: 'reportes',
    canActivate: [privateGuard], // Accesible para todos los logueados
    loadComponent: () =>
      import('../../shared/reporte/reporte-component').then(
        (m) => m.ReporteComponent
      ),
  },
] as Routes;
