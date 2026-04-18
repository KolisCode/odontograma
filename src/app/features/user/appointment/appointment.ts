import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Navbar } from '../../complements/navbar/navbar';
import { Footer } from '../../complements/footer/footer';
import {
  AppointmentService,
  AppointmentPayload,
  AppointmentRow,
  AppointmentStats,
  UpcomingAppointment,
  AgendaSummary,
  CitaFilters,
} from './appointment.service/appointment.service';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Navbar, Footer, NgClass],
  templateUrl: './appointment.html',
  styleUrls: ['./appointment.css'],
})
export class Appointment implements OnInit {
  appointmentForm: FormGroup;
  asideVisible = false;

  formVisible = false;
  loading = false;
  tableLoading = false;
  errorMessage = '';
  successMessage = '';

  stats: AppointmentStats = {
    citasHoy: 0,
    confirmadas: 0,
    canceladas: 0,
  };

  summary: AgendaSummary = {
    primerTurno: 'Sin agenda',
    ultimoTurno: 'Sin agenda',
    espaciosDisponibles: 0,
  };

  appointments: AppointmentRow[] = [];
  upcomingAppointments: UpcomingAppointment[] = [];
  patients: any[] = [];
  clinicalStaff: any[] = [];

  // ── Filtros ────────────────────────────────────────────────────────────────
  filtrosVisible = false;
  filtroEstado = '';
  filtroTipoAtencion = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  get filtrosActivos(): number {
    return [this.filtroEstado, this.filtroTipoAtencion, this.filtroFechaDesde, this.filtroFechaHasta]
      .filter(v => !!v).length;
  }

  minDate = this.formatDateForInput(new Date());

