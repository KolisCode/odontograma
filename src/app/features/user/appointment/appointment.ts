import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: AppointmentRow[];
}
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
import { AdminService } from '../../admin/admin.service';
import {
  AppointmentService,
  AppointmentPayload,
  AppointmentRow,
  AppointmentStats,
  UpcomingAppointment,
  AgendaSummary,
  CitaFilters,
  ClinicalStaffRow,
  PaginaMeta,
} from './appointment.service/appointment.service';
import { PatientRow } from '../service/pacientes.service';
import { formatDateForInput, medianocheColUTC, fechaHoyCol } from '../../../utils/date.utils';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Navbar, Footer, NgClass],
  templateUrl: './appointment.html',
  styleUrls: ['./appointment.css'],
})
export class Appointment implements OnInit, OnDestroy {
  appointmentForm: FormGroup;
  asideVisible = false;

  formVisible = false;
  loading = false;
  whatsappLink: string | null = null;
  private indicativoPais = '57';
  tableLoading = false;
  updatingEstadoId: number | null = null;
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
  patients: PatientRow[] = [];
  clinicalStaff: ClinicalStaffRow[] = [];
  paginaMeta: PaginaMeta | null = null;
  currentPage = 1;
  readonly PAGE_SIZE = 25;

  // ── Calendario ────────────────────────────────────────────────────────────
  calendarView = false;
  calendarYear  = parseInt(fechaHoyCol().split('-')[0], 10);
  calendarMonth = parseInt(fechaHoyCol().split('-')[1], 10) - 1; // 0-indexed
  selectedCalendarDay: string | null = null;
  calendarAppointments: AppointmentRow[] = [];
  calendarLoading = false;

  readonly MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  readonly WEEK_DAYS = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

  toggleCalendarView(): void {
    this.calendarView = !this.calendarView;
    this.selectedCalendarDay = null;
    if (this.calendarView) this.loadCalendarData();
  }

