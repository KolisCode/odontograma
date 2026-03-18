import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { Navbar } from '../../complements/navbar/navbar';
import { Footer } from '../../complements/footer/footer';
import {
  PatientsService,
  PatientRow,
  QuickInfo,
  RecentPatient
} from '../service/pacientes.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Navbar, Footer],
  templateUrl: './list.html',
  styleUrls: ['./list.css']
})
export class List implements OnInit {
  patientForm: FormGroup;

  loading = false;
  tableLoading = false;
  errorMessage = '';
  successMessage = '';

  patients: PatientRow[] = [];
  recentPatients: RecentPatient[] = [];
  quickInfo: QuickInfo = {
    alergiasRegistradas: 0,
    pacientesNuevosMes: 0,
    historiasPendientes: 0
  };

  constructor(
    private fb: FormBuilder,
    private patientsService: PatientsService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.patientForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      documento: ['', Validators.required],
      fechaNacimiento: [''],
      telefono: [''],
      correo: ['', Validators.email],
      direccion: [''],
      eps: [''],
      alergias: [''],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    this.loadPatientsModuleData();
  }

  loadPatientsModuleData(): void {
    this.loadPatients();
    this.loadRecentPatients();
    this.loadQuickInfo();
  }

  loadPatients(): void {
    this.tableLoading = true;

    this.patientsService.getPatients().subscribe({
      next: (response) => {
        this.patients = response.data;
        this.tableLoading = false;
        this.cdr.detectChanges()
      },
      error: (err:any) => {
        console.log(err);
        this.errorMessage = err?.error?.message || 'No se pudo cargar el listado de pacientes';
        this.tableLoading = false;
      }
    });
  }

  loadRecentPatients(): void {
    this.patientsService.getRecentPatients().subscribe({
      next: (response:any) => {
        this.recentPatients = response.data;
      },
      error: () => {
        this.recentPatients = [];
      }
    });
  }

  loadQuickInfo(): void {
    this.patientsService.getQuickInfo().subscribe({
      next: (response) => {
        console.log(response);
        this.quickInfo = response.data;
      },
      error: (err) => {
        console.log(err);
        this.quickInfo = {
          alergiasRegistradas: 0,
          pacientesNuevosMes: 0,
          historiasPendientes: 0
        };
      }
    });
  }

  onSubmit(): void {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.patientForm.value;

    this.patientsService.createPatient(payload).subscribe({
      next: (response:any) => {
        this.successMessage = response.message || 'Paciente registrado correctamente';
        this.loading = false;
        this.patientForm.reset();
        this.loadPatientsModuleData();
      },
      error: (err:any) => {
        this.errorMessage = err?.error?.message || 'No se pudo registrar el paciente';
        this.loading = false;
      }
    });
  }

  clearForm(): void {
    this.patientForm.reset();
    this.errorMessage = '';
    this.successMessage = '';
  }

  getStatusClass(active: boolean): string {
    return active ? 'status-badge--active' : 'status-badge--pending';
  }

  getStatusLabel(active: boolean): string {
    return active ? 'Activo' : 'Pendiente';
  }

  goToHistory(patientId: number): void {
  this.router.navigate(['/history', patientId]);
}

goToOdontogram(patientId: number): void {
  this.router.navigate(['/odontogram', patientId]);
}
}