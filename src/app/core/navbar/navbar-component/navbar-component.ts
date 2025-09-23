import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../auth/data-access/auth-service';

@Component({
  selector: 'app-navbar-component',
  standalone: true,
  imports: [],
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
    console.log('click');
    const state = this.sesion;
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
    while (
      (state.isFletero === null ||
        typeof state.isFletero === 'undefined' ||
        state.isFleteroLoading) &&
      tries < 20
    ) {
      if (
        !state.isFleteroLoading &&
        (state.isFletero === null || typeof state.isFletero === 'undefined')
      ) {
        // Dispara el cálculo si aún no está en curso
        try {
          await this._authService.esFletero(state.userId!);
        } catch (e) {
          console.warn('No se pudo determinar isFletero:', e);
        }
      }
      await new Promise((res) => setTimeout(res, 100));
      tries++;
    }
    const isFletero = this.sesion.isFletero;
    const target = isFletero ? '/fletero' : '/cliente';
    console.log('Ir a inicio según rol (espera):', target);
    await this._router.navigateByUrl(target);
  }
}
