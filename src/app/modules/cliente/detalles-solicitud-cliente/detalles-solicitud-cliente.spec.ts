import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SolicitarFleteComponent } from './detalles-solicitud-cliente';

describe('DetallesSolicitudClienteComponent', () => {
  let component: SolicitarFleteComponent;
  let fixture: ComponentFixture<SolicitarFleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SolicitarFleteComponent ],
      imports: [ FormsModule ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SolicitarFleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the detalles-solicitud-cliente component', () => {
    expect(component).toBeTruthy();
  });

  // Podés agregar más tests acá para métodos, formularios, etc.
});
