import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginIn } from './login-in';

describe('LoginIn', () => {
  let component: LoginIn;
  let fixture: ComponentFixture<LoginIn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginIn]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginIn);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
