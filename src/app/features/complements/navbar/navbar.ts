import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../authentication/service/auth-service/auth.service';
import { PatientsService, PatientRow } from '../../user/service/pacientes.service';
import { NotificacionesService, NotificacionesData } from '../../../services/notificaciones.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit, OnDestroy {
  @Input() patientName: string = 'Paciente Demo';

  userName: string = 'Usuario';
  userRole: string = 'Sin rol';
  avatarLetter: string = 'U';

  patients: PatientRow[] = [];
  historiaDropdownOpen = false;
  historiaSearch = '';

  get filteredHistoriaPatients(): PatientRow[] {
    const term = this.historiaSearch.trim().toLowerCase();
    const base = term
      ? this.patients.filter(p => p.nombreCompleto.toLowerCase().includes(term))
      : this.patients;
    return base.slice(0, 8);
  }

  // ── Notificaciones ─────────────────────────────────────────────────────────
  notifPanelOpen = false;
  notifLoading = false;
  notifCrearVisible = false;
  notifCrearError = '';
  tipoCreacion: 'general' | 'programada' = 'general';
  notificaciones: NotificacionesData | null = null;
  notifForm: FormGroup;
  manualesSkip = 0;
  cargandoMas = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private patientsService: PatientsService,
    private notifService: NotificacionesService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.notifForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(100)]],
      mensaje: ['', [Validators.required, Validators.maxLength(500)]],
      tipo: ['GLOBAL', Validators.required],
      programadaPara: [null],
    });
  }

  get totalNoLeidas(): number {
    return this.notificaciones?.totalNoLeidas ?? 0;
  }

  get minFechaPrograma(): string {
    const d = new Date(Date.now() + 60000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      const fullName = `${user.nombre || ''} ${user.apellido || ''}`.trim();
      this.userName = fullName || 'Usuario';
      this.userRole = this.formatRole(user.rol);
      this.avatarLetter = (user.nombre?.charAt(0) || 'U').toUpperCase();
    }

    this.patientsService.getPatients({ soloActivos: true }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.patients = res.data; this.cdr.detectChanges(); },
      error: () => {},
    });

    this.cargarNotificaciones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarNotificaciones(): void {
    this.manualesSkip = 0;
    this.cargandoMas = false;
    this.notifLoading = true;
    this.cdr.detectChanges();
    this.notifService.getAll(0).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.notificaciones = res.data;
        this.notifLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notifLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  cargarMasManuales(): void {
    if (!this.notificaciones?.hayMasManuales || this.cargandoMas) return;
    this.manualesSkip += 5;
    this.cargandoMas = true;
    this.cdr.detectChanges();
    this.notifService.getAll(this.manualesSkip).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (this.notificaciones) {
          this.notificaciones.manuales = [...this.notificaciones.manuales, ...res.data.manuales];
          this.notificaciones.hayMasManuales = res.data.hayMasManuales;
          this.notificaciones.totalNoLeidas = res.data.totalNoLeidas;
        }
        this.cargandoMas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.manualesSkip -= 5;
        this.cargandoMas = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleNotifPanel(): void {
    this.notifPanelOpen = !this.notifPanelOpen;
    if (this.notifPanelOpen) {
      this.historiaDropdownOpen = false;
      this.cargarNotificaciones();
    } else {
      this.cerrarFormCrear();
    }
  }

  toggleCrear(): void {
    this.notifCrearVisible = !this.notifCrearVisible;
    if (!this.notifCrearVisible) this.cerrarFormCrear();
  }

  private cerrarFormCrear(): void {
    this.notifCrearVisible = false;
    this.tipoCreacion = 'general';
    this.notifCrearError = '';
    this.notifForm.reset({ tipo: 'GLOBAL', programadaPara: null });
  }

  marcarLeida(id: number): void {
    const n = this.notificaciones?.manuales.find(m => m.id === id);
    if (!n || n.leida) return;
    this.notifService.marcarLeida(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (this.notificaciones) {
          n.leida = true;
          this.notificaciones.totalNoLeidas = Math.max(0, this.notificaciones.totalNoLeidas - 1);
          this.cdr.detectChanges();
        }
      },
      error: () => {},
    });
  }

  eliminarNotif(id: number): void {
    this.notifService.eliminar(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.cargarNotificaciones(); },
      error: () => {},
    });
  }

  descartarAuto(clave: string): void {
    this.notifService.descartar(clave).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (this.notificaciones) {
          this.notificaciones.auto = this.notificaciones.auto.filter(a => a.clave !== clave);
          this.notificaciones.totalNoLeidas = Math.max(0, this.notificaciones.totalNoLeidas - 1);
          this.cdr.detectChanges();
        }
      },
      error: () => {},
    });
  }

  crearNotificacion(): void {
    if (this.notifForm.invalid) {
      this.notifForm.markAllAsTouched();
      return;
    }
    const val = this.notifForm.getRawValue();
    if (this.tipoCreacion === 'programada' && !val.programadaPara) {
      const ctrl = this.notifForm.get('programadaPara')!;
      ctrl.setErrors({ required: true });
      ctrl.markAsTouched();
      return;
    }
    const payload: Parameters<typeof this.notifService.create>[0] = {
      titulo: val.titulo,
      mensaje: val.mensaje,
      tipo: val.tipo,
    };
    if (this.tipoCreacion === 'programada' && val.programadaPara) {
      payload.programadaPara = new Date(val.programadaPara).toISOString();
    }
    this.notifService.create(payload)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.cerrarFormCrear();
          this.cargarNotificaciones();
        },
        error: (err: any) => {
          this.notifCrearError = err?.error?.message || 'No se pudo crear la notificación';
          this.cdr.detectChanges();
        },
      });
  }

  toggleHistoriaDropdown(): void {
    this.historiaDropdownOpen = !this.historiaDropdownOpen;
    if (this.historiaDropdownOpen) {
      this.notifPanelOpen = false;
      this.historiaSearch = '';
    }
  }

  navigateToHistoria(pacienteId: number): void {
    this.historiaDropdownOpen = false;
    this.historiaSearch = '';
    this.router.navigate(['/history', pacienteId]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-historia-wrapper')) this.historiaDropdownOpen = false;
    if (!target.closest('.notif-wrapper')) {
      this.notifPanelOpen = false;
      this.cerrarFormCrear();
    }
  }

  goToPerfil(): void {
    this.router.navigate(['/perfil']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private formatRole(role: string): string {
    const normalized = String(role || '').toUpperCase();
    switch (normalized) {
      case 'ADMIN':      return 'Administrador';
      case 'ODONTOLOGO': return 'Odontólogo';
      case 'AUXILIAR':   return 'Auxiliar';
      case 'RECEPCION':  return 'Recepción';
      default:           return role || 'Sin rol';
    }
  }
}
