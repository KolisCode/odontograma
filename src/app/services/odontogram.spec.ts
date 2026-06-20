import { TestBed } from '@angular/core/testing';

import { OdontogramService } from './odontogram';

describe('OdontogramService', () => {
  let service: OdontogramService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OdontogramService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
