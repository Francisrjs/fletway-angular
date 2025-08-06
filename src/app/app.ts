import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { initFlowbite } from 'flowbite';
@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App  implements OnInit{
  protected readonly title = signal('Fletway');

    ngOnInit(): void {
    initFlowbite();
  }
}
