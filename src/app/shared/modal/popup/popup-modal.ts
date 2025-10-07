import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-popup-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './popup-modal.html',
  styleUrl: './popup-modal.scss',
})
export class PopupModal {
  @Input() isVisible = false;
  @Input() title = '¿Estás seguro?';
  @Input() description = 'Esta acción no se puede deshacer';
  @Input() type: 'warning' | 'success' | 'danger' = 'warning';
  @Input() acceptText = 'Sí, continuar';
  @Input() cancelText = 'No, cancelar';
  @Input() acceptButtonClass = '';
  @Input() cancelButtonClass = '';

  @Output() accept = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  handleAccept() {
    this.accept.emit();
    this.closeModal();
  }

  handleCancel() {
    this.cancelled.emit();
    this.closeModal();
  }

  closeModal() {
    this.isVisible = false;
    this.closed.emit();
  }

  // Método para cerrar con ESC
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  // Prevenir cierre al hacer click en el contenido del modal
  onModalContentClick(event: Event) {
    event.stopPropagation();
  }

  // Manejar eventos de teclado en el contenido del modal
  onModalContentKeydown() {
    // No hacer nada, solo para accesibilidad
  }

  // Cerrar al hacer click en el overlay
  onOverlayClick() {
    this.closeModal();
  }

  // Obtener clases por defecto para el botón de aceptar
  getDefaultAcceptButtonClass(): string {
    switch (this.type) {
      case 'success':
        return 'text-white bg-green-600 hover:bg-green-800 focus:ring-green-300';
      case 'danger':
        return 'text-white bg-red-600 hover:bg-red-800 focus:ring-red-300';
      case 'warning':
      default:
        return 'text-white bg-yellow-600 hover:bg-yellow-800 focus:ring-yellow-300';
    }
  }

  // Obtener clases por defecto para el botón de cancelar
  getDefaultCancelButtonClass(): string {
    return 'text-gray-900 bg-white border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:ring-gray-100';
  }
}
