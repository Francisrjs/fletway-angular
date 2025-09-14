import { Component, inject } from '@angular/core';
import { AuthService } from '../../auth/data-access/auth-service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar-component',
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
    console.log('click');
    const state = this.sesion;
    console.log(this.sesion);
    if (!state.session) {
      await this._router.navigateByUrl('/auth/login');
      return;
    }
    // Si isFletero es null o está cargando, espera a que se resuelva
    let tries = 0;
    while ((state.isFletero === null || typeof state.isFletero === 'undefined' || state.isFleteroLoading) && tries < 20) {
      if (!state.isFleteroLoading && (state.isFletero === null || typeof state.isFletero === 'undefined')) {
        // Dispara el cálculo si aún no está en curso
        try {
          await this._authService.esFletero(state.userId!);
        } catch (e) {
          console.warn('No se pudo determinar isFletero:', e);
        }
      }
      await new Promise(res => setTimeout(res, 100));
      tries++;
    }
    const isFletero = this.sesion.isFletero;
    const target = isFletero ? '/fletero' : '/cliente';
    console.log('Ir a inicio según rol:', target);
    await this._router.navigateByUrl(target);
  }
}
