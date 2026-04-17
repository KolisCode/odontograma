import { CommonModule } from '@angular/common';
import { Component, signal, computed, OnInit, effect } from '@angular/core';
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
import { Navbar } from '../../complements/navbar/navbar';

import { Odontogram } from '../interfaces/odontogram';
import { OdontogramPayload } from '../interfaces/odontogram-payload';
import { BackendOdontogramResponse } from '../interfaces/backend-odontogram-response';
import { Footer } from '../../complements/footer/footer';
import { ActivatedRoute, Router } from '@angular/router';

import { PatientsService } from '../../user/service/pacientes.service';

@Component({
  selector: 'app-odontogram',
  standalone: true,
  imports: [CommonModule, ToothComponent, Navbar, Footer],
  templateUrl: './odontogram.html',
  styleUrl: './odontogram.css',
})
export class OdontogramComponent implements OnInit {
  // Arcada superior
  upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  // Arcada inferior
  lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  // ── Selección activa ──────────────────────────────────────────────────────
  selectedDiagnosis: DiagnosisType | null = null;
  selectedPiece: PieceType | null = null;
  activeTab: 'diagnoses' | 'pieces' = 'diagnoses';

  // ── Datos ─────────────────────────────────────────────────────────────────
  diagnoses = signal<Diagnosis[]>([]);
  pieces = signal<ToothPiece[]>([]);

  // ── Opciones de panel ─────────────────────────────────────────────────────
  quickDiagnoses: { type: DiagnosisType; label: string }[] = [
    { type: 'Caries',             label: 'Caries' },
    { type: 'Obturacion',         label: 'Obturación' },
    { type: 'Fractura',           label: 'Fractura' },
    { type: 'Sellante',           label: 'Sellante' },
    { type: 'Extraccion',         label: 'Extracción' },
    { type: 'Endodoncia',         label: 'Endodoncia' },
    { type: 'TratamientoConducto',label: 'Trat. Conducto' },
    { type: 'Sano',               label: 'Sano' },
  ];

  quickPieces: { type: PieceType; label: string; icon: string }[] = [
    { type: 'Corona',         label: 'Corona',            icon: '♛' },
    { type: 'Puente',         label: 'Puente',            icon: '⊓⊔' },
    { type: 'Implante',       label: 'Implante',          icon: '⚙' },
    { type: 'ProtesisParcial',label: 'Prót. Parcial',     icon: '⌒' },
    { type: 'ProtesisTotal',  label: 'Prót. Total',       icon: '⊙' },
    { type: 'DienteAusente',  label: 'Diente Ausente',    icon: '✕' },
  ];

  // ── Info del paciente ─────────────────────────────────────────────────────
  patientId!: number;
  patientName = 'Paciente';
  patientDocument = '';

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
      // Toggle: si ya existe esa combinación diente+tipo, se quita; si no, se añade
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
  };

  private readonly pieceLabels: Record<PieceType, string> = {
    Corona: 'Corona',
    Puente: 'Puente',
    Implante: 'Implante',
    ProtesisParcial: 'Prót. Parcial',
    ProtesisTotal: 'Prót. Total',
    DienteAusente: 'Diente Ausente',
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

  // ── Constructor y ciclo de vida ───────────────────────────────────────────
  constructor(
    private odontogramService: OdontogramService,
    private route: ActivatedRoute,
    private patientsService: PatientsService,
    private router: Router,
  ) {
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
      },
      error: () => {
        this.patientName = `Paciente #${this.patientId}`;
        this.patientDocument = '';
      },
    });
  }

  private loadOdontogram(): void {
    this.odontogramService.getActive(this.patientId).subscribe({
      next: (data) => {
        if (!data) {
          this.originalOdontogram = null;
          this.odontogram = { patientId: this.patientId, date: new Date().toISOString(), teeth: [] };
          this.diagnoses.set([]);
          this.pieces.set([]);
          return;
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
      },
      error: () => {
        this.originalOdontogram = null;
        this.odontogram = { patientId: this.patientId, date: new Date().toISOString(), teeth: [] };
        this.diagnoses.set([]);
        this.pieces.set([]);
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

    // Diagnósticos (por superficie)
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

    // Piezas protésicas (superficie especial 'P')
    for (const piece of this.pieces()) {
      if (!teethMap.has(piece.tooth)) {
        teethMap.set(piece.tooth, { number: piece.tooth, surfaces: [] });
      }
      const toothEntry = teethMap.get(piece.tooth)!;
      // Reemplazar cualquier pieza previa del mismo diente
      const existingPieceIdx = toothEntry.surfaces.findIndex((s) => s.surface === ('P' as any));
      if (existingPieceIdx !== -1) {
        toothEntry.surfaces[existingPieceIdx].diagnoses = [piece.type as any];
      } else {
        toothEntry.surfaces.push({ surface: 'P' as any, diagnoses: [piece.type as any] });
      }
    }

    return Array.from(teethMap.values());
  }

  private buildVersioningPayload(): OdontogramPayload {
    const teeth = this.buildBackendStructure();
    return {
      pacienteId: this.patientId,
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

        // Piezas protésicas (superficie especial 'P')
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
    };
    return diagnosisMap[diagnosis] ?? null;
  }

  private mapBackendPieceType(piece: string): PieceType | null {
    const pieceMap: Record<string, PieceType> = {
      Corona: 'Corona',
      Puente: 'Puente',
      Implante: 'Implante',
      Protesis: 'ProtesisParcial',       // compatibilidad con datos previos
      ProtesisParcial: 'ProtesisParcial',
      ProtesisTotal: 'ProtesisTotal',
      DienteAusente: 'DienteAusente',
    };
    return pieceMap[piece] ?? null;
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  save() {
    if (!this.odontogram || this.isSaving) return;

    const isCreate = !this.originalOdontogram;
    const payload = this.buildVersioningPayload();

    this.isSaving = true;
    this.showSaveMessage('info', 'Guardando odontograma...', false);

    const request$ = isCreate
      ? this.odontogramService.create(payload)
      : this.odontogramService.update(this.originalOdontogram!.id!, payload);

    request$
      .pipe(finalize(() => { this.isSaving = false; }))
      .subscribe({
        next: (response) => {
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

          this.showSaveMessage(
            'success',
            isCreate ? 'Odontograma guardado correctamente.' : 'Odontograma actualizado correctamente.',
            true,
            3000,
          );
        },
        error: (error) => {
          console.error('Error al guardar odontograma:', error);
          this.showSaveMessage('error', 'No se pudo guardar el odontograma.', true, 4000);
        },
      });
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  goToHistoria(): void {
    this.router.navigate(['/history', this.patientId]);
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

  // ── Modal guía ────────────────────────────────────────────────────────────
  showToothGuideModal = false;

  openToothGuideModal(): void {
    this.showToothGuideModal = true;
  }

  closeToothGuideModal(): void {
    this.showToothGuideModal = false;
  }
}
