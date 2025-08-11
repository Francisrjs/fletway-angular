import { Component, inject } from '@angular/core';
import authRouting from '../../auth/features/ath-shell/auth-routing';
import { AuthService } from '../../auth/data-access/auth-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar-component',
  imports: [],
  templateUrl: './navbar-component.html',
  styleUrl: './navbar-component.scss',
})
export class NavbarComponent {
  private _authService = inject(AuthService);

  private _router = inject(Router);
  async logOut() {
    await this._authService.signOut();
    this._router.navigateByUrl('/auth/login');
  }
  async irInicio() {
    await this._authService.esFletero();
  }
}
