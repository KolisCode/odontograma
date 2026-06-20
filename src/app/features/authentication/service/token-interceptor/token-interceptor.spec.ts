import { TestBed } from '@angular/core/testing';

import { tokenInterceptor } from './token-interceptor';

describe('tokenInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be defined', () => {
    expect(tokenInterceptor).toBeTruthy();
  });
});
