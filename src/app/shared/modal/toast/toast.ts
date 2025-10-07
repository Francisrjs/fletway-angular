import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class Toast {
  @Input() titleMessage = 'Notificación';
  @Input() typeMessage: 'success' | 'warning' | 'danger' = 'success';
  @Input() message = '';
  @Input() isVisible = true;

  @Output() closeToast = new EventEmitter<void>();

  onCloseToast() {
    this.isVisible = false;
    this.closeToast.emit();
  }
}
