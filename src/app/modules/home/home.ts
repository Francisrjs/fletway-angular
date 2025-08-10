import { Component } from '@angular/core';
import { NavbarComponent } from '../../core/navbar/navbar-component/navbar-component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterOutlet],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
