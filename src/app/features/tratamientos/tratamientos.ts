import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { decodeId, encodeId } from '../../shared/ids';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Navbar } from '../complements/navbar/navbar';
import { Footer } from '../complements/footer/footer';
import { TratamientosService, TratamientoRow } from './service/tratamientos.service';
import { PatientsService } from '../user/service/pacientes.service';
import { DocumentosComponent } from '../documentos/documentos/documentos';
import { OdontogramService } from '../../services/odontogram';
import { BackendOdontogramResponse } from '../odontogram/interfaces/backend-odontogram-response';

interface ProcResumen {
  tipo: string;
  label: string;
  dientes: number[];
}

@Component({
  selector: 'app-tratamientos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Navbar, Footer, DocumentosComponent],
  templateUrl: './tratamientos.html',
  styleUrl: './tratamientos.css',
})
export class Tratamientos implements OnInit, OnDestroy {
  pacienteId!: number;
  patientName = '';

  tratamientos: TratamientoRow[] = [];
  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  form: FormGroup;
  formVisible = false;
  editingId: number | null = null;
  confirmDeleteId: number | null = null;

  // Plan de odontograma
  plan: BackendOdontogramResponse | null = null;
  planLoading = false;
  planProcedimientos: ProcResumen[] = [];
  planPiezas: ProcResumen[] = [];
  private planOdontogramaId: number | null = null;
  odontogramaIdParaCrear: number | null = null;

  private readonly PROC_LABELS: Record<string, string> = {
    Resina: 'Resina', Profilaxis: 'Profilaxis', Blanqueamiento: 'Blanqueamiento',
    Exodoncia: 'Exodoncia', TratamientoPeriodontal: 'Trat. Periodontal', Cirugia: 'Cirugía',
  };
  private readonly PIEZA_LABELS: Record<string, string> = {
    Corona: 'Corona', Puente: 'Puente', Implante: 'Implante',
    ProtesisParcial: 'Prót. Parcial', ProtesisTotal: 'Prót. Total',
    DienteAusente: 'Diente Ausente', MantenedorEspacio: 'Mant. Espacio',
  };

