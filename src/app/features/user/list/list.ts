import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { encodeId } from '../../../shared/ids';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { calcularEdad as calcEdad, formatDateForInput as fmtDate, medianocheColUTC, fechaHoyCol } from '../../../utils/date.utils';
import { ImportParserService, ParsedRow } from '../../../services/import-parser.service';
import { ImportResult } from '../service/pacientes.service';
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
  PaginaMeta,
} from '../service/pacientes.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, Navbar, Footer],
  templateUrl: './list.html',
  styleUrls: ['./list.css'],
})
export class List implements OnInit, OnDestroy {
  patientForm: FormGroup;

  formVisible = false;
  asideVisible = false;
  loading = false;
  tableLoading = false;
  errorMessage = '';
  successMessage = '';
  editingId: number | null = null;

  filteredPatients: PatientRow[] = [];
  searchTerm = '';
  mostrarInactivos = false;
  recentPatients: RecentPatient[] = [];
  paginaMeta: PaginaMeta | null = null;
  currentPage = 1;
  readonly PAGE_SIZE = 25;
  private _searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private _successTimer: ReturnType<typeof setTimeout> | null = null;
  private destroy$ = new Subject<void>();

  // ── Dropdown de módulos por fila ──────────────────────────────────────────
  openDropdownId: number | null = null;
  dropdownTop = 0;
  dropdownLeft = 0;

  @HostListener('document:click')
  closeAllDropdowns(): void {
    this.openDropdownId = null;
  }

  toggleDropdown(patientId: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openDropdownId === patientId) {
      this.openDropdownId = null;
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dropdownTop = rect.bottom + 4;
    this.dropdownLeft = rect.left;
    this.openDropdownId = patientId;
  }

  // ── Toggle activo / inactivo ──────────────────────────────────────────────
  toggleActivoTarget: PatientRow | null = null;
  toggleActivoPendientes: { movimientosPendientes: number; odontogramasActivos: number; tratamientosActivos: number } | null = null;
  toggleActivoLoading = false;
  toggleActivoError = '';

  recomputeFilter(): void {
    if (this._searchDebounce) clearTimeout(this._searchDebounce);
    this._searchDebounce = setTimeout(() => {
      this.currentPage = 1;
      this.loadPatients();
    }, 300);
  }

  onFiltroInactivosChange(): void {
    this.currentPage = 1;
    this.loadPatients();
  }

  prevPage(): void {
    if (this.currentPage > 1) { this.currentPage--; this.loadPatients(); }
  }

  nextPage(): void {
    if (this.paginaMeta && this.currentPage < this.paginaMeta.totalPages) {
      this.currentPage++;
      this.loadPatients();
    }
  }

  trackById(_index: number, item: { id: number }): number { return item.id; }
  trackByField(_index: number, entry: { field: string }): string { return entry.field; }
  trackByIndex(index: number): number { return index; }

  calcularEdad(fechaNacimiento: string | null): number | null {
    return calcEdad(fechaNacimiento);
  }
  quickInfo: QuickInfo = {
    alergiasRegistradas: 0,
    pacientesNuevosMes: 0,
    historiasPendientes: 0,
  };

