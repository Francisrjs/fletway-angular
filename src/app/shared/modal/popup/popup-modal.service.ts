import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PopupModalConfig {
  isVisible: boolean;
  title: string;
  description: string;
  type: 'warning' | 'success' | 'danger';
  acceptText?: string;
  cancelText?: string;
  onAccept?: () => void;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class PopupModalService {
  private modalConfigSubject = new BehaviorSubject<PopupModalConfig>({
    isVisible: false,
    title: '',
    description: '',
    type: 'warning',
  });

  public modalConfig$: Observable<PopupModalConfig> =
    this.modalConfigSubject.asObservable();

  showWarning(
    title: string,
    description: string,
    onAccept?: () => void,
    onCancel?: () => void,
  ) {
    this.show('warning', title, description, onAccept, onCancel);
  }

  showSuccess(
    title: string,
    description: string,
    onAccept?: () => void,
    onCancel?: () => void,
  ) {
    this.show('success', title, description, onAccept, onCancel);
  }

  showDanger(
    title: string,
    description: string,
    onAccept?: () => void,
    onCancel?: () => void,
  ) {
    this.show('danger', title, description, onAccept, onCancel);
  }

  private show(
    type: 'warning' | 'success' | 'danger',
    title: string,
    description: string,
    onAccept?: () => void,
    onCancel?: () => void,
    acceptText?: string,
    cancelText?: string,
  ) {
    this.modalConfigSubject.next({
      isVisible: true,
      title,
      description,
      type,
      acceptText: acceptText || this.getDefaultAcceptText(type),
      cancelText: cancelText || 'Cancelar',
      onAccept,
      onCancel,
    });
  }

  hide() {
    const current = this.modalConfigSubject.value;
    this.modalConfigSubject.next({
      ...current,
      isVisible: false,
    });
  }

  private getDefaultAcceptText(type: 'warning' | 'success' | 'danger'): string {
    switch (type) {
      case 'success':
        return 'Continuar';
      case 'danger':
        return 'Eliminar';
      case 'warning':
      default:
        return 'Sí, continuar';
    }
  }
}
