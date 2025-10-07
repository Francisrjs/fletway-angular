import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PopupModal } from './popup-modal';
import { PopupModalConfig, PopupModalService } from './popup-modal.service';

@Component({
  selector: 'app-popup-modal-container',
  standalone: true,
  imports: [CommonModule, PopupModal],
  template: `
    <app-popup-modal
      *ngIf="modalConfig$ | async as config"
      [isVisible]="config.isVisible"
      [title]="config.title"
      [description]="config.description"
      [type]="config.type"
      [acceptText]="config.acceptText || 'Aceptar'"
      [cancelText]="config.cancelText || 'Cancelar'"
      (accept)="handleAccept()"
      (cancelled)="handleCancel()"
      (closed)="handleClose()"
    />
  `,
  styles: [],
})
export class PopupModalContainer {
  private popupModalService = inject(PopupModalService);

  modalConfig$: Observable<PopupModalConfig> =
    this.popupModalService.modalConfig$;
  private currentConfig: PopupModalConfig | null = null;

  constructor() {
    this.modalConfig$.subscribe((config) => {
      this.currentConfig = config;
    });
  }

  handleAccept() {
    if (this.currentConfig?.onAccept) {
      this.currentConfig.onAccept();
    }
    this.popupModalService.hide();
  }

  handleCancel() {
    if (this.currentConfig?.onCancel) {
      this.currentConfig.onCancel();
    }
    this.popupModalService.hide();
  }

  handleClose() {
    this.popupModalService.hide();
  }
}
