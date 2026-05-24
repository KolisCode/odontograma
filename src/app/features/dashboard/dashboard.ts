import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, NgClass } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Navbar } from '../complements/navbar/navbar';
import { Footer } from '../complements/footer/footer';
import { DashboardService, DashboardStats, AgendaItem } from './service/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, Footer, CurrencyPipe, NgClass],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {
  loading = true;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  stats: DashboardStats = {
    pacientesRegistrados: 0,
    pacientesNuevosMes: 0,
    citasHoy: 0,
    citasPendientesHoy: 0,
    ingresosDia: 0,
    tratamientosActivos: 0
  };

  agendaHoy: AgendaItem[] = [];

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.dashboardService.getSummary().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.stats = response?.data?.stats;
        this.agendaHoy = response?.data?.agendaHoy ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message || 'No se pudo cargar el dashboard';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goToNewPatient(): void {
    this.router.navigate(['/patients']);
  }

  goToAppointments(): void {
    this.router.navigate(['/appointments']);
  }

  goToFinance(): void {
    this.router.navigate(['/finance']);
  }

  goToOdontogram(): void {
    this.router.navigate(['/patients']);
  }

  getStatusClass(estado: string): string {
    const normalized = String(estado || '').toUpperCase();
    if (normalized === 'CONFIRMADA') return 'confirmed';
    if (normalized === 'ATENDIDA')   return 'done';
    if (normalized === 'CANCELADA')  return 'cancelled';
    return 'pending';
  }

  getStatusLabel(estado: string): string {
    const normalized = String(estado || '').toUpperCase();
    if (normalized === 'CONFIRMADA')                       return 'Confirmada';
    if (normalized === 'PENDIENTE' || normalized === 'PROGRAMADA') return 'Programada';
    if (normalized === 'ATENDIDA')                         return 'Atendida';
    if (normalized === 'CANCELADA')                        return 'Cancelada';
    return estado;
  }
}