  loadCalendarData(): void {
    this.calendarLoading = true;
    const fechaDesde = this.toDateKey(new Date(this.calendarYear, this.calendarMonth, 1));
    const fechaHasta = this.toDateKey(new Date(this.calendarYear, this.calendarMonth + 1, 0));
    this.appointmentService.getAppointments({ fechaDesde, fechaHasta }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.calendarAppointments = res.data;
        this.calendarLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.calendarAppointments = [];
        this.calendarLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  prevMonth(): void {
    if (this.calendarMonth === 0) { this.calendarMonth = 11; this.calendarYear--; }
    else { this.calendarMonth--; }
    this.selectedCalendarDay = null;
    this.loadCalendarData();
  }

  nextMonth(): void {
    if (this.calendarMonth === 11) { this.calendarMonth = 0; this.calendarYear++; }
    else { this.calendarMonth++; }
    this.selectedCalendarDay = null;
    this.loadCalendarData();
  }

  get calendarMonthLabel(): string {
    return `${this.MONTH_NAMES[this.calendarMonth]} ${this.calendarYear}`;
  }

  selectCalendarDay(day: CalendarDay): void {
    if (!day.isCurrentMonth || day.appointments.length === 0) return;
    this.selectedCalendarDay = this.selectedCalendarDay === day.date ? null : day.date;
  }

  get selectedDayAppointments(): AppointmentRow[] {
    if (!this.selectedCalendarDay) return [];
    return this.calendarAppointments.filter(a => this.getFechaISO(a) === this.selectedCalendarDay);
  }

  get calendarDays(): CalendarDay[] {
    const todayKey = fechaHoyCol();

    const apptMap = new Map<string, AppointmentRow[]>();
    for (const a of this.calendarAppointments) {
      const key = this.getFechaISO(a);
      if (!key) continue;
      if (!apptMap.has(key)) apptMap.set(key, []);
      apptMap.get(key)!.push(a);
    }

    const days: CalendarDay[] = [];
    const firstOfMonth = new Date(this.calendarYear, this.calendarMonth, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Lu=0

    const prevY = this.calendarMonth === 0 ? this.calendarYear - 1 : this.calendarYear;
    const prevM = this.calendarMonth === 0 ? 11 : this.calendarMonth - 1;
    const daysInPrevMonth = new Date(this.calendarYear, this.calendarMonth, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = this.toDateKey(new Date(prevY, prevM, d));
      days.push({ date, day: d, isCurrentMonth: false, isToday: date === todayKey, appointments: [] });
    }

    const daysInMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = this.toDateKey(new Date(this.calendarYear, this.calendarMonth, d));
      days.push({ date, day: d, isCurrentMonth: true, isToday: date === todayKey, appointments: apptMap.get(date) || [] });
    }

    const nextY = this.calendarMonth === 11 ? this.calendarYear + 1 : this.calendarYear;
    const nextM = this.calendarMonth === 11 ? 0 : this.calendarMonth + 1;
    let nd = 1;
    while (days.length < 42) {
      const date = this.toDateKey(new Date(nextY, nextM, nd));
      days.push({ date, day: nd, isCurrentMonth: false, isToday: date === todayKey, appointments: [] });
      nd++;
    }

    return days;
  }

  formatCalendarDayLabel(dateKey: string | null): string {
    if (!dateKey) return '';
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' });
  }

  private getFechaISO(a: AppointmentRow): string {
    if (a.fechaISO) return a.fechaISO;
    // Fallback: parsear formato 'es-CO' "d/m/yyyy" → "yyyy-mm-dd"
    const parts = a.fecha.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return '';
  }

  getShortName(fullName: string): string {
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1] || fullName;
  }

  getStatusKey(estado: string): string {
    const s = (estado || '').toUpperCase();
    if (s === 'CONFIRMADA') return 'active';
    if (s === 'ATENDIDA')   return 'done';
    if (s === 'CANCELADA')  return 'cancelled';
    return 'pending';
  }

  getChipHour(hora: string): string {
    // Toma solo "09:00" de "09:00 a. m." o lo que devuelva el backend
    return hora.split(' ')[0];
  }

  private toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  // ── Filtros ────────────────────────────────────────────────────────────────
  filtrosVisible = false;
  filtroEstado = '';
  filtroTipoAtencion = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtroDocumento = '';
  filtroPacienteId: number | null = null;
  private documentoFiltroTimer: ReturnType<typeof setTimeout> | null = null;
  private _successTimer: ReturnType<typeof setTimeout> | null = null;
  private destroy$ = new Subject<void>();

  get filtrosActivos(): number {
    return [this.filtroEstado, this.filtroTipoAtencion, this.filtroFechaDesde, this.filtroFechaHasta]
      .filter(v => !!v).length + (this.filtroPacienteId !== null ? 1 : 0);
  }

  get minDate(): string { return fechaHoyCol(); }

  readonly validStatuses = ['PROGRAMADA', 'CONFIRMADA'];
  readonly validAttentionTypes = ['Valoración', 'Limpieza', 'Control', 'Urgencia'];

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private adminService: AdminService,
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
      motivo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    this.adminService.getConfig().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.indicativoPais = res.data.indicativoPais || '57'; },
      error: () => { this.indicativoPais = '57'; },
    });
    this.loadAppointmentsModuleData();
  }

  ngOnDestroy(): void {
    if (this.documentoFiltroTimer) clearTimeout(this.documentoFiltroTimer);
    if (this._successTimer) clearTimeout(this._successTimer);
    this.destroy$.next();
    this.destroy$.complete();
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
    this.appointmentService.getStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.stats = response.data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  loadUpcomingAppointments(): void {
    this.appointmentService.getUpcoming().pipe(takeUntil(this.destroy$)).subscribe({
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
    this.appointmentService.getSummary().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.summary = response.data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  loadAppointments(): void {
    this.tableLoading = true;

    const filters: CitaFilters = { page: this.currentPage, pageSize: this.PAGE_SIZE };
    if (this.filtroEstado) filters.estado = this.filtroEstado;
    if (this.filtroTipoAtencion) filters.tipoAtencion = this.filtroTipoAtencion;
    if (this.filtroFechaDesde) filters.fechaDesde = this.filtroFechaDesde;
    if (this.filtroFechaHasta) filters.fechaHasta = this.filtroFechaHasta;
    if (this.filtroPacienteId !== null) filters.pacienteId = this.filtroPacienteId;

    this.appointmentService.getAppointments(filters).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.appointments = response.data;
        this.paginaMeta = response.meta ?? null;
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
    this.currentPage = 1;
    this.loadAppointments();
  }

  prevPage(): void {
    if (this.currentPage > 1) { this.currentPage--; this.loadAppointments(); }
  }

  nextPage(): void {
    if (this.paginaMeta && this.currentPage < this.paginaMeta.totalPages) {
      this.currentPage++;
      this.loadAppointments();
    }
  }

  get displayedAppointments(): AppointmentRow[] {
    const trimmed = this.filtroDocumento.trim();
    // Exact match: backend already filtered — return as-is
    if (!trimmed || this.filtroPacienteId !== null) return this.appointments;
    // Partial match: filter client-side by patients whose documento contains the typed string
    const matchingIds = new Set<number>(
      this.patients
        .filter(p => p.documento.includes(trimmed))
        .map(p => p.id)
    );
    if (matchingIds.size === 0) return [];
    return this.appointments.filter(a => a.pacienteId !== undefined && matchingIds.has(a.pacienteId));
  }

  onDocumentoFiltroChange(value: string): void {
    this.filtroDocumento = value;
    const match = this.patients.find(p => p.documento === value.trim());
    this.filtroPacienteId = match ? match.id : null;
    if (this.documentoFiltroTimer) clearTimeout(this.documentoFiltroTimer);
    this.documentoFiltroTimer = setTimeout(() => this.loadAppointments(), 300);
  }

  getPacienteNombreById(id: number): string {
    const p = this.patients.find(p => p.id === id);
    return p ? p.nombreCompleto : '';
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroTipoAtencion = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroDocumento = '';
    this.filtroPacienteId = null;
    this.loadAppointments();
  }

  loadPatients(): void {
    this.appointmentService.getPatients().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.patients = response.data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.patients = [];
        this.cdr.detectChanges();
      },
    });
  }

  loadClinicalStaff(): void {
    this.appointmentService.getClinicalStaff().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.clinicalStaff = response.data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.clinicalStaff = [];
        this.cdr.detectChanges();
      },
    });
  }

  onSubmit(): void {
    if (this.loading) return;
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: AppointmentPayload = this.buildPayload();

    // Capturar datos antes del reset para el enlace de WhatsApp
    const pacienteId = Number(this.appointmentForm.get('pacienteId')?.value);
    const fecha = String(this.appointmentForm.get('fecha')?.value ?? '');
    const hora = String(this.appointmentForm.get('hora')?.value ?? '');
    const motivo = String(this.appointmentForm.get('motivo')?.value ?? '');

    this.appointmentService.createAppointment(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.setSuccess(response.message || 'Cita registrada correctamente');
        this.loading = false;
        this.formVisible = false;

        // Generar enlace de WhatsApp si el paciente tiene teléfono
        const patient = this.patients.find(p => p.id === pacienteId);
        const phone = String(patient?.telefono ?? '').replace(/\D/g, '');
        if (phone.length >= 7) {
          const nombre = String(patient?.nombreCompleto ?? 'Paciente').split(' ')[0];
          const fechaLabel = new Date(`${fecha}T00:00:00-05:00`).toLocaleDateString('es-CO', {
            weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota',
          });
          const msg = `Hola ${nombre}, le recordamos su cita en Biodont el ${fechaLabel} a las ${hora}. Motivo: ${motivo}. Por favor confirmar su asistencia.`;
          this.whatsappLink = `https://wa.me/${this.indicativoPais}${phone}?text=${encodeURIComponent(msg)}`;
        } else {
          this.whatsappLink = null;
        }

        this.cdr.detectChanges();
        this.resetForm();
        this.loadAppointmentsModuleData();
        if (this.calendarView) this.loadCalendarData();
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
    this.whatsappLink = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearForm(): void {
    this.formVisible = false;
    this.resetForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.whatsappLink = null;
  }

  citaCancelando: { id: number; tienePendientes: boolean } | null = null;

  solicitarCambioEstado(item: AppointmentRow, nuevoEstado: string): void {
    if (nuevoEstado === 'CANCELADA' && item.tienePendientes) {
      this.citaCancelando = { id: item.id, tienePendientes: true };
    } else {
      this.cambiarEstado(item.id, nuevoEstado);
    }
  }

  confirmarCancelacion(cancelarMovimientos: boolean): void {
    if (!this.citaCancelando) return;
    const id = this.citaCancelando.id;
    this.citaCancelando = null;
    this.cambiarEstado(id, 'CANCELADA', cancelarMovimientos);
  }

  cambiarEstado(id: number, estado: string, cancelarMovimientos = false): void {
    if (this.updatingEstadoId !== null) return;
    this.updatingEstadoId = id;
    this.appointmentService.updateEstado(id, estado, cancelarMovimientos).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.updatingEstadoId = null;
        this.loadAppointmentsModuleData();
      },
      error: (err: any) => {
        this.updatingEstadoId = null;
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

  trackById(_index: number, item: { id: number }): number { return item.id; }
  trackByDate(_index: number, day: CalendarDay): string { return day.date; }
  trackByIndex(index: number): number { return index; }

  private setSuccess(msg: string): void {
    if (this._successTimer) clearTimeout(this._successTimer);
    this.successMessage = msg;
    this._successTimer = setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);
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
    return formatDateForInput(date);
  }

  private noPastDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const inputDate = new Date(`${control.value}T00:00:00-05:00`);
      if (isNaN(inputDate.getTime())) return { invalidDate: true };
      // Medianoche Colombia de hoy como instante UTC — explícito, independiente
      // de la zona horaria del navegador.
      if (inputDate < medianocheColUTC(0)) return { pastDate: true };
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
