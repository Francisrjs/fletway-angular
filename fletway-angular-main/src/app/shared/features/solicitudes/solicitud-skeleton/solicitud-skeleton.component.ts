import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-solicitud-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-white rounded-xl border border-gray-200/50 shadow-sm overflow-hidden animate-pulse"
    >
      <div class="p-6 pt-12">
        <!-- Tag skeleton -->
        <div class="absolute top-0 left-0">
          <div class="h-7 w-24 bg-gray-200 rounded-br-xl"></div>
        </div>

        <!-- Encabezado skeleton -->
        <div class="flex items-start gap-4 mb-4">
          <div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
          <div class="flex-1">
            <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>

        <!-- Direcciones skeleton -->
        <div class="space-y-3 mb-4">
          <div class="flex items-start gap-3">
            <div class="w-7 h-7 bg-gray-200 rounded-lg"></div>
            <div class="flex-1">
              <div class="h-3 bg-gray-200 rounded w-16 mb-1"></div>
              <div class="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-7 h-7 bg-gray-200 rounded-lg"></div>
            <div class="flex-1">
              <div class="h-3 bg-gray-200 rounded w-16 mb-1"></div>
              <div class="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>

        <!-- Foto skeleton -->
        <div class="mb-4">
          <div class="h-48 bg-gray-200 rounded-lg"></div>
        </div>

        <!-- Info transportista skeleton -->
        <div class="mb-4 p-4 bg-gray-100 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gray-300 rounded-full"></div>
            <div class="flex-1">
              <div class="h-4 bg-gray-300 rounded w-32 mb-2"></div>
              <div class="h-3 bg-gray-300 rounded w-20"></div>
            </div>
          </div>
        </div>

        <!-- Botones skeleton -->
        <div class="flex flex-col gap-2">
          <div class="h-10 bg-gray-200 rounded-lg"></div>
          <div class="h-10 bg-gray-200 rounded-lg"></div>
          <div class="h-10 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  `,
})
export class SolicitudSkeletonComponent {}
