import { TestBed } from '@angular/core/testing';

import { Odontogram } from './odontogram';

describe('Odontogram', () => {
  let service: Odontogram;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Odontogram);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
