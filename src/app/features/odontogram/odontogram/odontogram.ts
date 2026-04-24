import { CommonModule } from '@angular/common';
import { Component, signal, computed, OnInit, effect } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { Tooth as ToothComponent } from '../components/tooth/tooth';
import { Diagnosis } from '../interfaces/diagnosis';
import { Tooth } from '../interfaces/tooth';
import { SurfaceDiagnosis } from '../interfaces/surface-diagnosis';
import { ToothPiece } from '../interfaces/tooth-piece';

import { ToothSurface } from '../types/tooth-surface';
import { DiagnosisType } from '../types/diagnosis-type';
import { PieceType } from '../types/piece-type';

import { OdontogramService } from '../../../services/odontogram';
import { OdontogramHistorialModal } from '../components/historial-modal/historial-modal';
import { Navbar } from '../../complements/navbar/navbar';

import { Odontogram } from '../interfaces/odontogram';
import { OdontogramPayload } from '../interfaces/odontogram-payload';
import { BackendOdontogramResponse } from '../interfaces/backend-odontogram-response';
import { Footer } from '../../complements/footer/footer';
import { ActivatedRoute, Router } from '@angular/router';

import { PatientsService } from '../../user/service/pacientes.service';
import { FinanzasService, MovimientoRow } from '../../wallet/finance/service/finanzas.service';
import { HistoriaClinicaService } from '../../historia-clinica/historia-clinica.service/historia-clinica.service';
import { AlertaClinica } from '../../historia-clinica/resumen/resumen';

@Component({
  selector: 'app-odontogram',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToothComponent, Navbar, Footer, OdontogramHistorialModal],
  templateUrl: './odontogram.html',
  styleUrl: './odontogram.css',
})
export class OdontogramComponent implements OnInit {
  // ── Arcadas adulto ────────────────────────────────────────────────────────
  upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  upperLeft  = [21, 22, 23, 24, 25, 26, 27, 28];
  lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  lowerLeft  = [31, 32, 33, 34, 35, 36, 37, 38];

  // ── Arcadas pediátricas ───────────────────────────────────────────────────
  pediatricUpperRight = [55, 54, 53, 52, 51];
  pediatricUpperLeft  = [61, 62, 63, 64, 65];
  pediatricLowerRight = [85, 84, 83, 82, 81];
  pediatricLowerLeft  = [71, 72, 73, 74, 75];

  // ── Arcadas mixtas (molares permanentes + todos los temporales) ───────────
  mixedUpperRight = [18, 17, 16, 55, 54, 53, 52, 51];
  mixedUpperLeft  = [61, 62, 63, 64, 65, 26, 27, 28];
  mixedLowerRight = [48, 47, 46, 85, 84, 83, 82, 81];
  mixedLowerLeft  = [71, 72, 73, 74, 75, 36, 37, 38];

  // ── Modo del odontograma ──────────────────────────────────────────────────
  odontogramTipo: 'ADULTO' | 'PEDIATRICO' | 'MIXTO' = 'ADULTO';
  showPediatricModal = false;

  get isPediatric(): boolean {
    return this.odontogramTipo === 'PEDIATRICO';
  }

  get isMixed(): boolean {
    return this.odontogramTipo === 'MIXTO';
  }

  isPrimaryTooth(number: number): boolean {
    return (number >= 51 && number <= 55) ||
           (number >= 61 && number <= 65) ||
           (number >= 71 && number <= 75) ||
           (number >= 81 && number <= 85);
  }

  setOdontogramMode(tipo: 'ADULTO' | 'PEDIATRICO' | 'MIXTO'): void {
    this.odontogramTipo = tipo;
    this.showPediatricModal = false;
  }

  // ── Selección activa ──────────────────────────────────────────────────────
  selectedDiagnosis: DiagnosisType | null = null;
  selectedPiece: PieceType | null = null;
  activeTab: 'diagnoses' | 'pieces' = 'diagnoses';

  // ── Datos ─────────────────────────────────────────────────────────────────
  diagnoses = signal<Diagnosis[]>([]);
  pieces = signal<ToothPiece[]>([]);

