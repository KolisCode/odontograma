import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Navbar } from '../../complements/navbar/navbar';
import { Footer } from '../../complements/footer/footer';
import {
  AppointmentService,
  AppointmentRow,
  AppointmentStats,
  UpcomingAppointment,
  AgendaSummary
} from './appointment.service/appointment.service';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Navbar, Footer, NgClass],
  templateUrl: './appointment.html',
  styleUrls: ['./appointment.css']
})
export class Appointment implements OnInit {
  appointmentForm: FormGroup;

  loading = false;
  tableLoading = false;
  errorMessage = '';
  successMessage = '';

  stats: AppointmentStats = {
    citasHoy: 0,
    confirmadas: 0,
    canceladas: 0
  };

  summary: AgendaSummary = {
    primerTurno: 'Sin agenda',
    ultimoTurno: 'Sin agenda',
    espaciosDisponibles: 0
  };

  appointments: AppointmentRow[] = [];
  upcomingAppointments: UpcomingAppointment[] = [];
  patients: any[] = [];
  clinicalStaff: any[] = [];

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private cdr: ChangeDetectorRef
  ) {
    this.appointmentForm = this.fb.group({
      pacienteId: ['', Validators.required],
      usuarioId: [''],
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      estado: ['PROGRAMADA', Validators.required],
      tipoAtencion: ['Valoración'],
      motivo: ['', Validators.required]
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
      }
    });
  }

  loadUpcomingAppointments(): void {
    this.appointmentService.getUpcoming().subscribe({
      next: (response) => {
        this.upcomingAppointments = response.data;
      },
      error: () => {
        this.upcomingAppointments = [];
      }
    });
  }

  loadSummary(): void {
    this.appointmentService.getSummary().subscribe({
      next: (response) => {
        this.summary = response.data;
      }
    });
  }

  loadAppointments(): void {
    this.tableLoading = true;

    this.appointmentService.getAppointments().subscribe({
      next: (response) => {
        this.appointments = response.data;
        this.tableLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo cargar el listado de citas';
        this.tableLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadPatients(): void {
    this.appointmentService.getPatients().subscribe({
      next: (response: any) => {
        this.patients = response.data || [];
      },
      error: () => {
        this.patients = [];
      }
    });
  }

  loadClinicalStaff(): void {
    this.appointmentService.getClinicalStaff().subscribe({
      next: (response: any) => {
        this.clinicalStaff = response.data || [];
      },
      error: () => {
        this.clinicalStaff = [];
      }
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

    const payload = {
      ...this.appointmentForm.value,
      pacienteId: Number(this.appointmentForm.value.pacienteId),
      usuarioId: this.appointmentForm.value.usuarioId
        ? Number(this.appointmentForm.value.usuarioId)
        : null
    };

    this.appointmentService.createAppointment(payload).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Cita registrada correctamente';
        this.loading = false;
        this.appointmentForm.reset({
          pacienteId: '',
          usuarioId: '',
          fecha: '',
          hora: '',
          estado: 'PROGRAMADA',
          tipoAtencion: 'Valoración',
          motivo: ''
        });
        this.loadAppointmentsModuleData();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo registrar la cita';
        this.loading = false;
      }
    });
  }

  clearForm(): void {
    this.appointmentForm.reset({
      pacienteId: '',
      usuarioId: '',
      fecha: '',
      hora: '',
      estado: 'PROGRAMADA',
      tipoAtencion: 'Valoración',
      motivo: ''
    });
    this.errorMessage = '';
    this.successMessage = '';
  }

  getStatusClass(estado: string): string {
    const normalized = String(estado || '').toUpperCase();

    if (normalized === 'CONFIRMADA') return 'status-badge--active';
    if (normalized === 'ATENDIDA') return 'status-badge--done';
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
}