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
} from '@angular/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() position: 'left' | 'right' = 'right';
  @Input() width: 'sm' | 'md' | 'lg' | 'xl' = 'lg';
  @Input() showCloseButton: boolean = true;
  @Input() closeOnBackdrop: boolean = true;
  @Input() customComponent?: Type<any>;
  @Input() componentInputs?: { [key: string]: any };

  @Output() close = new EventEmitter<void>();
  @Output() componentOutputs = new EventEmitter<{ event: string; data: any }>();

  @ViewChild('dynamicComponentContainer', { read: ViewContainerRef })
  dynamicComponentContainer!: ViewContainerRef;

  private componentRef?: ComponentRef<any>;

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

  ngOnChanges(): void {
    if (this.isOpen && this.customComponent && this.dynamicComponentContainer) {
      this.loadComponent();
    }
  }

  ngOnDestroy(): void {
    this.destroyComponent();
  }

  private loadComponent(): void {
    if (!this.dynamicComponentContainer || !this.customComponent) {
      return;
    }

    this.destroyComponent();

    this.componentRef = this.dynamicComponentContainer.createComponent(
      this.customComponent,
    );

    if (this.componentInputs) {
      Object.keys(this.componentInputs).forEach((key) => {
        if (this.componentRef?.instance) {
          this.componentRef.instance[key] = this.componentInputs![key];
        }
      });
    }

    const instance = this.componentRef.instance;
    if (instance) {
      Object.keys(instance).forEach((key) => {
        const value = instance[key];
        if (value instanceof EventEmitter) {
          value.subscribe((data: any) => {
            this.componentOutputs.emit({ event: key, data });
          });
        }
      });
    }
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
    this.close.emit();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
