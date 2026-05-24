import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';

import { Footer } from '../../complements/footer/footer';
import { Navbar } from '../../complements/navbar/navbar';
import { FinanzasService, MovimientoRow, MovimientoFilters, PagoMovimiento, PaginaMeta } from './service/finanzas.service';
import { PatientsService, PatientRow } from '../../user/service/pacientes.service';
import { formatDateForInput } from '../../../utils/date.utils';

@Component({
  selector: 'app-finance',
  imports: [Footer, Navbar, CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './finance.html',
  styleUrl: './finance.css',
})
export class Finance implements OnInit, OnDestroy {
  movimientos: MovimientoRow[] = [];
  formVisible = false;
  asideVisible = false;
  editingId: number | null = null;
  confirmDeleteId: number | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';
  warnMessage = '';

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
  fechaRangoError = '';
  paginaMeta: PaginaMeta | null = null;
  currentPage = 1;
  readonly PAGE_SIZE = 25;

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

  private destroy$ = new Subject<void>();
  private movimientosRequest$ = new Subject<MovimientoFilters>();

  // ── Abonos / pagos parciales ───────────────────────────────────────────────
  expandedPagosId: number | null = null;
  pagoForm: FormGroup;
  pagoErrorMessage = '';
  confirmDeletePago: { movimiento: MovimientoRow; pagoId: number } | null = null;

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
      monto: [null, [Validators.required, Validators.min(1)]],
      concepto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      fecha: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      metodoPago: ['Efectivo'],
      estado: ['PENDIENTE'],
      pacienteId: [null],
    });

    this.pagoForm = this.fb.group({
      monto: [null, [Validators.required, Validators.min(1)]],
      fecha: [formatDateForInput(new Date()), [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      metodoPago: ['Efectivo'],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.loadPatients();

    this.movimientosRequest$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((filters) => {
          this.loading = true;
          this.cdr.detectChanges();
          return this.finanzasService.getAll(filters).pipe(
            catchError(() => {
              this.errorMessage = 'No se pudieron cargar los movimientos';
              this.loading = false;
              this.cdr.detectChanges();
              return of(null);
            })
          );
        })
      )
      .subscribe((res) => {
        if (res) {
          this.movimientos = res.data;
          this.paginaMeta = res.meta ?? null;
          this.loadStats();
          this.loading = false;
          this.cdr.detectChanges();
        }
      });

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('pacienteId');
      if (id && !isNaN(Number(id))) {
        const numId = Number(id);
        // Lista ya cargada: resolución síncrona
        if (this.patients.length) {
          this.selectedPatient = this.patients.find((p) => p.id === numId) ?? null;
          this.currentPage = 1;
          this.loadMovimientos();
        } else {
          // Lista aún vacía: cargar el paciente puntualmente y luego los movimientos
          this.movimientos = [];
          this.patientsService.getPatientById(numId).pipe(takeUntil(this.destroy$)).subscribe({
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
              this.currentPage = 1;
              this.loadMovimientos();
            },
            error: () => {
              this.selectedPatient = null;
              this.currentPage = 1;
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
    this.patientsService.getPatients(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.patients = res.data;
        this.cdr.detectChanges();
      },
      error: () => {
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
    this.currentPage = 1;
    this.loadMovimientos();
  }

  limpiarFiltroSinPaciente(): void {
    this.soloSinPaciente = false;
    this.currentPage = 1;
    this.loadMovimientos();
  }

  limpiarFiltros(): void {
    this.filtroTipo = '';
    this.filtroEstado = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.fechaRangoError = '';
    this.currentPage = 1;
    this.loadMovimientos();
  }

  loadMovimientos(): void {
    if (this.filtroFechaDesde && this.filtroFechaHasta && this.filtroFechaDesde > this.filtroFechaHasta) {
      this.fechaRangoError = 'La fecha inicial no puede ser posterior a la final.';
      return;
    }
    this.fechaRangoError = '';

    const filters: MovimientoFilters = this.selectedPatient
      ? { pacienteId: this.selectedPatient.id }
      : this.soloSinPaciente
        ? { sinPaciente: true }
        : {};

    if (this.filtroTipo)      filters.tipo       = this.filtroTipo;
    if (this.filtroEstado)    filters.estado     = this.filtroEstado;
    if (this.filtroFechaDesde) filters.fechaDesde = this.filtroFechaDesde;
    if (this.filtroFechaHasta) filters.fechaHasta = this.filtroFechaHasta;
    filters.page     = this.currentPage;
    filters.pageSize = this.PAGE_SIZE;
    this.movimientosRequest$.next(filters);
  }

  prevPage(): void {
    if (this.currentPage > 1) { this.currentPage--; this.loadMovimientos(); }
  }

  nextPage(): void {
    if (this.paginaMeta && this.currentPage < this.paginaMeta.totalPages) {
      this.currentPage++;
      this.loadMovimientos();
    }
  }

  trackById(_index: number, item: { id: number }): number { return item.id; }
  trackByIndex(index: number): number { return index; }

  private setSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);
  }

  private loadStats(): void {
    this.finanzasService.getStats(this.selectedPatient?.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.ingresosMes = res.data.ingresosMes;
        this.egresosMes  = res.data.egresosMes;
        this.cdr.detectChanges();
      },
    });
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
      this.finanzasService.update(this.editingId, payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          this.setSuccess('Movimiento actualizado correctamente');
          this.errorMessage = '';
          const totalPagado = (res.data.pagos ?? []).reduce((acc: number, p: any) => acc + p.monto, 0);
          this.warnMessage = totalPagado > res.data.monto
            ? `Atención: lo cobrado ($${totalPagado.toLocaleString('es-CO')}) supera el nuevo monto ($${res.data.monto.toLocaleString('es-CO')}). Revisa los abonos registrados.`
            : '';
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

    this.finanzasService.create(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.setSuccess('Movimiento registrado correctamente');
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

    this.finanzasService.delete(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.setSuccess('Movimiento eliminado');
        if (this.expandedPagosId === id) this.expandedPagosId = null;
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

  // ── Abonos ────────────────────────────────────────────────────────────────

  toggleAbonos(id: number): void {
    if (this.expandedPagosId === id) {
      this.expandedPagosId = null;
      return;
    }
    this.expandedPagosId = id;
    this.pagoForm.reset({ monto: null, fecha: formatDateForInput(new Date()), metodoPago: 'Efectivo' });
    this.pagoErrorMessage = '';
    this.cdr.detectChanges();
  }

  getTotalPagado(m: MovimientoRow): number {
    return (m.pagos || []).reduce((acc, p) => acc + p.monto, 0);
  }

  getPorcentajePagado(m: MovimientoRow): number {
    if (!m.monto) return 0;
    return Math.min(100, (this.getTotalPagado(m) / m.monto) * 100);
  }

  agregarPago(movimiento: MovimientoRow): void {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      return;
    }
    const raw = this.pagoForm.getRawValue();
    this.finanzasService.createPago(movimiento.id, {
      monto: Number(raw.monto),
      fecha: raw.fecha,
      metodoPago: raw.metodoPago || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.movimientos = this.movimientos.map(m => m.id === movimiento.id ? res.data : m);
        this.pagoForm.reset({ monto: null, fecha: '', metodoPago: 'Efectivo' });
        this.pagoErrorMessage = '';
        this.loadStats();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.pagoErrorMessage = err?.error?.message || 'No se pudo registrar el abono';
        this.cdr.detectChanges();
      },
    });
  }

  pedirEliminarPago(movimiento: MovimientoRow, pagoId: number): void {
    this.confirmDeletePago = { movimiento, pagoId };
  }

  confirmarEliminarPago(): void {
    if (!this.confirmDeletePago) return;
    const { movimiento, pagoId } = this.confirmDeletePago;
    this.confirmDeletePago = null;
    this.finanzasService.deletePago(movimiento.id, pagoId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.movimientos = this.movimientos.map(m => m.id === movimiento.id ? res.data : m);
        this.loadStats();
        this.cdr.detectChanges();
      },
      error: () => {
        this.pagoErrorMessage = 'No se pudo eliminar el abono';
        this.cdr.detectChanges();
      },
    });
  }

  cancelarEliminarPago(): void {
    this.confirmDeletePago = null;
  }

  hasPagoError(field: string): boolean {
    const c = this.pagoForm.get(field);
    return !!(c && c.invalid && c.touched);
  }

  // ── Helpers de presentación ───────────────────────────────────────────────

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
    if (!fecha) return '';
    const parts = fecha.substring(0, 10).split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return fecha;
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  hasError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }
}
