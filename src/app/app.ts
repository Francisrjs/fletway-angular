import { Component, OnInit, signal, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { filter } from 'rxjs';

import { NavbarComponent } from './core/navbar/navbar-component/navbar-component';
import { ToastContainer } from './shared/modal/toast/toast-container';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastContainer],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  showNavbar = true;
  private router = inject(Router);

  protected readonly title = signal('Fletway');

  ngOnInit(): void {
    initFlowbite();

    //Evento para detectar navbar
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Rutas donde NO querés mostrar navbar
        const hideNavbarRoutes = ['/auth/login', '/auth/sign', '/auth/sign-up'];
        initFlowbite();
        this.showNavbar = !hideNavbarRoutes.includes(event.urlAfterRedirects);
      });
  }
}
