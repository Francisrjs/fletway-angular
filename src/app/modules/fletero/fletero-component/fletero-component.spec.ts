import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FleteroComponent } from './fletero-component';

describe('FleteroComponent', () => {
  let component: FleteroComponent;
  let fixture: ComponentFixture<FleteroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleteroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FleteroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