  readonly validStatuses = ['PROGRAMADA', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA'];
  readonly validAttentionTypes = ['Valoración', 'Limpieza', 'Control', 'Urgencia'];

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private cdr: ChangeDetectorRef,
  ) {
    this.appointmentForm = this.fb.group({
      pacienteId: ['', [Validators.required, this.positiveNumberStringValidator()]],
      usuarioId: ['', [this.optionalPositiveNumberStringValidator()]],
      fecha: ['', [Validators.required, this.noPastDateValidator()]],
      hora: ['', [Validators.required, this.timeFormatValidator()]],
      estado: [
        'PROGRAMADA',
        [Validators.required, this.allowedValuesValidator(this.validStatuses)],
      ],
      tipoAtencion: ['Valoración', [this.allowedValuesValidator(this.validAttentionTypes)]],
      motivo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(250)]],
    });
  }

  ngOnInit(): void {
    this.loadAppointmentsModuleData();
  }

  loadAppointmentsModuleData(): void {
    this.loadStats();
    this.loadUpcomingAppointments();
    this.loadSummary();
    this.loadAppointments();
    this.loadPatients();
    this.loadClinicalStaff();
  }

  loadStats(): void {
    this.appointmentService.getStats().subscribe({
      next: (response) => {
        this.stats = response.data;
      },
    });
  }

  loadUpcomingAppointments(): void {
    this.appointmentService.getUpcoming().subscribe({
      next: (response) => {
        this.upcomingAppointments = response.data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.upcomingAppointments = [];
        this.cdr.detectChanges();
      },
    });
  }

  loadSummary(): void {
    this.appointmentService.getSummary().subscribe({
      next: (response) => {
        this.summary = response.data;
      },
    });
  }

  loadAppointments(): void {
    this.tableLoading = true;

    const filters: CitaFilters = {};
    if (this.filtroEstado) filters.estado = this.filtroEstado;
    if (this.filtroTipoAtencion) filters.tipoAtencion = this.filtroTipoAtencion;
    if (this.filtroFechaDesde) filters.fechaDesde = this.filtroFechaDesde;
    if (this.filtroFechaHasta) filters.fechaHasta = this.filtroFechaHasta;

    this.appointmentService.getAppointments(filters).subscribe({
      next: (response) => {
        this.appointments = response.data;
        this.tableLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo cargar el listado de citas';
        this.tableLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  aplicarFiltros(): void {
    this.loadAppointments();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroTipoAtencion = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.loadAppointments();
  }

  loadPatients(): void {
    this.appointmentService.getPatients().subscribe({
      next: (response: any) => {
        this.patients = response.data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.patients = [];
        this.cdr.detectChanges();
      },
    });
  }

  loadClinicalStaff(): void {
    this.appointmentService.getClinicalStaff().subscribe({
      next: (response: any) => {
        this.clinicalStaff = response.data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.clinicalStaff = [];
        this.cdr.detectChanges();
      },
    });
  }

  onSubmit(): void {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: AppointmentPayload = this.buildPayload();

    this.appointmentService.createAppointment(payload).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Cita registrada correctamente';
        this.loading = false;
        this.formVisible = false;
        this.cdr.detectChanges();

        this.resetForm();
        this.loadAppointmentsModuleData();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo registrar la cita';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openForm(): void {
    this.formVisible = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearForm(): void {
    this.formVisible = false;
    this.resetForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  cambiarEstado(id: number, estado: string): void {
    this.appointmentService.updateEstado(id, estado).subscribe({
      next: () => {
        this.loadAppointmentsModuleData();
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'No se pudo actualizar el estado';
        this.cdr.detectChanges();
      },
    });
  }

  getStatusClass(estado: string): string {
    const normalized = String(estado || '').toUpperCase();

    if (normalized === 'CONFIRMADA') return 'status-badge--active';
    if (normalized === 'ATENDIDA') return 'status-badge--done';
    if (normalized === 'CANCELADA') return 'status-badge--cancelled';
    return 'status-badge--pending';
  }

  getStatusLabel(estado: string): string {
    const normalized = String(estado || '').toUpperCase();

    if (normalized === 'PROGRAMADA') return 'Programada';
    if (normalized === 'CONFIRMADA') return 'Confirmada';
    if (normalized === 'ATENDIDA') return 'Atendida';
    if (normalized === 'CANCELADA') return 'Cancelada';

    return estado;
  }

  getControl(controlName: string): AbstractControl | null {
    return this.appointmentForm.get(controlName);
  }

  hasError(controlName: string): boolean {
    const control = this.getControl(controlName);
    return !!(control && control.invalid && control.touched);
  }

  getErrorMessage(controlName: string): string {
    const control = this.getControl(controlName);

    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    }

    if (control.errors['maxlength']) {
      return `No puede superar ${control.errors['maxlength'].requiredLength} caracteres.`;
    }

    if (controlName === 'pacienteId') {
      if (control.errors['invalidPositiveNumber']) {
        return 'Debes seleccionar un paciente válido.';
      }
    }

    if (controlName === 'usuarioId') {
      if (control.errors['invalidPositiveNumber']) {
        return 'Selecciona un profesional válido.';
      }
    }

    if (controlName === 'fecha') {
      if (control.errors['pastDate']) {
        return 'No puedes registrar una cita en una fecha pasada.';
      }
      if (control.errors['invalidDate']) {
        return 'La fecha ingresada no es válida.';
      }
    }

    if (controlName === 'hora') {
      if (control.errors['invalidTime']) {
        return 'La hora ingresada no es válida.';
      }
    }

    if (controlName === 'estado' || controlName === 'tipoAtencion') {
      if (control.errors['invalidOption']) {
        return 'Selecciona una opción válida.';
      }
    }

    return 'Campo inválido.';
  }

  private buildPayload(): AppointmentPayload {
    const raw = this.appointmentForm.getRawValue();

    return {
      pacienteId: Number(raw.pacienteId),
      usuarioId: raw.usuarioId ? Number(raw.usuarioId) : null,
      fecha: this.cleanText(raw.fecha),
      hora: this.cleanText(raw.hora),
      motivo: this.cleanText(raw.motivo),
      estado: this.cleanText(raw.estado).toUpperCase(),
      tipoAtencion: this.cleanText(raw.tipoAtencion),
    };
  }

  private resetForm(): void {
    this.appointmentForm.reset({
      pacienteId: '',
      usuarioId: '',
      fecha: '',
      hora: '',
      estado: 'PROGRAMADA',
      tipoAtencion: 'Valoración',
      motivo: '',
    });
  }

  private cleanText(value: string | null | undefined): string {
    return (value ?? '').toString().trim().replace(/\s+/g, ' ');
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private noPastDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const inputDate = new Date(`${control.value}T00:00:00`);

      if (isNaN(inputDate.getTime())) {
        return { invalidDate: true };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (inputDate < today) {
        return { pastDate: true };
      }

      return null;
    };
  }

  private timeFormatValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      return timeRegex.test(control.value) ? null : { invalidTime: true };
    };
  }

  private positiveNumberStringValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const value = Number(control.value);

      if (!Number.isInteger(value) || value <= 0) {
        return { invalidPositiveNumber: true };
      }

      return null;
    };
  }

  private optionalPositiveNumberStringValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const value = Number(control.value);

      if (!Number.isInteger(value) || value <= 0) {
        return { invalidPositiveNumber: true };
      }

      return null;
    };
  }

  private allowedValuesValidator(validValues: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      return validValues.includes(control.value) ? null : { invalidOption: true };
    };
  }
}
