import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Navbar } from '../complements/navbar/navbar';
import { Footer } from '../complements/footer/footer';
import { TratamientosService, TratamientoRow } from './service/tratamientos.service';
import { PatientsService } from '../user/service/pacientes.service';
import { DocumentosComponent } from '../documentos/documentos/documentos';

@Component({
  selector: 'app-tratamientos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar, Footer, DocumentosComponent],
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

  estados = ['ACTIVO', 'FINALIZADO', 'PAUSADO'];
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private tratamientosService: TratamientosService,
    private patientsService: PatientsService,
  ) {
    this.form = this.fb.group({
      descripcion: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(300)]],
      estado: ['ACTIVO'],
      monto: [null],
      fechaInicio: [null],
      fechaFin: [null],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (!id || isNaN(Number(id))) return;
      this.pacienteId = Number(id);
      this.loadPatient();
      this.loadTratamientos();
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

  verPlanOdontograma(): void {
    this.router.navigate(['/odontogram', this.pacienteId], { queryParams: { tab: 'plan' } });
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
      this.tratamientosService.create({ ...data, pacienteId: this.pacienteId }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.submitting = false;
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

  private setSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);
  }
}
