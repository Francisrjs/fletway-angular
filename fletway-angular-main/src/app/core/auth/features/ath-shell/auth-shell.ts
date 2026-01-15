import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-ath-shell',
  imports: [RouterOutlet],
  template: `
    <h1>Hola</h1>
    <p>
      <router-outlet></router-outlet>
    </p>
  `
})
export default class AthShell {

}
