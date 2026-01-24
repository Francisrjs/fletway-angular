import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chat',
  imports: [],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class ChatComponent {
  @Input() solicitudId!: number;
  @Input() fleteroId!: number;
  @Input() clienteId!: number;
  @Input() isFletero!: boolean;
}
