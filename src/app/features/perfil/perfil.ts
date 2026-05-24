import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Navbar } from '../complements/navbar/navbar';
import { Footer } from '../complements/footer/footer';
import { AuthService } from '../authentication/service/auth-service/auth.service';

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const nueva = group.get('newPassword')?.value;
  const confirmar = group.get('confirmPassword')?.value;
  return nueva && confirmar && nueva !== confirmar ? { mismatch: true } : null;
};

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar, Footer],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css'],
})
export class Perfil implements OnInit, OnDestroy {
  user: any = null;
  passwordForm: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatchValidator },
    );
  }

  ngOnInit(): void {
    this.authService.getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.user = res.data;
          this.cdr.detectChanges();
        },
        error: () => {
          this.router.navigate(['/dashboard']);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);
  }

  get rolLabel(): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrador',
      ODONTOLOGO: 'Odontólogo',
      AUXILIAR: 'Auxiliar',
      RECEPCION: 'Recepción',
    };
    return labels[this.user?.rol] ?? this.user?.rol ?? '';
  }

  formatDate(value: string): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('es-CO', { dateStyle: 'long' });
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.authService.changeOwnPassword(currentPassword, newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.setSuccess(res?.message || 'Contraseña actualizada correctamente');
          this.passwordForm.reset();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'No se pudo actualizar la contraseña';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.passwordForm.get(field);
    return !!(ctrl?.touched && ctrl?.hasError(error));
  }
}
