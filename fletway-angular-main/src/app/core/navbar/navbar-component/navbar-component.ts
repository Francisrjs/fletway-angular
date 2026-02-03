import {
  Component,
  inject,
  ElementRef,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/data-access/auth-service';

@Component({
  selector: 'app-navbar-component',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar-component.html',
  styleUrl: './navbar-component.scss',
})
export class NavbarComponent implements OnDestroy {
  @ViewChild('sidebar') sidebar!: ElementRef<HTMLElement>;

  private _authService = inject(AuthService);
  private _router = inject(Router);

  private sidebarTimeout?: number;

  // Leer el signal bajo demanda para evitar snapshots obsoletos
  get sesion() {
    return this._authService.userState();
  }

  // Getter para verificar si el usuario es fletero
  get esFletero(): boolean {
    return this.sesion?.isFletero === true;
  }

  // Getter para verificar si el usuario es cliente
  get esCliente(): boolean {
    return this.sesion?.isFletero === false;
  }

  async logOut() {
    console.log('click 1- Desconectase ');
    // Disparar logout sin bloquear la UI
    void this._authService.signOut();
    await this._router.navigateByUrl('/auth/login');
    console.log('estado actual:', this.sesion);
  }

  /**
   * Navega a la vista principal del fletero (solicitudes disponibles)
   */
  async irPrincipalFletero(): Promise<void> {
    console.log('🏠 Ir a vista principal de fletero');
    await this._router.navigateByUrl('/fletero');
  }

  /**
   * Navega al historial de viajes del fletero
   */
  async irHistorialFletero(): Promise<void> {
    console.log('📋 Ir a historial de viajes del fletero');
    await this._router.navigateByUrl('/fletero/historial');
  }
  async irInicio() {
    let state = this.sesion; // Cambiar const por let
    console.log('click', state);

    if (!state.session) {
      await this._router.navigateByUrl('/auth/login');
      return;
    }

    // Si ya tenemos el valor, navega directo
    if (state.isFletero !== null && typeof state.isFletero !== 'undefined') {
      const target = state.isFletero ? '/fletero' : '/cliente';
      console.log('Ir a inicio según rol (directo):', target);
      await this._router.navigateByUrl(target);
      return;
    }

    // Si está cargando, espera a que se resuelva
    let tries = 0;
    while (tries < 20) {
      state = this.sesion; // 🔥 LEER EL ESTADO ACTUALIZADO EN CADA ITERACIÓN

      // Si ya tenemos el valor, salir del bucle
      if (
        state.isFletero !== null &&
        typeof state.isFletero !== 'undefined' &&
        !state.isFleteroLoading
      ) {
        break;
      }

      if (
        !state.isFleteroLoading &&
        (state.isFletero === null || typeof state.isFletero === 'undefined')
      ) {
        // Dispara el cálculo si aún no está en curso
        try {
          await this._authService.esFletero(state.userId!);
        } catch (e) {
          console.warn('No se pudo determinar isFletero:', e);
          break;
        }
      }

      await new Promise((res) => setTimeout(res, 100));
      tries++;
    }

    const finalState = this.sesion; // Leer estado final
    const target = finalState.isFletero ? '/fletero' : '/cliente';

    console.log('Ir a inicio según rol (espera):', target, finalState);
    await this._router.navigateByUrl(target);
  }

  /**
   * Muestra el sidebar cuando el mouse entra en el área de activación
   */
  mostrarSidebar(): void {
    if (this.sidebarTimeout) {
      clearTimeout(this.sidebarTimeout);
      this.sidebarTimeout = undefined;
    }

    if (this.sidebar?.nativeElement) {
      this.sidebar.nativeElement.classList.remove('-translate-x-full');
      this.sidebar.nativeElement.classList.add('translate-x-0');
    }
  }

  /**
   * Mantiene el sidebar visible cuando el mouse está sobre él
   */
  mantenerSidebar(): void {
    if (this.sidebarTimeout) {
      clearTimeout(this.sidebarTimeout);
      this.sidebarTimeout = undefined;
    }
  }

  /**
   * Oculta el sidebar cuando el mouse sale del área
   */
  ocultarSidebar(): void {
    // Agregar un pequeño delay para evitar parpadeos
    this.sidebarTimeout = window.setTimeout(() => {
      if (this.sidebar?.nativeElement) {
        this.sidebar.nativeElement.classList.remove('translate-x-0');
        this.sidebar.nativeElement.classList.add('-translate-x-full');
      }
    }, 300);
  }

  /**
   * Limpia los timeouts al destruir el componente
   */
  ngOnDestroy(): void {
    if (this.sidebarTimeout) {
      clearTimeout(this.sidebarTimeout);
    }
  }

  async irConfiguracion(): Promise<void> {
    console.log('⚙️ Ir a configuración de perfil');

    // Si es fletero va a una ruta, si es cliente a otra
    // Asumiremos las rutas '/fletero/perfil' y '/cliente/perfil' por ahora
    const ruta = this.esFletero
      ? '/fletero/configuracion'
      : '/cliente/configuracion';

    await this._router.navigateByUrl(ruta);
  }

  async irReportes(): Promise<void> {
    console.log('⚠ Ir a reportes');
    await this._router.navigateByUrl('/reportes');
  }

}