  estados = ['ACTIVO', 'FINALIZADO', 'PAUSADO'];
  private destroy$ = new Subject<void>();
  private _successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private tratamientosService: TratamientosService,
    private patientsService: PatientsService,
    private odontogramService: OdontogramService,
  ) {
    this.form = this.fb.group(
      {
        descripcion: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(300)]],
        estado: ['ACTIVO'],
        monto: [null, [Validators.min(0)]],
        fechaInicio: [null],
        fechaFin: [null],
      },
      { validators: this.fechaOrdenValidator },
    );
  }

  ngOnDestroy(): void {
    if (this._successTimer) clearTimeout(this._successTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      const parsed = id ? decodeId(id) : null;
      if (parsed === null) return;
      this.pacienteId = parsed;
      this.loadPatient();
      this.loadTratamientos();
      this.loadPlan();
    });
  }

  private loadPatient(): void {
    this.patientsService.getPatientById(this.pacienteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.patientName = `${res.data.nombre} ${res.data.apellido}`.trim();
        this.cdr.detectChanges();
      },
      error: () => {
        this.patientName = `Paciente #${this.pacienteId}`;
        this.cdr.detectChanges();
      },
    });
  }

  loadTratamientos(): void {
    this.loading = true;
    this.tratamientosService.getByPaciente(this.pacienteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.tratamientos = res.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los tratamientos';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  irAHistoria(): void {
    this.router.navigate(['/history', encodeId(this.pacienteId)]);
  }

  irAPacientes(): void {
    this.router.navigate(['/patients']);
  }

  irAResumen(): void {
    this.router.navigate(['/resumen', encodeId(this.pacienteId)]);
  }

  verPlanOdontograma(): void {
    this.router.navigate(['/odontogram', encodeId(this.pacienteId)], { queryParams: { tab: 'plan' } });
  }

  get encodedId(): string {
    return this.pacienteId ? encodeId(this.pacienteId) : '';
  }

  private loadPlan(): void {
    this.planLoading = true;
    this.odontogramService.getPlan(this.pacienteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.plan = data;
        this.planOdontogramaId = data?.id ?? null;
        if (data) this.buildPlanResumen(data);
        this.planLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.plan = null;
        this.planLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private buildPlanResumen(plan: BackendOdontogramResponse): void {
    const procMap = new Map<string, Set<number>>();
    const piezaMap = new Map<string, Set<number>>();

    for (const diente of plan.dientes ?? []) {
      for (const sup of diente.superficies ?? []) {
        if (sup.superficie === 'P') {
          if (!piezaMap.has(sup.diagnostico)) piezaMap.set(sup.diagnostico, new Set());
          piezaMap.get(sup.diagnostico)!.add(diente.numero);
        } else {
          if (!procMap.has(sup.diagnostico)) procMap.set(sup.diagnostico, new Set());
          procMap.get(sup.diagnostico)!.add(diente.numero);
        }
      }
    }

    this.planProcedimientos = Array.from(procMap.entries()).map(([tipo, teeth]) => ({
      tipo, label: this.PROC_LABELS[tipo] ?? tipo,
      dientes: Array.from(teeth).sort((a, b) => a - b),
    }));

    this.planPiezas = Array.from(piezaMap.entries()).map(([tipo, teeth]) => ({
      tipo, label: this.PIEZA_LABELS[tipo] ?? tipo,
      dientes: Array.from(teeth).sort((a, b) => a - b),
    }));
  }

  crearDesdePlan(): void {
    if (!this.plan) return;
    const lineas = [
      ...this.planProcedimientos,
      ...this.planPiezas,
    ].map(p => `${p.label}: D.${p.dientes.join(', D.')}`);

    const base = `Plan v${this.plan.version} — ${lineas.join(' · ')}`;
    const descripcion = base.length > 297 ? base.substring(0, 297) + '...' : base;

    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fechaHoy = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    this.odontogramaIdParaCrear = this.plan.id;
    this.editingId = null;
    this.formVisible = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.form.reset({ estado: 'ACTIVO' });
    this.form.patchValue({ descripcion, fechaInicio: fechaHoy });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showForm(): void {
    this.formVisible = true;
    this.editingId = null;
    this.form.reset({ estado: 'ACTIVO' });
    this.errorMessage = '';
    this.successMessage = '';
  }

  editTratamiento(t: TratamientoRow): void {
    this.editingId = t.id;
    this.formVisible = true;
    this.form.patchValue({
      descripcion: t.descripcion,
      estado: t.estado,
      monto: t.monto,
      fechaInicio: t.fechaInicio ? t.fechaInicio.substring(0, 10) : null,
      fechaFin: t.fechaFin ? t.fechaFin.substring(0, 10) : null,
    });
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelForm(): void {
    this.formVisible = false;
    this.editingId = null;
    this.odontogramaIdParaCrear = null;
    this.form.reset({ estado: 'ACTIVO' });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    if (raw.fechaInicio && raw.fechaFin && raw.fechaFin < raw.fechaInicio) {
      this.errorMessage = 'La fecha de fin no puede ser anterior a la fecha de inicio';
      this.cdr.detectChanges();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const data = {
      descripcion: raw.descripcion.trim(),
      estado: raw.estado,
      monto: raw.monto !== null && raw.monto !== '' ? Number(raw.monto) : null,
      fechaInicio: raw.fechaInicio || null,
      fechaFin: raw.fechaFin || null,
    };

    if (this.editingId) {
      this.tratamientosService.update(this.editingId, data).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.submitting = false;
          this.setSuccess('Tratamiento actualizado correctamente');
          this.cdr.detectChanges();
          this.cancelForm();
          this.loadTratamientos();
        },
        error: (err: any) => {
          this.submitting = false;
          this.errorMessage = err?.error?.message || 'No se pudo actualizar el tratamiento';
          this.cdr.detectChanges();
        },
      });
    } else {
      const odontogramaId = this.odontogramaIdParaCrear;
      this.tratamientosService.create({ ...data, pacienteId: this.pacienteId, odontogramaId }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.submitting = false;
          this.odontogramaIdParaCrear = null;
          this.setSuccess('Tratamiento registrado correctamente');
          this.cdr.detectChanges();
          this.cancelForm();
          this.loadTratamientos();
        },
        error: (err: any) => {
          this.submitting = false;
          this.errorMessage = err?.error?.message || 'No se pudo registrar el tratamiento';
          this.cdr.detectChanges();
        },
      });
    }
  }

  cambiarEstado(t: TratamientoRow, nuevoEstado: string): void {
    this.tratamientosService.update(t.id, { estado: nuevoEstado }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadTratamientos(),
      error: () => {
        this.errorMessage = 'No se pudo actualizar el estado';
        this.cdr.detectChanges();
      },
    });
  }

  eliminar(id: number): void {
    this.confirmDeleteId = id;
  }

  confirmarEliminar(): void {
    if (this.confirmDeleteId === null) return;
    const id = this.confirmDeleteId;
    this.confirmDeleteId = null;

    this.tratamientosService.delete(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.setSuccess('Tratamiento eliminado');
        this.cdr.detectChanges();
        this.loadTratamientos();
      },
      error: () => {
        this.errorMessage = 'No se pudo eliminar el tratamiento';
        this.cdr.detectChanges();
      },
    });
  }

  cancelarEliminar(): void {
    this.confirmDeleteId = null;
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      ACTIVO: 'badge--active',
      FINALIZADO: 'badge--done',
      PAUSADO: 'badge--paused',
    };
    return map[estado] ?? '';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      ACTIVO: 'Activo',
      FINALIZADO: 'Finalizado',
      PAUSADO: 'Pausado',
    };
    return map[estado] ?? estado;
  }

  hasError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  private fechaOrdenValidator(group: AbstractControl): ValidationErrors | null {
    const inicio = group.get('fechaInicio')?.value;
    const fin    = group.get('fechaFin')?.value;
    if (inicio && fin && fin < inicio) return { fechaOrden: true };
    return null;
  }

  private setSuccess(msg: string): void {
    if (this._successTimer) clearTimeout(this._successTimer);
    this.successMessage = msg;
    this._successTimer = setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);
  }
}
