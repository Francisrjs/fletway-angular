import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientePresupuesto } from './cliente-presupuesto';

describe('ClientePresupuesto', () => {
  let component: ClientePresupuesto;
  let fixture: ComponentFixture<ClientePresupuesto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientePresupuesto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientePresupuesto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
