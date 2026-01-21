import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  Type,
  ViewChild,
  ViewContainerRef,
  ComponentRef,
  OnDestroy,
  OnChanges,
  AfterViewInit,
  SimpleChanges,
} from '@angular/core';
import { SkeletonLoaderComponent } from '../../ui/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnDestroy, OnChanges, AfterViewInit {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() position: 'left' | 'right' = 'right';
  @Input() width: 'sm' | 'md' | 'lg' | 'xl' = 'lg';
  @Input() showCloseButton: boolean = true;
  @Input() closeOnBackdrop: boolean = true;
  @Input() loading: boolean = false; // Nuevo: muestra skeleton mientras carga
  @Input() customComponent?: Type<any>;
  @Input() componentInputs?: { [key: string]: any };

  @Output() close = new EventEmitter<void>();
  @Output() isOpenChange = new EventEmitter<boolean>(); // Para two-way binding
  @Output() componentOutputs = new EventEmitter<{ event: string; data: any }>();

  @ViewChild('dynamicComponentContainer', { read: ViewContainerRef })
  dynamicComponentContainer!: ViewContainerRef;

  private componentRef?: ComponentRef<any>;
  private viewInitialized = false;

  get widthClasses(): string {
    const widths = {
      sm: 'w-80',
      md: 'w-96',
      lg: 'w-[32rem]',
      xl: 'w-[40rem]',
    };
    return widths[this.width];
  }

  get positionClasses(): string {
    return this.position === 'left' ? 'left-0' : 'right-0';
  }

  get slideAnimation(): string {
    return this.position === 'left'
      ? 'animate-slideInLeft'
      : 'animate-slideInRight';
  }

  ngAfterViewInit(): void {
    console.log(
      '🔧 Sidebar AfterViewInit - ViewContainerRef disponible:',
      !!this.dynamicComponentContainer,
    );
    this.viewInitialized = true;
    // Intentar cargar si ya hay un componente pendiente
    if (this.isOpen && this.customComponent) {
      this.loadComponent();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 Sidebar ngOnChanges:', {
      isOpen: this.isOpen,
      hasComponent: !!this.customComponent,
      hasContainer: !!this.dynamicComponentContainer,
      viewInitialized: this.viewInitialized,
      inputs: this.componentInputs,
    });

    // Si se abre el sidebar, esperar a que el DOM se renderice
    if (this.isOpen && this.customComponent) {
      setTimeout(() => {
        console.log(
          '⏱️ Timeout ejecutado - hasContainer:',
          !!this.dynamicComponentContainer,
        );
        if (this.dynamicComponentContainer) {
          this.loadComponent();
        } else {
          console.error(
            '❌ ViewContainerRef todavía no disponible después del timeout',
          );
        }
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyComponent();
  }

  private loadComponent(): void {
    console.log('🚀 Sidebar loadComponent llamado');

    if (!this.dynamicComponentContainer) {
      console.error('❌ No hay ViewContainerRef disponible');
      return;
    }

    if (!this.customComponent) {
      console.error('❌ No hay customComponent definido');
      return;
    }

    console.log('✅ Creando componente:', this.customComponent.name);
    this.destroyComponent();

    this.componentRef = this.dynamicComponentContainer.createComponent(
      this.customComponent,
    );

    console.log(
      '✅ Componente creado, aplicando inputs:',
      this.componentInputs,
    );

    if (this.componentInputs) {
      Object.keys(this.componentInputs).forEach((key) => {
        if (this.componentRef?.instance) {
          console.log(`  📥 Input [${key}]:`, this.componentInputs![key]);
          this.componentRef.instance[key] = this.componentInputs![key];
        }
      });
    }

    // Detectar cambios manualmente
    this.componentRef.changeDetectorRef.detectChanges();
    console.log('✅ ChangeDetection ejecutado');

    const instance = this.componentRef.instance;
    if (instance) {
      Object.keys(instance).forEach((key) => {
        const value = instance[key];
        if (value instanceof EventEmitter) {
          console.log(`  📤 Output detectado: ${key}`);
          value.subscribe((data: any) => {
            this.componentOutputs.emit({ event: key, data });
          });
        }
      });
    }

    console.log('🎉 Componente cargado completamente');
  }

  private destroyComponent(): void {
    if (this.componentRef) {
      this.componentRef.destroy();
      this.componentRef = undefined;
    }
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.onClose();
    }
  }

  onClose(): void {
    this.destroyComponent();
    this.isOpenChange.emit(false); // Emite para two-way binding
    this.close.emit();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
