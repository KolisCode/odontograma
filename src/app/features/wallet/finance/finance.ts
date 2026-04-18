import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Footer } from '../../complements/footer/footer';
import { Navbar } from '../../complements/navbar/navbar';
import { FinanzasService, MovimientoRow, MovimientoFilters } from './service/finanzas.service';
import { PatientsService, PatientRow } from '../../user/service/pacientes.service';

@Component({
  selector: 'app-finance',
  imports: [Footer, Navbar, CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './finance.html',
  styleUrl: './finance.css',
})
export class Finance implements OnInit {
  movimientos: MovimientoRow[] = [];
  formVisible = false;
  asideVisible = false;
  editingId: number | null = null;
  confirmDeleteId: number | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';

  // ── Contexto de paciente ──────────────────────────────────────────────────
  patients: PatientRow[] = [];
  selectedPatient: PatientRow | null = null;
  soloSinPaciente = false;

  // ── Filtros ────────────────────────────────────────────────────────────────
  filtrosVisible = false;
  filtroTipo = '';
  filtroEstado = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  get filtrosActivos(): number {
    return [this.filtroTipo, this.filtroEstado, this.filtroFechaDesde, this.filtroFechaHasta]
      .filter(v => !!v).length;
  }

  form: FormGroup;

  ingresosMes = 0;
  egresosMes = 0;

  get balance(): number {
    return this.ingresosMes - this.egresosMes;
  }

  get recentMovimientos(): MovimientoRow[] {
    return this.movimientos.slice(0, 3);
  }

  get mayorIngreso(): MovimientoRow | null {
    const ingresos = this.movimientos.filter((m) => m.tipo === 'INGRESO');
    return ingresos.length ? ingresos.reduce((a, b) => (a.monto >= b.monto ? a : b)) : null;
  }

  get mayorEgreso(): MovimientoRow | null {
    const egresos = this.movimientos.filter((m) => m.tipo === 'EGRESO');
    return egresos.length ? egresos.reduce((a, b) => (a.monto >= b.monto ? a : b)) : null;
  }

  constructor(
    private fb: FormBuilder,
    private finanzasService: FinanzasService,
    private patientsService: PatientsService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      tipo: ['INGRESO', Validators.required],
      monto: [null, [Validators.required, Validators.min(0)]],
      concepto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      fecha: ['', Validators.required],
      metodoPago: ['Efectivo'],
      estado: ['PENDIENTE'],
      pacienteId: [null],
    });
  }

  ngOnInit(): void {
    this.loadPatients();
    this.route.queryParamMap.subscribe((params) => {
      const id = params.get('pacienteId');
      if (id && !isNaN(Number(id))) {
        const numId = Number(id);
        // Lista ya cargada: resolución síncrona
        if (this.patients.length) {
          this.selectedPatient = this.patients.find((p) => p.id === numId) ?? null;
          this.loadMovimientos();
        } else {
          // Lista aún vacía: cargar el paciente puntualmente y luego los movimientos
          this.movimientos = [];
          this.patientsService.getPatientById(numId).subscribe({
            next: (res) => {
              this.selectedPatient = {
                id: res.data.id,
                nombreCompleto: `${res.data.nombre} ${res.data.apellido}`.trim(),
                documento: res.data.documento,
                telefono: res.data.telefono,
                eps: res.data.eps,
                activo: res.data.activo,
                fechaNacimiento: res.data.fechaNacimiento ?? null,
                ultimaCita: '',
              };
              this.cdr.detectChanges();
              this.loadMovimientos();
            },
            error: () => {
              this.selectedPatient = null;
              this.loadMovimientos();
            },
          });
        }
      } else {
        this.selectedPatient = null;
        this.loadMovimientos();
      }
    });
  }

  loadPatients(): void {
    this.patientsService.getPatients().subscribe({
      next: (res) => {
        this.patients = res.data;
        this.cdr.detectChanges();
      },
    });
  }

  selectPatient(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    if (!id) {
      this.router.navigate([], { queryParams: {} });
    } else {
      this.router.navigate([], { queryParams: { pacienteId: id } });
    }
  }

  clearPatient(): void {
    this.soloSinPaciente = false;
    this.router.navigate([], { queryParams: {} });
  }

  filtrarSinPaciente(): void {
    this.soloSinPaciente = true;
    this.loadMovimientos();
  }

  limpiarFiltroSinPaciente(): void {
    this.soloSinPaciente = false;
    this.loadMovimientos();
  }

  limpiarFiltros(): void {
    this.filtroTipo = '';
    this.filtroEstado = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.loadMovimientos();
  }

  loadMovimientos(): void {
    this.loading = true;
    const filters: MovimientoFilters = this.selectedPatient
      ? { pacienteId: this.selectedPatient.id }
      : this.soloSinPaciente
        ? { sinPaciente: true }
        : {};

    if (this.filtroTipo) filters.tipo = this.filtroTipo;
    if (this.filtroEstado) filters.estado = this.filtroEstado;
    if (this.filtroFechaDesde) filters.fechaDesde = this.filtroFechaDesde;
    if (this.filtroFechaHasta) filters.fechaHasta = this.filtroFechaHasta;
    this.finanzasService.getAll(filters).subscribe({
      next: (res) => {
        this.movimientos = res.data;
        this.calcularStats();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los movimientos';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private calcularStats(): void {
    const now = new Date();
    const mes = now.getMonth();
    const anio = now.getFullYear();

    const delMes = this.movimientos.filter((m) => {
      const d = new Date(m.fecha);
      return d.getMonth() === mes && d.getFullYear() === anio;
    });

    this.ingresosMes = delMes
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((acc, m) => acc + m.monto, 0);

    this.egresosMes = delMes
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((acc, m) => acc + m.monto, 0);
  }

  editarMovimiento(m: MovimientoRow): void {
    this.editingId = m.id;
    this.formVisible = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.form.patchValue({
      tipo: m.tipo,
      monto: m.monto,
      concepto: m.concepto,
      fecha: new Date(m.fecha).toISOString().substring(0, 10),
      metodoPago: m.metodoPago ?? 'Efectivo',
      estado: m.estado,
      pacienteId: m.paciente?.id ?? null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const resolvedPacienteId: number | null =
      this.selectedPatient?.id ??
      (raw.pacienteId ? Number(raw.pacienteId) : null);

    const payload = {
      tipo: raw.tipo,
      monto: Number(raw.monto),
      concepto: raw.concepto.trim(),
      fecha: raw.fecha,
      metodoPago: raw.metodoPago || null,
      estado: raw.estado,
      pacienteId: resolvedPacienteId,
    };

    if (this.editingId !== null) {
      this.finanzasService.update(this.editingId, payload).subscribe({
        next: () => {
          this.successMessage = 'Movimiento actualizado correctamente';
          this.errorMessage = '';
          this.formVisible = false;
          this.editingId = null;
          this.form.reset({ tipo: 'INGRESO', metodoPago: 'Efectivo', estado: 'PENDIENTE', pacienteId: null });
          this.cdr.detectChanges();
          this.loadMovimientos();
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.message || 'No se pudo actualizar el movimiento';
          this.cdr.detectChanges();
        },
      });
      return;
    }

    this.finanzasService.create(payload).subscribe({
      next: () => {
        this.successMessage = 'Movimiento registrado correctamente';
        this.errorMessage = '';
        this.formVisible = false;
        this.form.reset({ tipo: 'INGRESO', metodoPago: 'Efectivo', estado: 'PENDIENTE', pacienteId: null });
        this.cdr.detectChanges();
        this.loadMovimientos();
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'No se pudo registrar el movimiento';
        this.cdr.detectChanges();
      },
    });
  }

  limpiar(): void {
    this.formVisible = false;
    this.editingId = null;
    this.form.reset({ tipo: 'INGRESO', metodoPago: 'Efectivo', estado: 'PENDIENTE', pacienteId: null });
    this.errorMessage = '';
    this.successMessage = '';
  }

  eliminar(id: number): void {
    this.confirmDeleteId = id;
  }

  confirmarEliminar(): void {
    if (this.confirmDeleteId === null) return;
    const id = this.confirmDeleteId;
    this.confirmDeleteId = null;

    this.finanzasService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Movimiento eliminado';
        this.loadMovimientos();
      },
      error: () => {
        this.errorMessage = 'No se pudo eliminar el movimiento';
        this.cdr.detectChanges();
      },
    });
  }

  cancelarEliminar(): void {
    this.confirmDeleteId = null;
  }

  getTipoClass(tipo: string): string {
    return tipo === 'INGRESO' ? 'status-badge--active' : 'status-badge--danger';
  }

  getTipoLabel(tipo: string): string {
    return tipo === 'INGRESO' ? 'Ingreso' : 'Egreso';
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      PAGADO: 'status-badge--active',
      CANCELADO: 'status-badge--danger',
      PENDIENTE: 'status-badge--pending',
    };
    return map[estado] ?? '';
  }

  formatFecha(fecha: string): string {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  hasError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }
}