  // ── Opciones de panel (filtradas por modo) ────────────────────────────────
  get quickDiagnoses(): { type: DiagnosisType; label: string }[] {
    if (this.isPediatric) {
      return [
        { type: 'Caries',      label: 'Caries' },
        { type: 'Obturacion',  label: 'Obturación' },
        { type: 'Fractura',    label: 'Fractura' },
        { type: 'Sellante',    label: 'Sellante' },
        { type: 'Extraccion',  label: 'Extracción' },
        { type: 'Pulpotomia',  label: 'Pulpotomía' },
        { type: 'Pulpectomia', label: 'Pulpectomía' },
        { type: 'Sano',        label: 'Sano' },
      ];
    }
    if (this.isMixed) {
      return [
        { type: 'Caries',              label: 'Caries' },
        { type: 'Obturacion',          label: 'Obturación' },
        { type: 'Fractura',            label: 'Fractura' },
        { type: 'Sellante',            label: 'Sellante' },
        { type: 'Extraccion',          label: 'Extracción' },
        { type: 'Pulpotomia',          label: 'Pulpotomía' },
        { type: 'Pulpectomia',         label: 'Pulpectomía' },
        { type: 'Endodoncia',          label: 'Endodoncia' },
        { type: 'TratamientoConducto', label: 'Trat. Conducto' },
        { type: 'Sano',                label: 'Sano' },
      ];
    }
    return [
      { type: 'Caries',              label: 'Caries' },
      { type: 'Obturacion',          label: 'Obturación' },
      { type: 'Fractura',            label: 'Fractura' },
      { type: 'Sellante',            label: 'Sellante' },
      { type: 'Extraccion',          label: 'Extracción' },
      { type: 'Endodoncia',          label: 'Endodoncia' },
      { type: 'TratamientoConducto', label: 'Trat. Conducto' },
      { type: 'Sano',                label: 'Sano' },
    ];
  }

  get quickPieces(): { type: PieceType; label: string; icon: string }[] {
    if (this.isPediatric) {
      return [
        { type: 'Corona',            label: 'Corona',           icon: '♛' },
        { type: 'Puente',            label: 'Puente',           icon: '⊓⊔' },
        { type: 'ProtesisParcial',   label: 'Prót. Parcial',    icon: '⌒' },
        { type: 'MantenedorEspacio', label: 'Mant. Espacio',    icon: '⊞' },
        { type: 'DienteAusente',     label: 'Diente Ausente',   icon: '✕' },
      ];
    }
    if (this.isMixed) {
      return [
        { type: 'Corona',            label: 'Corona',           icon: '♛' },
        { type: 'Puente',            label: 'Puente',           icon: '⊓⊔' },
        { type: 'Implante',          label: 'Implante',         icon: '⚙' },
        { type: 'ProtesisParcial',   label: 'Prót. Parcial',    icon: '⌒' },
        { type: 'MantenedorEspacio', label: 'Mant. Espacio',    icon: '⊞' },
        { type: 'DienteAusente',     label: 'Diente Ausente',   icon: '✕' },
      ];
    }
    return [
      { type: 'Corona',        label: 'Corona',          icon: '♛' },
      { type: 'Puente',        label: 'Puente',          icon: '⊓⊔' },
      { type: 'Implante',      label: 'Implante',        icon: '⚙' },
      { type: 'ProtesisParcial',label: 'Prót. Parcial',  icon: '⌒' },
      { type: 'ProtesisTotal', label: 'Prót. Total',     icon: '⊙' },
      { type: 'DienteAusente', label: 'Diente Ausente',  icon: '✕' },
    ];
  }

  // ── Cobros por diagnóstico ────────────────────────────────────────────────
  cobros = signal<MovimientoRow[]>([]);

  cobrosMap = computed(() => {
    const map = new Map<string, MovimientoRow>();
    for (const c of this.cobros()) {
      if (c.diagnosticoRef) map.set(c.diagnosticoRef, c);
    }
    return map;
  });

  cobroFormVisible = false;
  cobroDuplicadoAdvertencia = false;
  cobroTarget: { ref: string; label: string; fecha: string } | null = null;
  cobroForm!: FormGroup;
  cobroGuardando = false;
  cobroGuardado = false;
  cobroMensaje = '';
  cobroMensajeTipo: 'success' | 'error' | '' = '';

  hasCobro(ref: string): boolean {
    return this.cobrosMap().has(ref);
  }

  buildDiagnosticoRef(tooth: number, type: DiagnosisType): string {
    return `${tooth}-${type}`;
  }

  getUniqueDiagnoses(record: { surfaces: { surface: ToothSurface; diagnoses: DiagnosisType[] }[] }): DiagnosisType[] {
    const seen = new Set<DiagnosisType>();
    for (const surface of record.surfaces) {
      for (const d of surface.diagnoses) seen.add(d);
    }
    return Array.from(seen);
  }

  buildPieceRef(tooth: number, type: PieceType): string {
    return `${tooth}-P-${type}`;
  }

  openCobroForm(ref: string, label: string, fecha: string): void {
    this.cobroTarget = { ref, label, fecha };
    this.cobroDuplicadoAdvertencia = this.cobrosMap().has(ref);
    this.cobroMensaje = '';
    this.cobroMensajeTipo = '';
    this.cobroGuardando = false;
    this.cobroGuardado = false;
    this.cobroForm.reset({
      concepto: label,
      monto: null,
      fecha: fecha.substring(0, 10),
      estado: 'PENDIENTE',
      metodoPago: 'Efectivo',
    });
    this.cobroFormVisible = true;
  }

