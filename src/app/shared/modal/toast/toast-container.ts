import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Toast } from './toast';
import { ToastMessage, ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, Toast],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-4">
      <app-toast
        *ngFor="let toast of toasts$ | async"
        [titleMessage]="toast.title"
        [typeMessage]="toast.type"
        [message]="toast.message || ''"
        [isVisible]="true"
        (closeToast)="removeToast(toast.id)"
      />
    </div>
  `,
  styles: [],
})
export class ToastContainer {
  private toastService = inject(ToastService);

  toasts$: Observable<ToastMessage[]> = this.toastService.toasts$;

  removeToast(id: string) {
    this.toastService.removeToast(id);
  }
}
