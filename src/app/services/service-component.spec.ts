import { TestBed } from '@angular/core/testing';

import { ServiceComponent } from './service-component';

describe('ServiceComponent', () => {
  let service: ServiceComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceComponent);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