  maxBirthDate = fechaHoyCol();
  minBirthDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return fmtDate(d);
  })();

  // ── Importación masiva ────────────────────────────────────────────────────
  importModalVisible = false;
  importStep: 'select' | 'preview' | 'result' = 'select';
  importLoading = false;
  importError = '';
  importPreviewRows: ParsedRow[] = [];
  importPreviewHeaders: string[] = [];
  importTotalRows = 0;
  importResult: ImportResult | null = null;
  importColumnMapping: Record<string, string | null> = {};

  /** Alias de columnas aceptadas por campo interno */
  private readonly PATIENT_ALIASES: Record<string, string[]> = {
    nombre:          ['nombre', 'name', 'first_name', 'primer_nombre', 'nombres'],
    apellido:        ['apellido', 'apellidos', 'last_name', 'surname', 'primer_apellido'],
    documento:       ['documento', 'doc', 'cedula', 'nit', 'id', 'identificacion', 'identification'],
    telefono:        ['telefono', 'tel', 'phone', 'celular', 'movil', 'mobile'],
    correo:          ['correo', 'email', 'mail', 'correo_electronico'],
    fechaNacimiento: ['fechanacimiento', 'fecha_nacimiento', 'birth_date', 'birthdate', 'nacimiento', 'dob'],
    direccion:       ['direccion', 'address', 'domicilio', 'dirección'],
    eps:             ['eps', 'aseguradora', 'seguro'],
    alergias:        ['alergias', 'allergies', 'alergia'],
    observaciones:   ['observaciones', 'observations', 'notas', 'notes', 'obs'],
    activo:          ['activo', 'active', 'estado_paciente'],
  };

  constructor(
    private fb: FormBuilder,
    private patientsService: PatientsService,
    readonly importParser: ImportParserService,
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
          Validators.minLength(4),
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

  ngOnDestroy(): void {
    if (this._searchDebounce) clearTimeout(this._searchDebounce);
    if (this._successTimer) clearTimeout(this._successTimer);
    this.destroy$.next();
    this.destroy$.complete();
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

    this.patientsService.getPatients({
      soloActivos: !this.mostrarInactivos,
      search: this.searchTerm.trim() || undefined,
      page: this.currentPage,
      pageSize: this.PAGE_SIZE,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.filteredPatients = response.data;
        this.paginaMeta = response.meta ?? null;
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
    this.patientsService.getRecentPatients().pipe(takeUntil(this.destroy$)).subscribe({
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
    this.patientsService.getQuickInfo().pipe(takeUntil(this.destroy$)).subscribe({
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
    this.patientsService.getPatientById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const p = res.data;
        this.editingId = id;
        this.formVisible = true;
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
    if (this.loading) return;
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.buildPayload();

    if (this.editingId !== null) {
      this.patientsService.updatePatient(this.editingId, payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: any) => {
          this.setSuccess(response.message || 'Paciente actualizado correctamente');
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
      this.patientsService.createPatient(payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: any) => {
          this.setSuccess(response.message || 'Paciente registrado correctamente');
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
    return active ? 'status-badge--active' : 'status-badge--cancelled';
  }

  getStatusLabel(active: boolean): string {
    return active ? 'Activo' : 'Inactivo';
  }

  iniciarToggleActivo(patient: PatientRow): void {
    this.toggleActivoTarget = patient;
    this.toggleActivoPendientes = null;
    this.toggleActivoError = '';
    this.toggleActivoLoading = true;
    this.cdr.detectChanges();

    this.patientsService.toggleActivo(patient.id, !patient.activo, false).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        // Sin pendientes — se ejecutó directamente
        this.toggleActivoTarget = null;
        this.toggleActivoLoading = false;
        this.loadPatientsModuleData();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toggleActivoLoading = false;
        if (err?.status === 409 && err?.error?.pendientes) {
          this.toggleActivoPendientes = err.error.pendientes;
        } else {
          this.toggleActivoError = err?.error?.message || 'No se pudo cambiar el estado';
          this.toggleActivoTarget = null;
        }
        this.cdr.detectChanges();
      },
    });
  }

  confirmarToggleActivo(): void {
    if (!this.toggleActivoTarget) return;
    this.toggleActivoLoading = true;
    this.toggleActivoError = '';

    this.patientsService.toggleActivo(this.toggleActivoTarget.id, !this.toggleActivoTarget.activo, true).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toggleActivoTarget = null;
        this.toggleActivoPendientes = null;
        this.toggleActivoLoading = false;
        this.loadPatientsModuleData();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toggleActivoError = err?.error?.message || 'No se pudo cambiar el estado';
        this.toggleActivoLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  cancelarToggleActivo(): void {
    this.toggleActivoTarget = null;
    this.toggleActivoPendientes = null;
    this.toggleActivoError = '';
    this.toggleActivoLoading = false;
  }

  goToHistory(patientId: number): void {
    this.router.navigate(['/history', encodeId(patientId)]);
  }

  goToOdontogram(patientId: number): void {
    this.router.navigate(['/odontogram', encodeId(patientId)]);
  }

  goToResumen(patientId: number): void {
    this.router.navigate(['/resumen', encodeId(patientId)]);
  }

  goToFinance(patientId: number): void {
    this.router.navigate(['/finance'], { queryParams: { pacienteId: encodeId(patientId) } });
  }

  goToTratamientos(patientId: number): void {
    this.router.navigate(['/tratamientos', encodeId(patientId)]);
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
    return calcEdad(birthDate);
  }

  // ── Métodos de importación ────────────────────────────────────────────────

  openImportModal(): void {
    this.importModalVisible = true;
    this.importStep = 'select';
    this.importError = '';
    this.importPreviewRows = [];
    this.importPreviewHeaders = [];
    this.importResult = null;
    this.importLoading = false;
    this.cdr.detectChanges();
  }

  closeImportModal(): void {
    this.importModalVisible = false;
    this.cdr.detectChanges();
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.importLoading = true;
    this.importError = '';
    this.cdr.detectChanges();

    try {
      const parsed = await this.importParser.parse(file, 'Pacientes');
      this.importColumnMapping = this.importParser.mapHeaders(parsed.headers, this.PATIENT_ALIASES);
      this.importPreviewHeaders = parsed.headers;
      this._importAllRows = parsed.rows;
      this.importPreviewRows = parsed.rows.slice(0, 5);
      this.importTotalRows = parsed.totalRows;
      this.importStep = 'preview';
    } catch (err: any) {
      this.importError = err?.message ?? 'No se pudo leer el archivo';
    }

    this.importLoading = false;
    this.cdr.detectChanges();
  }

  /** Etiqueta legible para cada campo interno */
  importFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      nombre: 'Nombre *', apellido: 'Apellido *', documento: 'Documento *',
      telefono: 'Teléfono', correo: 'Correo', fechaNacimiento: 'Fecha nac.',
      direccion: 'Dirección', eps: 'EPS', alergias: 'Alergias', observaciones: 'Observaciones',
      activo: 'Activo (SI/NO)',
    };
    return labels[field] ?? field;
  }

  get importMappingEntries(): { field: string; header: string | null }[] {
    return Object.entries(this.importColumnMapping).map(([field, header]) => ({ field, header }));
  }

  get importRequiredMapped(): boolean {
    return !!this.importColumnMapping['nombre'] &&
           !!this.importColumnMapping['apellido'] &&
           !!this.importColumnMapping['documento'];
  }

  confirmarImport(): void {
    if (!this.importRequiredMapped) return;

    this.importLoading = true;
    this.cdr.detectChanges();

    const mapped = this.importParser.applyMapping(this._importAllRows, this.importColumnMapping);

    this.patientsService.importarPacientes(mapped as any).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.importResult = res.data;
        this.importStep = 'result';
        this.importLoading = false;
        if (res.data.importados > 0 || res.data.actualizados > 0) {
          this.loadPatientsModuleData();
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.importError = err?.error?.message ?? 'Error al importar';
        this.importLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Filas completas del archivo (no solo preview) — se llenan en onImportFileSelected */
  private _importAllRows: ParsedRow[] = [];

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

  private setSuccess(msg: string): void {
    if (this._successTimer) clearTimeout(this._successTimer);
    this.successMessage = msg;
    this._successTimer = setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);
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
    return fmtDate(date);
  }

  private noFutureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const inputDate = new Date(`${control.value}T00:00:00-05:00`);
      if (isNaN(inputDate.getTime())) return { invalidDate: true };
      // mañana Colombia como límite — cualquier fecha >= mañana es "futura"
      if (inputDate >= medianocheColUTC(1)) return { futureDate: true };
      return null;
    };
  }

  private ageRangeValidator(minAge: number, maxAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const birthDate = new Date(`${control.value}T00:00:00-05:00`);
      if (isNaN(birthDate.getTime())) return { invalidDate: true };
      // Comparar edad usando hoy en Colombia
      // Usar getUTC* porque ambas fechas están ancladas a medianoche Colombia
      // como instante UTC — getUTC* devuelve el valor Colombia correcto.
      const todayCol = new Date(`${fechaHoyCol()}T00:00:00-05:00`);
      let age = todayCol.getUTCFullYear() - birthDate.getUTCFullYear();
      const monthDiff = todayCol.getUTCMonth() - birthDate.getUTCMonth();
      if (monthDiff < 0 || (monthDiff === 0 && todayCol.getUTCDate() < birthDate.getUTCDate())) {
        age--;
      }

      if (age < minAge || age > maxAge) {
        return { invalidAgeRange: true };
      }

      return null;
    };
  }
}
