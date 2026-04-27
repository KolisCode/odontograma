import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../complements/navbar/navbar';
import { Footer } from '../complements/footer/footer';
import { AdminService, ExportConfig, HealthStatus, UserRow } from './admin.service';
import { ExportService } from '../../services/export.service';
import { AuthService } from '../authentication/service/auth-service/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Footer],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit {
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
  lastExportDate = localStorage.getItem('biodont_last_export') ?? null;

  // ── Gestión de usuarios ───────────────────────────────────────────────────
  users: UserRow[] = [];
  usersLoading  = false;
  usersError    = '';
  savingRoleId:   number | null = null;
  savingStatusId: number | null = null;
  /** id del usuario actualmente autenticado — no puede modificarse a sí mismo */
  currentUserId: number | null = null;

  readonly ROLES = ['ADMIN', 'ODONTOLOGO', 'AUXILIAR', 'RECEPCION'] as const;
  readonly ROLE_LABELS: Record<string, string> = {
    ADMIN:      'Administrador',
    ODONTOLOGO: 'Odontólogo',
    AUXILIAR:   'Auxiliar',
    RECEPCION:  'Recepción',
  };

  // ── Cambio de contraseña ──────────────────────────────────────────────────
  pwdModalUser: UserRow | null = null;
  pwdNueva     = '';
  pwdConfirm   = '';
  pwdLoading   = false;
  pwdError     = '';
  pwdSuccess   = '';
  pwdShow      = false;

  // ── Backup / Restore ─────────────────────────────────────────────────────
  backupLoading  = false;
  backupError    = '';
  lastBackupDate = localStorage.getItem('biodont_last_backup') ?? null;

  restoreFile:    File | null = null;
  restoreLoading  = false;
  restoreError    = '';
  restoreSuccess  = '';

  constructor(
    private adminService: AdminService,
    private exportService: ExportService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUser()?.id ?? null;
    this.checkHealth();
    this.loadUsers();
  }

  // ── Sistema ────────────────────────────────────────────────────────────────

  checkHealth(): void {
    this.healthLoading = true;
    this.adminService.checkHealth().subscribe({
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

    this.adminService.exportar(config).subscribe({
      next: (res) => {
        this.exportService.descargar(res.data);
        const total = res.data.hojas.reduce((s, h) => s + h.total, 0);
        this.exportSuccess = total > 0
          ? `Archivo generado con ${total} registro(s) en ${res.data.hojas.length} hoja(s).`
          : `Archivo generado — ningún registro coincide con los filtros aplicados.`;
        this.lastExportDate = new Date().toLocaleString('es-CO');
        localStorage.setItem('biodont_last_export', this.lastExportDate);
        this.exportLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
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
    this.adminService.listUsers().subscribe({
      next: (res) => {
        this.users = res.data;
        this.usersLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.usersError   = err?.error?.message ?? 'No se pudo cargar la lista de usuarios';
        this.usersLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  changeRole(user: UserRow, nuevoRol: string): void {
    if (user.rol === nuevoRol || this.savingRoleId === user.id) return;
    this.savingRoleId = user.id;
    this.adminService.updateUserRole(user.id, nuevoRol).subscribe({
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
    this.adminService.updateUserStatus(user.id, !user.activo).subscribe({
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

  // ── Cambio de contraseña ──────────────────────────────────────────────────

  abrirCambioPassword(user: UserRow): void {
    this.pwdModalUser = user;
    this.pwdNueva     = '';
    this.pwdConfirm   = '';
    this.pwdError     = '';
    this.pwdSuccess   = '';
    this.pwdShow      = false;
    this.pwdLoading   = false;
  }

  cerrarCambioPassword(): void {
    this.pwdModalUser = null;
  }

  get pwdValida(): boolean {
    return this.pwdNueva.length >= 8 && this.pwdNueva === this.pwdConfirm;
  }

  guardarPassword(): void {
    if (!this.pwdValida || !this.pwdModalUser || this.pwdLoading) return;
    this.pwdLoading = true;
    this.pwdError   = '';
    this.pwdSuccess = '';
    this.cdr.detectChanges();

    this.adminService.changeUserPassword(this.pwdModalUser.id, this.pwdNueva).subscribe({
      next: (res) => {
        this.pwdSuccess = res.message;
        this.pwdNueva   = '';
        this.pwdConfirm = '';
        this.pwdLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.pwdError   = err?.error?.message ?? 'No se pudo actualizar la contraseña';
        this.pwdLoading = false;
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

    this.adminService.downloadBackup().subscribe({
      next: (blob) => {
        const fecha = new Date().toISOString().substring(0, 10);
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `biodont_backup_${fecha}.db`;
        a.click();
        URL.revokeObjectURL(url);
        this.lastBackupDate = new Date().toLocaleString('es-CO');
        localStorage.setItem('biodont_last_backup', this.lastBackupDate);
        this.backupLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
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

    this.adminService.restoreBackup(this.restoreFile).subscribe({
      next: (res) => {
        this.restoreSuccess = res.message + ' La página se recargará en 3 segundos.';
        this.restoreFile    = null;
        this.restoreLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => window.location.reload(), 3000);
      },
      error: (err: any) => {
        this.restoreError   = err?.error?.message ?? 'No se pudo restaurar la base de datos';
        this.restoreLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