  closeCobroForm(): void {
    this.cobroFormVisible = false;
    this.cobroTarget = null;
    this.cobroDuplicadoAdvertencia = false;
    this.cobroGuardando = false;
    this.cobroGuardado = false;
  }

  submitCobro(): void {
    if (this.cobroForm.invalid) {
      this.cobroForm.markAllAsTouched();
      return;
    }

    if (!this.cobroTarget || !this.originalOdontogram) return;

    this.cobroGuardando = true;
    const raw = this.cobroForm.getRawValue();

    const payload = {
      tipo: 'INGRESO' as const,
      concepto: raw.concepto.trim(),
      monto: Number(raw.monto),
      fecha: raw.fecha,
      estado: raw.estado,
      metodoPago: raw.metodoPago || null,
      diagnosticoRef: this.cobroTarget.ref,
      pacienteId: this.patientId,
      odontogramaId: this.originalOdontogram.id!,
    };

    this.finanzasService.create(payload).subscribe({
      next: () => {
        this.cobroGuardando = false;
        this.cobroGuardado = true;
        this.cobroMensaje = 'Cobro registrado correctamente';
        this.cobroMensajeTipo = 'success';
        this.loadCobros();
        setTimeout(() => this.closeCobroForm(), 3000);
      },
      error: (err: any) => {
        this.cobroGuardando = false;
        this.cobroMensaje = err?.error?.message || 'No se pudo registrar el cobro';
        this.cobroMensajeTipo = 'error';
      },
    });
  }

  private loadCobros(): void {
    if (!this.originalOdontogram?.id) return;
    this.finanzasService.getByOdontograma(this.originalOdontogram.id).subscribe({
      next: (res) => this.cobros.set(res.data),
      error: () => this.cobros.set([]),
    });
  }

  // ── Alertas clínicas ──────────────────────────────────────────────────────
  alertasClinicas: AlertaClinica[] = [];
  alertasPanelVisible = false;

  get alertasCriticas(): AlertaClinica[] {
    return this.alertasClinicas.filter(a => a.tipo === 'critica');
  }

  get alertasAdvertencia(): AlertaClinica[] {
    return this.alertasClinicas.filter(a => a.tipo === 'advertencia');
  }

  get tieneAlertas(): boolean {
    return this.alertasClinicas.some(a => a.tipo === 'critica' || a.tipo === 'advertencia');
  }

  // ── Info del paciente ─────────────────────────────────────────────────────
  patientId!: number;
  patientName = 'Paciente';
  patientDocument = '';
  patientAge: number | null = null;

  private patientLoaded = false;
  private odontogramChecked = false;

