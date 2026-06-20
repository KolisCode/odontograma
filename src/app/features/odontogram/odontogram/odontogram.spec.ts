import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { OdontogramComponent } from './odontogram';

// jsdom no implementa ResizeObserver, que el odontograma usa al renderizar.
/* eslint-disable @typescript-eslint/no-empty-function */
(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
/* eslint-enable @typescript-eslint/no-empty-function */

describe('OdontogramComponent', () => {
  let component: OdontogramComponent;
  let fixture: ComponentFixture<OdontogramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OdontogramComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OdontogramComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
