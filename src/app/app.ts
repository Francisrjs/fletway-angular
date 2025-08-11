import { Component, OnInit, signal } from '@angular/core';
import {
  Router,
  RouterOutlet,
  Event as RouterEvent,
  NavigationEnd,
} from '@angular/router';
import { initFlowbite } from 'flowbite';
import { NavbarComponent } from './core/navbar/navbar-component/navbar-component';
import { filter } from 'rxjs';
import { ClienteComponent } from './modules/cliente/cliente-component/cliente-component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ClienteComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  showNavbar = true;
  constructor(private router: Router) {
    // Escuchar eventos del router
  }

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
