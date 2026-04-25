import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../complements/navbar/navbar';
import { Footer } from '../complements/footer/footer';
import { AdminService, ExportConfig, HealthStatus } from './admin.service';
import { ExportService } from '../../services/export.service';

interface EntityConfig {
  incluir: boolean;
  label: string;
  icon: string;
  reimportable: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Footer],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit {
  // ── Estado del sistema ─────────────────────────────────────────────────────
  health: HealthStatus | null = null;
  healthLoading = true;

  // ── Configuración de exportación ───────────────────────────────────────────
  pacientes    = { incluir: true,  soloActivos: false };
  movimientos  = { incluir: true,  fechaDesde: '', fechaHasta: '', estado: '' };
  citas        = { incluir: true,  fechaDesde: '', fechaHasta: '', estado: '' };
  tratamientos = { incluir: true,  soloActivos: false };

  readonly ENTITIES: EntityConfig[] = [
    { incluir: true,  label: 'Pacientes',    icon: '👤', reimportable: true  },
    { incluir: true,  label: 'Movimientos',  icon: '💰', reimportable: false },
    { incluir: true,  label: 'Citas',        icon: '📅', reimportable: false },
    { incluir: true,  label: 'Tratamientos', icon: '🦷', reimportable: false },
  ];

  readonly ESTADOS_MOVIMIENTO = ['PENDIENTE', 'PAGADO', 'CANCELADO'];
  readonly ESTADOS_CITA       = ['PROGRAMADA', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA'];

  exportLoading  = false;
  exportError    = '';
  exportSuccess  = '';
  lastExportDate = localStorage.getItem('biodont_last_export') ?? null;

  constructor(
    private adminService: AdminService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.checkHealth();
  }

  // ── Sistema ────────────────────────────────────────────────────────────────

  checkHealth(): void {
    this.healthLoading = true;
    this.adminService.checkHealth().subscribe({
      next: (h) => {
        this.health = h;
        this.healthLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.health = { status: 'error', db: 'disconnected' };
        this.healthLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get healthLabel(): string {
    if (this.healthLoading) return 'Verificando...';
    if (!this.health || this.health.status === 'error') return 'Sin conexión';
    return 'Conectado';
  }

  get healthClass(): string {
    if (this.healthLoading) return 'health--checking';
    if (!this.health || this.health.status === 'error') return 'health--error';
    return 'health--ok';
  }

  // ── Exportación ───────────────────────────────────────────────────────────

  get ningunaSeleccionada(): boolean {
    return !this.pacientes.incluir && !this.movimientos.incluir &&
           !this.citas.incluir    && !this.tratamientos.incluir;
  }

  seleccionarTodo(): void {
    this.pacientes.incluir    = true;
    this.movimientos.incluir  = true;
    this.citas.incluir        = true;
    this.tratamientos.incluir = true;
  }

  exportar(): void {
    if (this.ningunaSeleccionada || this.exportLoading) return;

    this.exportLoading = true;
    this.exportError   = '';
    this.exportSuccess = '';
    this.cdr.detectChanges();

    const config: ExportConfig = {
      pacientes:    this.pacientes.incluir    ? { ...this.pacientes }    : undefined,
      movimientos:  this.movimientos.incluir  ? { ...this.movimientos }  : undefined,
      citas:        this.citas.incluir        ? { ...this.citas }        : undefined,
      tratamientos: this.tratamientos.incluir ? { ...this.tratamientos } : undefined,
    };

    this.adminService.exportar(config).subscribe({
      next: (res) => {
        this.exportService.descargar(res.data);
        const total = res.data.hojas.reduce((s, h) => s + h.total, 0);
        this.exportSuccess = total > 0
          ? `Archivo generado con ${total} registro(s) en ${res.data.hojas.length} hoja(s).`
          : `Archivo generado — ningún registro coincide con los filtros aplicados.`;
        this.lastExportDate = new Date().toLocaleString('es-CO');
        localStorage.setItem('biodont_last_export', this.lastExportDate);
        this.exportLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.exportError   = err?.error?.message ?? 'No se pudo generar el archivo';
        this.exportLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
