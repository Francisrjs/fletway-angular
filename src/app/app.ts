import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, Event as RouterEvent } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { NavbarComponent } from './core/navbar/navbar-component/navbar-component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  constructor(private router: Router) {
    // Imprime la config de rutas para verificar que exista auth/sign-up
    console.log('Router config:', this.router.config);

    // Escuchar eventos del router
    this.router.events.subscribe((e: RouterEvent) => {
      console.log('Router event:', e);
    });
  }

  protected readonly title = signal('Fletway');

  ngOnInit(): void {
    initFlowbite();
  }
}
