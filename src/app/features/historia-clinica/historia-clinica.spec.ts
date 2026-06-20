import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HistoriaClinica } from './historia-clinica';

describe('HistoriaClinica', () => {
  let component: HistoriaClinica;
  let fixture: ComponentFixture<HistoriaClinica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriaClinica],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoriaClinica);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
