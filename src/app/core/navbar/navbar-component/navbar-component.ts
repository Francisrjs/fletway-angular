import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/data-access/auth-service';

@Component({
  selector: 'app-navbar-component',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar-component.html',
  styleUrl: './navbar-component.scss',
})
export class NavbarComponent {
  private _authService = inject(AuthService);
  // Leer el signal bajo demanda para evitar snapshots obsoletos
  get sesion() {
    return this._authService.userState();
  }

  private _router = inject(Router);

  async logOut() {
    console.log('click 1- Desconectase ');
    // Disparar logout sin bloquear la UI
    void this._authService.signOut();
    await this._router.navigateByUrl('/auth/login');
    console.log('estado actual:', this.sesion);
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
}
