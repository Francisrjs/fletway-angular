import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AthShell } from './ath-shell';

describe('AthShell', () => {
  let component: AthShell;
  let fixture: ComponentFixture<AthShell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AthShell]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AthShell);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
