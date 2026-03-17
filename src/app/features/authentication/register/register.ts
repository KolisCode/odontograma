import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../service/auth-service/auth.service';
import { Footer } from "../../complements/footer/footer";

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;

  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Footer],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  registerForm: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.registerForm = this.fb.group(
      {
        nombre: ['', Validators.required],
        correo: ['', [Validators.required, Validators.email]],
        rol: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: passwordMatchValidator }
    );
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const { nombre, correo, rol, password } = this.registerForm.value;

    this.authService.register({ nombre, correo, rol, password }).subscribe({
      next: (resp) => {
        this.successMessage = resp.message || 'Cuenta creada correctamente.';
        this.registerForm.reset();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo crear la cuenta.';
        this.loading = false;
      }
    });
  }
}