  private calcularEdad(fechaNacimiento: string | null): number | null {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nac = new Date(`${fechaNacimiento}T00:00:00`);
    if (isNaN(nac.getTime())) return null;
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  private maybeSuggestPediatric(): void {
    if (this.originalOdontogram) return;
    if (this.patientAge !== null && this.patientAge >= 5 && this.patientAge <= 15) {
      this.showPediatricModal = true;
    }
  }

  // ── Selección de diagnóstico ──────────────────────────────────────────────
  selectDiagnosis(diagnosis: DiagnosisType) {
    this.selectedPiece = null;
    this.selectedDiagnosis = this.selectedDiagnosis === diagnosis ? null : diagnosis;
  }

  selectPiece(piece: PieceType) {
    this.selectedDiagnosis = null;
    this.selectedPiece = this.selectedPiece === piece ? null : piece;
  }

  switchTab(tab: 'diagnoses' | 'pieces') {
    this.activeTab = tab;
    this.selectedDiagnosis = null;
    this.selectedPiece = null;
  }

  clearActiveSelection() {
    this.selectedDiagnosis = null;
    this.selectedPiece = null;
  }

  // ── Aplicar diagnóstico o pieza al hacer clic en una cara ─────────────────
  applyDiagnosis(event: { tooth: number; surface: ToothSurface }) {
    if (this.selectedPiece) {
      this.togglePiece(event.tooth);
      return;
    }

    if (!this.selectedDiagnosis) return;

    this.diagnoses.update((current) => {
      const diagnosisType = this.selectedDiagnosis!;
      const existingIndex = current.findIndex(
        (d) => d.type === diagnosisType && d.teeth.length === 1 && d.teeth[0] === event.tooth,
      );

      if (existingIndex === -1) {
        const newDiagnosis: Diagnosis = {
          teeth: [event.tooth],
          faces: [event.surface],
          type: diagnosisType,
          date: new Date().toISOString(),
        };
        return [...current, newDiagnosis];
      }

      const existing = current[existingIndex];
      const faceExists = existing.faces.includes(event.surface);

      const updatedDiagnosis: Diagnosis = {
        ...existing,
        faces: faceExists
          ? existing.faces.filter((face) => face !== event.surface)
          : [...existing.faces, event.surface],
      };

      if (updatedDiagnosis.faces.length === 0) {
        return current.filter((_, index) => index !== existingIndex);
      }

      return current.map((diagnosis, index) =>
        index === existingIndex ? updatedDiagnosis : diagnosis,
      );
    });
  }

  // ── Piezas ────────────────────────────────────────────────────────────────
  private togglePiece(tooth: number) {
    const pieceType = this.selectedPiece!;
    this.pieces.update((current) => {
      const existingIndex = current.findIndex(
        (p) => p.tooth === tooth && p.type === pieceType,
      );
      if (existingIndex !== -1) {
        return current.filter((_, i) => i !== existingIndex);
      }
      return [...current, { tooth, type: pieceType, date: new Date().toISOString() }];
    });
  }

  removePiece(tooth: number, type: PieceType) {
    this.pieces.update((current) =>
      current.filter((p) => !(p.tooth === tooth && p.type === type)),
    );
  }

  // ── Maps computados ───────────────────────────────────────────────────────
  piecesMap = computed(() => {
    const map = new Map<number, PieceType[]>();
    for (const p of this.pieces()) {
      if (!map.has(p.tooth)) map.set(p.tooth, []);
      map.get(p.tooth)!.push(p.type);
    }
    return map;
  });

  toothFaceMap = computed(() => {
    const map = new Map<number, SurfaceDiagnosis[]>();

    for (const diagnosis of this.diagnoses()) {
      for (const tooth of diagnosis.teeth) {
        if (!map.has(tooth)) {
          map.set(tooth, []);
        }
        const surfaces = map.get(tooth)!;

        for (const face of diagnosis.faces) {
          const existing = surfaces.find((s) => s.surface === face);
          if (existing) {
            if (!existing.diagnoses.includes(diagnosis.type)) {
              existing.diagnoses = [...existing.diagnoses, diagnosis.type];
            }
          } else {
            surfaces.push({ surface: face, diagnoses: [diagnosis.type] });
          }
        }
      }
    }
    return map;
  });

  groupedDiagnosesByTooth = computed(() => {
    const grouped = new Map<
      number,
      { tooth: number; date: string; surfaces: { surface: ToothSurface; diagnoses: DiagnosisType[] }[] }
    >();

    for (const diagnosis of this.diagnoses()) {
      for (const tooth of diagnosis.teeth) {
        if (!grouped.has(tooth)) {
          grouped.set(tooth, { tooth, date: diagnosis.date, surfaces: [] });
        }
        const toothEntry = grouped.get(tooth)!;

        for (const face of diagnosis.faces) {
          const existingSurface = toothEntry.surfaces.find((s) => s.surface === face);
          if (existingSurface) {
            if (!existingSurface.diagnoses.includes(diagnosis.type)) {
              existingSurface.diagnoses = [...existingSurface.diagnoses, diagnosis.type];
            }
          } else {
            toothEntry.surfaces.push({ surface: face, diagnoses: [diagnosis.type] });
          }
        }

        if (new Date(diagnosis.date) > new Date(toothEntry.date)) {
          toothEntry.date = diagnosis.date;
        }
      }
    }
    return Array.from(grouped.values()).sort((a, b) => a.tooth - b.tooth);
  });

  diagnosisSummary = computed(() => {
    const summary: Partial<Record<DiagnosisType, number>> = {};
    for (const d of this.diagnoses()) {
      summary[d.type] = (summary[d.type] || 0) + 1;
    }
    return summary;
  });

  private readonly diagnosisLabels: Record<DiagnosisType, string> = {
    Caries: 'Caries',
    Obturacion: 'Obturación',
    Fractura: 'Fractura',
    Sellante: 'Sellante',
    Extraccion: 'Extracción',
    Endodoncia: 'Endodoncia',
    TratamientoConducto: 'Trat. Conducto',
    Sano: 'Sano',
    Pulpotomia: 'Pulpotomía',
    Pulpectomia: 'Pulpectomía',
  };

  private readonly pieceLabels: Record<PieceType, string> = {
    Corona: 'Corona',
    Puente: 'Puente',
    Implante: 'Implante',
    ProtesisParcial: 'Prót. Parcial',
    ProtesisTotal: 'Prót. Total',
    DienteAusente: 'Diente Ausente',
    MantenedorEspacio: 'Mant. Espacio',
  };

  getDiagnosisLabel(type: DiagnosisType): string {
    return this.diagnosisLabels[type] ?? type;
  }

  getPieceLabel(type: PieceType): string {
    return this.pieceLabels[type] ?? type;
  }

  // ── Estado del odontograma ────────────────────────────────────────────────
  odontogram: Odontogram | null = null;
  originalOdontogram: Odontogram | null = null;
  isSaving = false;
  saveMessage = '';
  saveMessageType: 'success' | 'error' | 'info' | '' = '';

  // ── Historial de versiones ────────────────────────────────────────────────
  historial: BackendOdontogramResponse[] = [];
  historialVisible = false;
  historialLoading = false;
  versionModal: BackendOdontogramResponse | null = null;
  versionModalVisible = false;

  // ── Confirmación de nueva versión ─────────────────────────────────────────
  showVersionModal = false;
  movimientosPendientes: MovimientoRow[] = [];
  checkingPendientes = false;

  // ── Constructor y ciclo de vida ───────────────────────────────────────────
  constructor(
    private odontogramService: OdontogramService,
    private route: ActivatedRoute,
    private patientsService: PatientsService,
    private router: Router,
    private finanzasService: FinanzasService,
    private historiaService: HistoriaClinicaService,
    private fb: FormBuilder,
  ) {
    this.cobroForm = this.fb.group({
      concepto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      monto: [null, [Validators.required, Validators.min(1)]],
      fecha: ['', Validators.required],
      estado: ['PENDIENTE', Validators.required],
      metodoPago: ['Efectivo'],
    });

    effect(() => {
      localStorage.setItem('odontogram-diagnoses', JSON.stringify(this.diagnoses()));
      localStorage.setItem('odontogram-pieces', JSON.stringify(this.pieces()));
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        this.showSaveMessage('error', 'No se recibió el paciente para el odontograma.', true, 4000);
        return;
      }

      this.patientId = Number(id);

      if (isNaN(this.patientId)) {
        this.showSaveMessage('error', 'El identificador del paciente no es válido.', true, 4000);
        return;
      }

      this.loadPatientInfo();
      this.loadOdontogram();
    });
  }

