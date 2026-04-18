import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { Navbar } from '../../complements/navbar/navbar';
import { Footer } from '../../complements/footer/footer';
import {
  PatientsService,
  PatientPayload,
  PatientRow,
  QuickInfo,
  RecentPatient,
} from '../service/pacientes.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Navbar, Footer],
  templateUrl: './list.html',
  styleUrls: ['./list.css'],
})
export class List implements OnInit {
  patientForm: FormGroup;

  formVisible = false;
  loading = false;
  tableLoading = false;
  errorMessage = '';
  successMessage = '';
  editingId: number | null = null;

  patients: PatientRow[] = [];
  recentPatients: RecentPatient[] = [];
  quickInfo: QuickInfo = {
    alergiasRegistradas: 0,
    pacientesNuevosMes: 0,
    historiasPendientes: 0,
  };

  maxBirthDate = this.formatDateForInput(new Date());

  constructor(
    private fb: FormBuilder,
    private patientsService: PatientsService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {
    this.patientForm = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(60),
          Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
        ],
      ],
      apellido: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(60),
          Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
        ],
      ],
      documento: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(15),
          Validators.pattern(/^[0-9]+$/),
        ],
      ],
      fechaNacimiento: ['', [this.noFutureDateValidator(), this.ageRangeValidator(0, 120)]],
      telefono: [
        '',
        [Validators.minLength(7), Validators.maxLength(15), Validators.pattern(/^[0-9]+$/)],
      ],
      correo: ['', [Validators.email, Validators.maxLength(100)]],
      direccion: ['', [Validators.maxLength(120)]],
      eps: [
        '',
        [Validators.maxLength(60), Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s().,-]+$/)],
      ],
      alergias: ['', [Validators.maxLength(150)]],
      observaciones: ['', [Validators.maxLength(300)]],
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
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'No se pudo cargar el listado de pacientes';
        this.tableLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadRecentPatients(): void {
    this.patientsService.getRecentPatients().subscribe({
      next: (response: any) => {
        this.recentPatients = response.data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.recentPatients = [];
        this.cdr.detectChanges();
      },
    });
  }

  loadQuickInfo(): void {
    this.patientsService.getQuickInfo().subscribe({
      next: (response) => {
        this.quickInfo = response.data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.quickInfo = {
          alergiasRegistradas: 0,
          pacientesNuevosMes: 0,
          historiasPendientes: 0,
        };
        this.cdr.detectChanges();
      },
    });
  }

  openForm(): void {
    this.editingId = null;
    this.patientForm.reset();
    this.errorMessage = '';
    this.successMessage = '';
    this.formVisible = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editPatient(id: number): void {
    this.formVisible = true;
    this.patientsService.getPatientById(id).subscribe({
      next: (res: any) => {
        const p = res.data;
        this.editingId = id;
        this.errorMessage = '';
        this.successMessage = '';
        this.patientForm.patchValue({
          nombre: p.nombre,
          apellido: p.apellido,
          documento: p.documento,
          fechaNacimiento: p.fechaNacimiento ? p.fechaNacimiento.substring(0, 10) : '',
          telefono: p.telefono ?? '',
          correo: p.correo ?? '',
          direccion: p.direccion ?? '',
          eps: p.eps ?? '',
          alergias: p.alergias ?? '',
          observaciones: p.observaciones ?? '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el paciente para editar';
        this.cdr.detectChanges();
      },
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.patientForm.reset();
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit(): void {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.buildPayload();

    if (this.editingId !== null) {
      this.patientsService.updatePatient(this.editingId, payload).subscribe({
        next: (response: any) => {
          this.successMessage = response.message || 'Paciente actualizado correctamente';
          this.loading = false;
          this.editingId = null;
          this.formVisible = false;
          this.patientForm.reset();
          this.cdr.detectChanges();
          this.loadPatientsModuleData();
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.message || 'No se pudo actualizar el paciente';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.patientsService.createPatient(payload).subscribe({
        next: (response: any) => {
          this.successMessage = response.message || 'Paciente registrado correctamente';
          this.loading = false;
          this.formVisible = false;
          this.patientForm.reset();
          this.cdr.detectChanges();
          this.loadPatientsModuleData();
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.message || 'No se pudo registrar el paciente';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  clearForm(): void {
    this.editingId = null;
    this.formVisible = false;
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

  goToTratamientos(patientId: number): void {
    this.router.navigate(['/tratamientos', patientId]);
  }

  goToFinance(patientId: number): void {
    this.router.navigate(['/finance'], { queryParams: { pacienteId: patientId } });
  }

  getControl(controlName: string): AbstractControl | null {
    return this.patientForm.get(controlName);
  }

  hasError(controlName: string): boolean {
    const control = this.getControl(controlName);
    return !!(control && control.invalid && control.touched);
  }

  getErrorMessage(controlName: string): string {
    const control = this.getControl(controlName);

    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) return 'Este campo es obligatorio.';
    if (control.errors['email']) return 'Ingresa un correo válido.';
    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    }
    if (control.errors['maxlength']) {
      return `No puede superar ${control.errors['maxlength'].requiredLength} caracteres.`;
    }

    if (controlName === 'nombre' || controlName === 'apellido') {
      if (control.errors['pattern']) return 'Solo se permiten letras y espacios.';
    }

    if (controlName === 'documento') {
      if (control.errors['pattern']) return 'El documento solo debe contener números.';
    }

    if (controlName === 'telefono') {
      if (control.errors['pattern']) return 'El teléfono solo debe contener números.';
    }

    if (controlName === 'eps') {
      if (control.errors['pattern']) return 'La EPS contiene caracteres no válidos.';
    }

    if (controlName === 'fechaNacimiento') {
      if (control.errors['futureDate']) return 'La fecha de nacimiento no puede ser futura.';
      if (control.errors['invalidAgeRange']) return 'La edad debe estar entre 0 y 120 años.';
      if (control.errors['invalidDate']) return 'La fecha ingresada no es válida.';
    }

    return 'Campo inválido.';
  }

  getPatientAge(): number | null {
    const birthDate = this.patientForm.get('fechaNacimiento')?.value;
    if (!birthDate) return null;

    const date = new Date(`${birthDate}T00:00:00`);
    if (isNaN(date.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    return age;
  }

  private buildPayload(): PatientPayload {
    const raw = this.patientForm.getRawValue();

    return {
      nombre: this.cleanRequiredText(raw.nombre),
      apellido: this.cleanRequiredText(raw.apellido),
      documento: this.cleanRequiredNumericText(raw.documento),
      fechaNacimiento: raw.fechaNacimiento || '',
      telefono: this.cleanOptionalNumericText(raw.telefono),
      correo: this.cleanOptionalEmail(raw.correo),
      direccion: this.cleanOptionalText(raw.direccion),
      eps: this.cleanOptionalText(raw.eps),
      alergias: this.cleanOptionalText(raw.alergias),
      observaciones: this.cleanOptionalText(raw.observaciones),
    };
  }

  private cleanRequiredText(value: string | null | undefined): string {
    return (value ?? '').toString().trim().replace(/\s+/g, ' ');
  }

  private cleanOptionalText(value: string | null | undefined): string {
    return (value ?? '').toString().trim().replace(/\s+/g, ' ');
  }

  private cleanRequiredNumericText(value: string | null | undefined): string {
    return (value ?? '').toString().replace(/\D/g, '');
  }

  private cleanOptionalNumericText(value: string | null | undefined): string {
    return (value ?? '').toString().replace(/\D/g, '');
  }

  private cleanOptionalEmail(value: string | null | undefined): string {
    return (value ?? '').toString().trim().toLowerCase();
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private noFutureDateValidator(): ValidatorFn {
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

      if (inputDate > today) {
        return { futureDate: true };
      }

      return null;
    };
  }

  private ageRangeValidator(minAge: number, maxAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const birthDate = new Date(`${control.value}T00:00:00`);

      if (isNaN(birthDate.getTime())) {
        return { invalidDate: true };
      }

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < minAge || age > maxAge) {
        return { invalidAgeRange: true };
      }

      return null;
    };
  }
}
