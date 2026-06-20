import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Navbar } from '../complements/navbar/navbar';
import { Footer } from '../complements/footer/footer';
import { AdminService, ExportConfig, HealthStatus, SystemConfig, UserRow } from './admin.service';
import { ExportService } from '../../services/export.service';
import { AuthService } from '../authentication/service/auth-service/auth.service';
import { fechaHoyCol } from '../../utils/date.utils';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Navbar, Footer],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit, OnDestroy {
  // ── Estado del sistema ─────────────────────────────────────────────────────
  health: HealthStatus | null = null;
  healthLoading = true;

  // ── Configuración de exportación ───────────────────────────────────────────
  pacientes    = { incluir: true,  soloActivos: false };
  movimientos  = { incluir: true,  fechaDesde: '', fechaHasta: '', estado: '' };
  citas        = { incluir: true,  fechaDesde: '', fechaHasta: '', estado: '' };
  tratamientos = { incluir: true,  soloActivos: false };

  readonly ESTADOS_MOVIMIENTO = ['PENDIENTE', 'PAGADO', 'CANCELADO'];
  readonly ESTADOS_CITA       = ['PROGRAMADA', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA'];

  exportLoading  = false;
  exportError    = '';
  exportSuccess  = '';
  lastExportDate = (() => { try { return localStorage.getItem('biodont_last_export'); } catch { return null; } })();

  // ── Gestión de usuarios ───────────────────────────────────────────────────
  users: UserRow[] = [];
  usersLoading  = false;
  usersError    = '';
  savingRoleId:   number | null = null;
  savingStatusId: number | null = null;
  filtroEstadoUsuario: 'todos' | 'activos' | 'inactivos' = 'todos';
  /** id del usuario actualmente autenticado — no puede modificarse a sí mismo */
  currentUserId: number | null = null;

  get filteredUsers(): UserRow[] {
    if (this.filtroEstadoUsuario === 'activos')   return this.users.filter(u => u.activo);
    if (this.filtroEstadoUsuario === 'inactivos') return this.users.filter(u => !u.activo);
    return this.users;
  }

  get countActivos():   number { return this.users.filter(u =>  u.activo).length; }
  get countInactivos(): number { return this.users.filter(u => !u.activo).length; }

  readonly ROLES = ['ADMIN', 'ODONTOLOGO', 'AUXILIAR', 'RECEPCION'] as const;
  readonly ROLE_LABELS: Record<string, string> = {
    ADMIN:      'Administrador',
    ODONTOLOGO: 'Odontólogo',
    AUXILIAR:   'Auxiliar',
    RECEPCION:  'Recepción',
  };

  // ── Crear usuario ─────────────────────────────────────────────────────────
  newUserFormVisible = false;
  newUserForm: FormGroup;
  newUserLoading  = false;
  newUserError    = '';
  newUserSuccess  = '';

  // ── Cambio de contraseña ──────────────────────────────────────────────────
  pwdModalUser: UserRow | null = null;
  pwdNueva     = '';
  pwdConfirm   = '';
  pwdLoading   = false;
  pwdError     = '';
  pwdSuccess   = '';
  pwdShow      = false;

  // ── Configuración del sistema ─────────────────────────────────────────────
  config: SystemConfig = { indicativoPais: '57', whatsappClinica: '' };
  configLoading  = false;
  configSaving   = false;
  configError    = '';
  configSuccess  = '';
  configIndicativo = '57';
  configWhatsapp   = '';

  // ── Backup / Restore ─────────────────────────────────────────────────────
  backupLoading  = false;
  backupError    = '';
  lastBackupDate = (() => { try { return localStorage.getItem('biodont_last_backup'); } catch { return null; } })();

  restoreFile:    File | null = null;
  restoreLoading  = false;
  restoreError    = '';
  restoreSuccess  = '';
  private restoreTimer: ReturnType<typeof setTimeout> | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private exportService: ExportService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
  ) {
    const passwordMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
      const pwd     = group.get('password')?.value;
      const confirm = group.get('confirmarPassword')?.value;
      return pwd && confirm && pwd !== confirm ? { passwordMismatch: true } : null;
    };

    this.newUserForm = this.fb.group({
      nombre:            ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/)]],
      apellido:          ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/)]],
      correo:            ['', [Validators.required, Validators.email]],
      password:          ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72), Validators.pattern(/^(?=.*[a-zA-Z])(?=.*\d).+$/)]],
      confirmarPassword: ['', Validators.required],
      rol:               ['RECEPCION', Validators.required],
      telefono:          ['', [Validators.pattern(/^[0-9]+$/), Validators.minLength(7), Validators.maxLength(15)]],
      documento:         ['', [Validators.pattern(/^[0-9]+$/), Validators.minLength(4), Validators.maxLength(15)]],
    }, { validators: passwordMatch });
  }

  ngOnInit(): void {
    this.currentUserId = this.authService.getUser()?.id ?? null;
    this.checkHealth();
    this.loadUsers();
    this.loadConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.restoreTimer) clearTimeout(this.restoreTimer);
  }

  // ── Sistema ────────────────────────────────────────────────────────────────

  checkHealth(): void {
    this.healthLoading = true;
    this.adminService.checkHealth().pipe(takeUntil(this.destroy$)).subscribe({
      next: (h) => {
        this.health = h;
        this.healthLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.health = { status: 'error', db: 'disconnected' };
        this.healthLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get healthLabel(): string {
    if (this.healthLoading) return 'Verificando...';
    if (!this.health || this.health.status === 'error') return 'Sin conexión';
    return 'Conectado';
  }

  get healthClass(): string {
    if (this.healthLoading) return 'health--checking';
    if (!this.health || this.health.status === 'error') return 'health--error';
    return 'health--ok';
  }

  // ── Exportación ───────────────────────────────────────────────────────────

  get ningunaSeleccionada(): boolean {
    return !this.pacientes.incluir && !this.movimientos.incluir &&
           !this.citas.incluir    && !this.tratamientos.incluir;
  }

  seleccionarTodo(): void {
    this.pacientes.incluir    = true;
    this.movimientos.incluir  = true;
    this.citas.incluir        = true;
    this.tratamientos.incluir = true;
  }

  exportar(): void {
    if (this.ningunaSeleccionada || this.exportLoading) return;

    if (this.movimientos.incluir && this.movimientos.fechaDesde && this.movimientos.fechaHasta
        && this.movimientos.fechaDesde > this.movimientos.fechaHasta) {
      this.exportError = 'El rango de fechas de movimientos es inválido: "Desde" debe ser anterior a "Hasta"';
      return;
    }
    if (this.citas.incluir && this.citas.fechaDesde && this.citas.fechaHasta
        && this.citas.fechaDesde > this.citas.fechaHasta) {
      this.exportError = 'El rango de fechas de citas es inválido: "Desde" debe ser anterior a "Hasta"';
      return;
    }

    this.exportLoading = true;
    this.exportError   = '';
    this.exportSuccess = '';
    this.cdr.detectChanges();

    const config: ExportConfig = {
      pacientes:    this.pacientes.incluir    ? { ...this.pacientes }    : undefined,
      movimientos:  this.movimientos.incluir  ? { ...this.movimientos }  : undefined,
      citas:        this.citas.incluir        ? { ...this.citas }        : undefined,
      tratamientos: this.tratamientos.incluir ? { ...this.tratamientos } : undefined,
    };

    this.adminService.exportar(config).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.exportService.descargar(res.data);
        const total = res.data.hojas.reduce((s, h) => s + h.total, 0);
        this.exportSuccess = total > 0
          ? `Archivo generado con ${total} registro(s) en ${res.data.hojas.length} hoja(s).`
          : `Archivo generado — ningún registro coincide con los filtros aplicados.`;
        this.lastExportDate = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        try { localStorage.setItem('biodont_last_export', this.lastExportDate!); } catch { /* storage unavailable */ }
        this.exportLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.exportError   = err?.error?.message ?? 'No se pudo generar el archivo';
        this.exportLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Gestión de usuarios ───────────────────────────────────────────────────

  loadUsers(): void {
    this.usersLoading = true;
    this.usersError   = '';
    this.adminService.listUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.users = res.data;
        this.usersLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.usersError   = err?.error?.message ?? 'No se pudo cargar la lista de usuarios';
        this.usersLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  changeRole(user: UserRow, nuevoRol: string): void {
    if (user.rol === nuevoRol || this.savingRoleId === user.id) return;
    this.savingRoleId = user.id;
    this.adminService.updateUserRole(user.id, nuevoRol).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) this.users[idx].rol = res.data.rol;
        this.savingRoleId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingRoleId = null;
        this.cdr.detectChanges();
      },
    });
  }

  toggleStatus(user: UserRow): void {
    if (this.savingStatusId === user.id) return;
    this.savingStatusId = user.id;
    this.adminService.updateUserStatus(user.id, !user.activo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) this.users[idx].activo = res.data.activo;
        this.savingStatusId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingStatusId = null;
        this.cdr.detectChanges();
      },
    });
  }

  abrirNuevoUsuario(): void {
    this.newUserFormVisible = true;
    this.newUserError  = '';
    this.newUserSuccess = '';
    this.newUserForm.reset({ rol: 'RECEPCION', confirmarPassword: '' });
  }

  cerrarNuevoUsuario(): void {
    this.newUserFormVisible = false;
    this.newUserForm.reset({ rol: 'RECEPCION', confirmarPassword: '' });
  }

  crearUsuario(): void {
    if (this.newUserForm.invalid || this.newUserLoading) {
      this.newUserForm.markAllAsTouched();
      return;
    }
    this.newUserLoading = true;
    this.newUserError   = '';
    this.newUserSuccess = '';
    this.cdr.detectChanges();

    const raw = this.newUserForm.getRawValue();
    const payload = {
      nombre:    raw.nombre.trim(),
      apellido:  raw.apellido.trim(),
      correo:    raw.correo.trim().toLowerCase(),
      password:  raw.password,
      rol:       raw.rol,
      telefono:  raw.telefono?.trim() || undefined,
      documento: raw.documento?.trim() || undefined,
    };

    this.adminService.createUser(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.users = [...this.users, res.data];
        this.newUserSuccess = `Usuario ${res.data.nombre} ${res.data.apellido} creado correctamente.`;
        this.newUserLoading = false;
        this.newUserForm.reset({ rol: 'RECEPCION', confirmarPassword: '' });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.newUserError   = err?.error?.message ?? 'No se pudo crear el usuario';
        this.newUserLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Cambio de contraseña ──────────────────────────────────────────────────

  abrirCambioPassword(user: UserRow): void {
    this.pwdModalUser = user;
    this.pwdNueva     = '';
    this.pwdConfirm   = '';
    this.pwdError     = '';
    this.pwdSuccess   = '';
    this.pwdShow      = false;
    this.pwdLoading   = false;
    this.cdr.detectChanges();
  }

  cerrarCambioPassword(): void {
    this.pwdModalUser = null;
    this.cdr.detectChanges();
  }

  private readonly PWD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/;

  get pwdValida(): boolean {
    return this.pwdNueva.length >= 8 &&
           this.pwdNueva.length <= 72 &&
           this.PWD_REGEX.test(this.pwdNueva) &&
           this.pwdNueva === this.pwdConfirm;
  }

  get pwdFormatoInvalido(): boolean {
    return this.pwdNueva.length >= 8 && !this.PWD_REGEX.test(this.pwdNueva);
  }

  guardarPassword(): void {
    if (!this.pwdValida || !this.pwdModalUser || this.pwdLoading) return;
    this.pwdLoading = true;
    this.pwdError   = '';
    this.pwdSuccess = '';
    this.cdr.detectChanges();

    this.adminService.changeUserPassword(this.pwdModalUser.id, this.pwdNueva).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.pwdSuccess = res.message;
        this.pwdNueva   = '';
        this.pwdConfirm = '';
        this.pwdLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pwdError   = err?.error?.message ?? 'No se pudo actualizar la contraseña';
        this.pwdLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Configuración del sistema ─────────────────────────────────────────────

  loadConfig(): void {
    this.configLoading = true;
    this.adminService.getConfig().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.config = res.data;
        this.configIndicativo = res.data.indicativoPais;
        this.configWhatsapp   = res.data.whatsappClinica;
        this.configLoading    = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.configLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  filtrarSoloDigitos(event: Event, campo: 'configIndicativo' | 'configWhatsapp'): void {
    const input = event.target as HTMLInputElement;
    const soloDigitos = input.value.replace(/\D/g, '');
    input.value = soloDigitos;
    this[campo] = soloDigitos;
  }

  guardarConfig(): void {
    const indicativo = this.configIndicativo.trim();
    if (!/^\d{1,4}$/.test(indicativo)) {
      this.configError = 'El indicativo debe contener entre 1 y 4 dígitos numéricos';
      return;
    }
    if (this.configSaving) return;

    this.configSaving  = true;
    this.configError   = '';
    this.configSuccess = '';
    this.cdr.detectChanges();

    this.adminService.updateConfig({
      indicativoPais:  indicativo,
      whatsappClinica: this.configWhatsapp.trim(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.config         = res.data;
        this.configSuccess  = 'Configuración guardada correctamente';
        this.configSaving   = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.configError  = err?.error?.message ?? 'No se pudo guardar la configuración';
        this.configSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Backup / Restore ─────────────────────────────────────────────────────

  descargarBackup(): void {
    if (this.backupLoading) return;
    this.backupLoading = true;
    this.backupError   = '';
    this.cdr.detectChanges();

    this.adminService.downloadBackup().pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `biodont_backup_${fechaHoyCol()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        this.lastBackupDate = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        try { localStorage.setItem('biodont_last_backup', this.lastBackupDate!); } catch { /* storage unavailable */ }
        this.backupLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.backupError   = err?.error?.message ?? 'No se pudo descargar el backup';
        this.backupLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onRestoreFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.restoreFile   = file;
    this.restoreError  = '';
    this.restoreSuccess = '';
    this.cdr.detectChanges();
  }

  confirmarRestore(): void {
    if (!this.restoreFile || this.restoreLoading) return;
    this.restoreLoading = true;
    this.restoreError   = '';
    this.restoreSuccess = '';
    this.cdr.detectChanges();

    this.adminService.restoreBackup(this.restoreFile).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.restoreSuccess = res.message + ' La página se recargará en 3 segundos.';
        this.restoreFile    = null;
        this.restoreLoading = false;
        this.cdr.detectChanges();
        this.restoreTimer = setTimeout(() => window.location.reload(), 3000);
      },
      error: (err) => {
        this.restoreError   = err?.error?.message ?? 'No se pudo restaurar la base de datos';
        this.restoreLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
