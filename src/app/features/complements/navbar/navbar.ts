import { CommonModule } from '@angular/common';
import { encodeId } from '../../../shared/ids';
import { ChangeDetectorRef, Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../authentication/service/auth-service/auth.service';
import { PatientsService, PatientRow } from '../../user/service/pacientes.service';
import { NotificacionesService, NotificacionesData } from '../../../services/notificaciones.service';
import { fechaHoyCol } from '../../../utils/date.utils';

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
  globalSearchOpen = false;
  globalSearch = '';
  expandedResultId: number | null = null;

  readonly SEARCH_LIMIT = 6;

  get filteredGlobalPatients(): PatientRow[] {
    const term = this.globalSearch.trim().toLowerCase();
    if (!term) return [];
    return this.patients.filter(p =>
      p.nombreCompleto.toLowerCase().includes(term) ||
      p.documento.includes(term)
    ).slice(0, this.SEARCH_LIMIT);
  }

  get globalSearchTotal(): number {
    const term = this.globalSearch.trim().toLowerCase();
    if (!term) return 0;
    return this.patients.filter(p =>
      p.nombreCompleto.toLowerCase().includes(term) ||
      p.documento.includes(term)
    ).length;
  }

  // ── Notificaciones ─────────────────────────────────────────────────────────
  notifPanelOpen = false;
  notifLoading = false;
  notifCrearVisible = false;
  notifCrearError = '';
  creandoNotif = false;
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
      titulo: ['', [Validators.required, Validators.maxLength(120)]],
      mensaje: ['', [Validators.required, Validators.maxLength(500)]],
      tipo: ['GLOBAL', Validators.required],
      programadaPara: [null],
    });
  }

  get totalNoLeidas(): number {
    return this.notificaciones?.totalNoLeidas ?? 0;
  }

  get minFechaPrograma(): string {
    // Usa Colombia explícitamente para que el campo datetime-local muestre
    // el mínimo correcto sin importar la zona horaria del navegador.
    const ahora = new Date(Date.now() + 60_000);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(ahora);
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return `${p['year']}-${p['month']}-${p['day']}T${p['hour']}:${p['minute']}`;
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
      error: () => { /* lista de pacientes no disponible — búsqueda en navbar deshabilitada */ },
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
      this.closeGlobalSearch();
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
    if (!n || n.leida || n.tipo === 'GLOBAL') return;
    this.notifService.marcarLeida(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (this.notificaciones) {
          n.leida = true;
          this.notificaciones.totalNoLeidas = Math.max(0, this.notificaciones.totalNoLeidas - 1);
          this.cdr.detectChanges();
        }
      },
      error: () => { this.cargarNotificaciones(); },
    });
  }

  eliminarNotif(id: number): void {
    this.notifService.eliminar(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.cargarNotificaciones(); },
      error: () => { this.cargarNotificaciones(); },
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
      error: () => { this.cargarNotificaciones(); },
    });
  }

  crearNotificacion(): void {
    if (this.creandoNotif) return;
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
      payload.programadaPara = new Date(val.programadaPara + ':00-05:00').toISOString();
    }
    this.creandoNotif = true;
    this.notifService.create(payload)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.creandoNotif = false;
          this.cerrarFormCrear();
          this.cargarNotificaciones();
        },
        error: (err: any) => {
          this.creandoNotif = false;
          this.notifCrearError = err?.error?.message || 'No se pudo crear la notificación';
          this.cdr.detectChanges();
        },
      });
  }

  openGlobalSearch(): void {
    this.globalSearchOpen = true;
    this.notifPanelOpen = false;
    this.expandedResultId = null;
  }

  closeGlobalSearch(): void {
    this.globalSearchOpen = false;
    this.globalSearch = '';
    this.expandedResultId = null;
  }

  toggleResultMenu(id: number): void {
    this.expandedResultId = this.expandedResultId === id ? null : id;
  }

  navigateGlobal(patient: PatientRow, dest: 'historia' | 'odontograma' | 'citas' | 'cartera'): void {
    this.closeGlobalSearch();
    const enc = encodeId(patient.id);
    switch (dest) {
      case 'historia':    this.router.navigate(['/history', enc]); break;
      case 'odontograma': this.router.navigate(['/odontogram', enc]); break;
      case 'citas':       this.router.navigate(['/appointments']); break;
      case 'cartera':     this.router.navigate(['/finance'], { queryParams: { pacienteId: enc } }); break;
    }
  }

  goToPatientSearch(): void {
    const term = this.globalSearch.trim();
    this.closeGlobalSearch();
    this.router.navigate(['/patients'], { queryParams: term ? { search: term } : {} });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-search-wrapper')) this.closeGlobalSearch();
    if (!target.closest('.notif-wrapper')) {
      this.notifPanelOpen = false;
      this.cerrarFormCrear();
    }
  }

  goToPerfil(): void {
    this.router.navigate(['/perfil']);
  }

  logout(): void {
    this.authService.logoutFromServer()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        complete: () => { this.router.navigate(['/login']); },
        error:    () => { this.router.navigate(['/login']); },
      });
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
