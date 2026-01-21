import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="animate-pulse space-y-4"
      [attr.aria-busy]="true"
      aria-label="Cargando contenido"
    >
      <!-- Header skeleton -->
      <div *ngIf="showHeader" class="space-y-3">
        <div class="h-8 bg-gray-200 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>

      <!-- Content skeletons -->
      <div class="space-y-3" *ngFor="let item of skeletonArray">
        <div class="border border-gray-200 rounded-lg p-4 space-y-3">
          <div class="flex items-center space-x-3">
            <div
              *ngIf="showAvatar"
              class="rounded-full bg-gray-200 h-12 w-12"
            ></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-3/4"></div>
              <div class="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div class="h-3 bg-gray-200 rounded"></div>
          <div class="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>

      <!-- Footer skeleton -->
      <div *ngIf="showFooter" class="flex gap-2 pt-4">
        <div class="h-10 bg-gray-200 rounded flex-1"></div>
        <div class="h-10 bg-gray-200 rounded flex-1"></div>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    `,
  ],
})
export class SkeletonLoaderComponent {
  @Input() count: number = 3;
  @Input() showHeader: boolean = true;
  @Input() showFooter: boolean = false;
  @Input() showAvatar: boolean = true;

  get skeletonArray(): number[] {
    return Array(this.count).fill(0);
  }
}
