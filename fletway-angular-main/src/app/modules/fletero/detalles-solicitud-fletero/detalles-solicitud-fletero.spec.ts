import { ComponentFixture, TestBed } from '@angular/core/testing';
import {FormsModule} from '@angular/forms';

import { DetallesSolicitudFleteroComponent } from './detalles-solicitud-fletero';
describe('DetallesSolicitudFleteroComponent', () => {
  let component: DetallesSolicitudFleteroComponent;
  let fixture: ComponentFixture<DetallesSolicitudFleteroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DetallesSolicitudFleteroComponent ],
      imports: [ FormsModule ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DetallesSolicitudFleteroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have empty quote on init', () => {
    expect(component.quote.price).toBeNull();
    expect(component.quote.notes).toBe('');
  });

  it('should not submit quote if price is null', () => {
    spyOn(console, 'log');
    component.submitQuote();
    expect(console.log).toHaveBeenCalledWith('Por favor, ingresa un precio para la cotización.');
  });

  it('should submit quote if price is set', () => {
    spyOn(console, 'log');
    component.quote.price = 5000;
    component.quote.notes = 'Prueba';
    component.submitQuote();
    expect(console.log).toHaveBeenCalledWith('Cotización enviada:');
  });
});
