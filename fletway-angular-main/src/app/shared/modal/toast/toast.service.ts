import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'danger';
  title: string;
  message?: string;
  duration?: number; // en milisegundos, 0 = no auto-close
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  showSuccess(title: string, message?: string, duration = 5000) {
    this.addToast('success', title, message, duration);
  }

  showWarning(title: string, message?: string, duration = 5000) {
    this.addToast('warning', title, message, duration);
  }

  showDanger(title: string, message?: string, duration = 5000) {
    this.addToast('danger', title, message, duration);
  }

  private addToast(
    type: 'success' | 'warning' | 'danger',
    title: string,
    message?: string,
    duration = 5000,
  ) {
    const id = this.generateId();
    const toast: ToastMessage = { id, type, title, message, duration };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, duration);
    }
  }

  removeToast(id: string) {
    const currentToasts = this.toastsSubject.value;
    const updatedToasts = currentToasts.filter((toast) => toast.id !== id);
    this.toastsSubject.next(updatedToasts);
  }

  clearAll() {
    this.toastsSubject.next([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