  // ── Carga de datos ────────────────────────────────────────────────────────
  private loadPatientInfo(): void {
    this.patientsService.getPatientById(this.patientId).subscribe({
      next: (patient) => {
        this.patientName = `${patient.data.nombre} ${patient.data.apellido}`.trim();
        this.patientDocument = patient.data.documento || '';
        this.patientAge = this.calcularEdad(patient.data.fechaNacimiento ?? null);
        this.patientLoaded = true;
        if (this.odontogramChecked) this.maybeSuggestPediatric();
      },
      error: () => {
        this.patientName = `Paciente #${this.patientId}`;
        this.patientDocument = '';
        this.patientLoaded = true;
        if (this.odontogramChecked) this.maybeSuggestPediatric();
      },
    });
    this.loadAlertas();
  }

  private loadAlertas(): void {
    this.historiaService.getHistoriaByPaciente(this.patientId).subscribe({
      next: (response) => {
        const historia = response?.data?.historia;
        if (!historia) return;
        this.alertasClinicas = this.parseAlertas(historia);
      },
      error: () => {},
    });
  }

  private parseJson(value: any): any {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return {}; }
  }

  private parseAlertas(historia: any): AlertaClinica[] {
    const alertas: AlertaClinica[] = [];

    const alergias = this.parseJson(historia.alergiasGenerales);
    if (alergias.anestesia) alertas.push({ tipo: 'critica', texto: 'Alergia a la anestesia' });
    if (alergias.medicamentos) {
      const d = alergias.descripcion ? `: ${alergias.descripcion}` : '';
      alertas.push({ tipo: 'critica', texto: `Alergia a medicamentos${d}` });
    }
    if (alergias.latex) alertas.push({ tipo: 'advertencia', texto: 'Alergia al látex' });

    const odonto = this.parseJson(historia.antecedentesOdontologicos);
    if (odonto.reaccionesAnestesia === 'Sí') alertas.push({ tipo: 'critica', texto: 'Reacciones previas a la anestesia' });
    if (odonto.complicacionesPrevias === 'Sí') alertas.push({ tipo: 'advertencia', texto: 'Complicaciones en tratamientos previos' });

    const hema = this.parseJson(historia.antecedentesHematologicos);
    if (hema.sangraFacilidad === 'Sí') alertas.push({ tipo: 'critica', texto: 'Sangrado con facilidad' });
    if (hema.problemasCoagulacion === 'Sí') alertas.push({ tipo: 'critica', texto: 'Problemas de coagulación' });

    const enf = this.parseJson(historia.enfermedadesSistemicas);
    const mapa: Record<string, string> = {
      hipertension: 'Hipertensión arterial', diabetes: 'Diabetes',
      cardiacas: 'Enfermedad cardíaca', renales: 'Enfermedad renal',
      hepaticas: 'Enfermedad hepática', endocrinas: 'Enfermedad endocrina',
    };
    for (const [key, label] of Object.entries(mapa)) {
      if (enf[key]) alertas.push({ tipo: 'advertencia', texto: label });
    }

    const gineco = this.parseJson(historia.ginecoObstetricos);
    if (gineco.embarazo === 'Sí') alertas.push({ tipo: 'advertencia', texto: 'Embarazo' });

    return alertas;
  }

  private loadOdontogram(): void {
    this.odontogramService.getActive(this.patientId).subscribe({
      next: (data) => {
        if (!data) {
          this.originalOdontogram = null;
          this.odontogram = { patientId: this.patientId, date: new Date().toISOString(), teeth: [] };
          this.diagnoses.set([]);
          this.pieces.set([]);
          this.odontogramChecked = true;
          if (this.patientLoaded) this.maybeSuggestPediatric();
          return;
        }

        // Leer tipo del odontograma existente
        if (data.tipo === 'PEDIATRICO') {
          this.odontogramTipo = 'PEDIATRICO';
        } else if (data.tipo === 'MIXTO') {
          this.odontogramTipo = 'MIXTO';
        }

        this.originalOdontogram = {
          id: data.id,
          patientId: data.pacienteId,
          date: data.fecha,
          teeth: [],
          version: data.version,
        };
        this.odontogram = structuredClone(this.originalOdontogram);

        const { diagnoses, pieces } = this.buildDiagnosesFromBackend(data);
        this.diagnoses.set(diagnoses);
        this.pieces.set(pieces);
        this.odontogramChecked = true;
        this.loadCobros();
      },
      error: () => {
        this.originalOdontogram = null;
        this.odontogram = { patientId: this.patientId, date: new Date().toISOString(), teeth: [] };
        this.diagnoses.set([]);
        this.pieces.set([]);
        this.odontogramChecked = true;
        if (this.patientLoaded) this.maybeSuggestPediatric();
        this.showSaveMessage('info', 'No se pudo consultar el odontograma del paciente.', true, 3000);
      },
    });
  }

  // ── Eliminar superficie del registro ─────────────────────────────────────
  removeSurfaceRecord(toothNumber: number, surface: ToothSurface): void {
    this.diagnoses.update((current) =>
      current
        .map((diagnosis) => {
          if (!diagnosis.teeth.includes(toothNumber)) return diagnosis;
          const updatedFaces = diagnosis.faces.filter((face) => face !== surface);
          if (updatedFaces.length === 0) return null;
          return { ...diagnosis, faces: updatedFaces };
        })
        .filter((diagnosis): diagnosis is Diagnosis => diagnosis !== null),
    );
  }

  // ── Construcción del payload hacia el backend ─────────────────────────────
  private buildBackendStructure(): Tooth[] {
    const teethMap = new Map<number, Tooth>();

    for (const d of this.diagnoses()) {
      for (const tooth of d.teeth) {
        if (!teethMap.has(tooth)) {
          teethMap.set(tooth, { number: tooth, surfaces: [] });
        }
        const toothEntry = teethMap.get(tooth)!;

        for (const face of d.faces) {
          const existingSurface = toothEntry.surfaces.find((s) => s.surface === face);
          if (existingSurface) {
            if (!existingSurface.diagnoses.includes(d.type)) {
              existingSurface.diagnoses.push(d.type);
            }
          } else {
            toothEntry.surfaces.push({ surface: face, diagnoses: [d.type] });
          }
        }
      }
    }

    for (const piece of this.pieces()) {
      if (!teethMap.has(piece.tooth)) {
        teethMap.set(piece.tooth, { number: piece.tooth, surfaces: [] });
      }
      teethMap.get(piece.tooth)!.surfaces.push({ surface: 'P' as any, diagnoses: [piece.type as any] });
    }

    return Array.from(teethMap.values());
  }

  private buildVersioningPayload(): OdontogramPayload {
    const teeth = this.buildBackendStructure();
    return {
      pacienteId: this.patientId,
      tipo: this.odontogramTipo,
      dientes: teeth.map((tooth) => ({
        numero: tooth.number,
        superficies: tooth.surfaces.flatMap((surface) =>
          surface.diagnoses.map((diagnosis) => ({
            superficie: surface.surface === ('P' as any)
              ? 'P'
              : this.mapFrontendSurfaceToBackend(surface.surface),
            diagnostico: diagnosis,
          })),
        ),
      })),
    };
  }

  // ── Parseo desde el backend ───────────────────────────────────────────────
  private buildDiagnosesFromBackend(
    rawOdontogram: BackendOdontogramResponse,
  ): { diagnoses: Diagnosis[]; pieces: ToothPiece[] } {
    const groupedDiagnoses = new Map<string, Diagnosis>();
    const piecesResult: ToothPiece[] = [];

    const dientes = rawOdontogram?.dientes ?? [];
    const fecha = rawOdontogram?.fecha ?? new Date().toISOString();

    for (const diente of dientes) {
      const numero = diente?.numero;
      const superficies = diente?.superficies ?? [];

      for (const superficie of superficies) {
        const rawSurface = superficie?.superficie;
        const rawDiagnosis = superficie?.diagnostico;

        if (rawSurface === 'P') {
          const pieceType = this.mapBackendPieceType(rawDiagnosis);
          if (numero && pieceType) {
            piecesResult.push({ tooth: numero, type: pieceType, date: fecha });
          }
          continue;
        }

        const mappedSurface = this.mapBackendSurface(rawSurface);
        const mappedDiagnosis = this.mapBackendDiagnosis(rawDiagnosis);

        if (!numero || !mappedSurface || !mappedDiagnosis) continue;

        const key = `${numero}-${mappedDiagnosis}`;
        if (!groupedDiagnoses.has(key)) {
          groupedDiagnoses.set(key, {
            teeth: [numero],
            faces: [mappedSurface],
            type: mappedDiagnosis,
            date: fecha,
          });
        } else {
          const existing = groupedDiagnoses.get(key)!;
          if (!existing.faces.includes(mappedSurface)) {
            existing.faces = [...existing.faces, mappedSurface];
          }
        }
      }
    }

    return {
      diagnoses: Array.from(groupedDiagnoses.values()),
      pieces: piecesResult,
    };
  }

  // ── Mapeos ────────────────────────────────────────────────────────────────
  private mapBackendSurface(surface: string): ToothSurface | null {
    const surfaceMap: Record<string, ToothSurface> = {
      M: 'Mesial',
      D: 'Distal',
      V: 'Centro',
      L: 'Lingual',
      O: 'Oclusal',
      C: 'Centro',
    };
    return surfaceMap[surface] ?? null;
  }

  private mapFrontendSurfaceToBackend(surface: ToothSurface): string {
    const surfaceMap: Record<ToothSurface, string> = {
      Mesial: 'M',
      Distal: 'D',
      Lingual: 'L',
      Oclusal: 'O',
      Centro: 'C',
    };
    return surfaceMap[surface];
  }

  private mapBackendDiagnosis(diagnosis: string): DiagnosisType | null {
    const diagnosisMap: Record<string, DiagnosisType> = {
      Caries: 'Caries',
      Obturacion: 'Obturacion',
      Fractura: 'Fractura',
      Sellante: 'Sellante',
      Extraccion: 'Extraccion',
      Endodoncia: 'Endodoncia',
      TratamientoConducto: 'TratamientoConducto',
      Sano: 'Sano',
      Pulpotomia: 'Pulpotomia',
      Pulpectomia: 'Pulpectomia',
    };
    return diagnosisMap[diagnosis] ?? null;
  }

  private mapBackendPieceType(piece: string): PieceType | null {
    const pieceMap: Record<string, PieceType> = {
      Corona: 'Corona',
      Puente: 'Puente',
      Implante: 'Implante',
      Protesis: 'ProtesisParcial',
      ProtesisParcial: 'ProtesisParcial',
      ProtesisTotal: 'ProtesisTotal',
      DienteAusente: 'DienteAusente',
      MantenedorEspacio: 'MantenedorEspacio',
    };
    return pieceMap[piece] ?? null;
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  /** Actualiza dientes en la versión activa sin crear versión nueva */
  save() {
    if (!this.odontogram || this.isSaving) return;

    const isCreate = !this.originalOdontogram;
    const payload = this.buildVersioningPayload();

    this.isSaving = true;
    this.showSaveMessage('info', 'Guardando odontograma...', false);

    const request$ = isCreate
      ? this.odontogramService.create(payload)
      : this.odontogramService.patch(this.originalOdontogram!.id!, payload);

    request$
      .pipe(finalize(() => { this.isSaving = false; }))
      .subscribe({
        next: (response) => {
          if (response.tipo === 'PEDIATRICO') {
            this.odontogramTipo = 'PEDIATRICO';
          } else if (response.tipo === 'MIXTO') {
            this.odontogramTipo = 'MIXTO';
          }
          this.originalOdontogram = {
            id: response.id,
            patientId: response.pacienteId,
            date: response.fecha,
            teeth: [],
            version: response.version,
          };
          this.odontogram = structuredClone(this.originalOdontogram);

          const { diagnoses, pieces } = this.buildDiagnosesFromBackend(response);
          this.diagnoses.set(diagnoses);
          this.pieces.set(pieces);
          this.loadCobros();

          this.showSaveMessage(
            'success',
            isCreate ? 'Odontograma creado correctamente.' : 'Cambios guardados en la versión actual.',
            true,
            3000,
          );
        },
        error: () => {
          this.showSaveMessage('error', 'No se pudo guardar el odontograma.', true, 4000);
        },
      });
  }

  /** Abre la confirmación de nueva versión, consultando movimientos pendientes */
  prepararNuevaVersion(): void {
    if (!this.originalOdontogram?.id || this.isSaving) return;

    this.checkingPendientes = true;
    this.movimientosPendientes = [];

    this.finanzasService.getByOdontograma(this.originalOdontogram.id).subscribe({
      next: (res) => {
        this.movimientosPendientes = res.data.filter(m => m.estado === 'PENDIENTE');
        this.checkingPendientes = false;
        this.showVersionModal = true;
      },
      error: () => {
        this.checkingPendientes = false;
        this.showVersionModal = true;
      },
    });
  }

  cancelarNuevaVersion(): void {
    this.showVersionModal = false;
    this.movimientosPendientes = [];
  }

  /** Crea una nueva versión, archivando la actual */
  confirmarNuevaVersion(): void {
    if (!this.originalOdontogram?.id || this.isSaving) return;

    const payload = this.buildVersioningPayload();
    this.isSaving = true;
    this.showVersionModal = false;
    this.showSaveMessage('info', 'Creando nueva versión...', false);

    this.odontogramService.update(this.originalOdontogram.id, payload)
      .pipe(finalize(() => { this.isSaving = false; }))
      .subscribe({
        next: (response) => {
          if (response.tipo === 'PEDIATRICO') this.odontogramTipo = 'PEDIATRICO';
          else if (response.tipo === 'MIXTO') this.odontogramTipo = 'MIXTO';

          this.originalOdontogram = {
            id: response.id,
            patientId: response.pacienteId,
            date: response.fecha,
            teeth: [],
            version: response.version,
          };
          this.odontogram = structuredClone(this.originalOdontogram);

          const { diagnoses, pieces } = this.buildDiagnosesFromBackend(response);
          this.diagnoses.set(diagnoses);
          this.pieces.set(pieces);
          this.loadCobros();
          this.historial = [];
          this.historialVisible = false;

          this.showSaveMessage(
            'success',
            `Versión ${response.version} creada correctamente.`,
            true,
            4000,
          );
        },
        error: () => {
          this.showSaveMessage('error', 'No se pudo crear la nueva versión.', true, 4000);
        },
      });
  }

  // ── Historial ─────────────────────────────────────────────────────────────
  toggleHistorial(): void {
    this.historialVisible = !this.historialVisible;
    if (this.historialVisible && this.historial.length === 0) {
      this.loadHistorial();
    }
  }

  private loadHistorial(): void {
    this.historialLoading = true;
    this.odontogramService.getHistorial(this.patientId).subscribe({
      next: (data) => {
        // Excluir la versión activa actual
        this.historial = data.filter(v => !v.activo).sort((a, b) => b.version - a.version);
        this.historialLoading = false;
      },
      error: () => { this.historialLoading = false; },
    });
  }

  abrirVersionModal(version: BackendOdontogramResponse): void {
    this.versionModal = version;
    this.versionModalVisible = true;
  }

  cerrarVersionModal(): void {
    this.versionModal = null;
    this.versionModalVisible = false;
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  goToHistoria(): void {
    this.router.navigate(['/history', this.patientId]);
  }

  goToFinance(): void {
    this.router.navigate(['/finance'], { queryParams: { pacienteId: this.patientId } });
  }

  // ── Mensajes ──────────────────────────────────────────────────────────────
  private showSaveMessage(
    type: 'success' | 'error' | 'info',
    message: string,
    autoClear = true,
    duration = 3000,
  ): void {
    this.saveMessageType = type;
    this.saveMessage = message;
    if (!autoClear) return;
    setTimeout(() => {
      if (this.saveMessage === message) {
        this.saveMessage = '';
        this.saveMessageType = '';
      }
    }, duration);
  }

  // ── Hover de fila agrupada ────────────────────────────────────────────────
  hoveredTooth: number | null = null;

  // ── Modal guía ────────────────────────────────────────────────────────────
  showToothGuideModal = false;

  openToothGuideModal(): void {
    this.showToothGuideModal = true;
  }

  closeToothGuideModal(): void {
    this.showToothGuideModal = false;
  }
}
