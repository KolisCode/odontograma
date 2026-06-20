import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ToothSurface } from '../../types/tooth-surface';
import { SurfaceDiagnosis } from '../../interfaces/surface-diagnosis';
import { PieceType } from '../../types/piece-type';

@Component({
  selector: 'app-tooth',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tooth.html',
  styleUrl: './tooth.css',
})
export class Tooth {
  @Input() number!: number;

  @Input() filledFaces: SurfaceDiagnosis[] = [];
  @Input() contextFaces: SurfaceDiagnosis[] = [];

  @Input() pieces: PieceType[] = [];
  @Input() contextPieces: PieceType[] = [];

  @Input() isPrimary = false;

  @Input() readonly = false;

  /** true para arcada inferior (Q3/Q4): invierte Vestibular↔Lingual en arriba/abajo */
  @Input() lowerArch = false;

  /** true para cuadrantes derechos (Q1/Q4): intercambia Mesial↔Distal */
  @Input() mirrorMesialDistal = false;

  // ── Superficies según arcada ───────────────────────────────────────────────

  /** Superficie que queda arriba en el SVG */
  get topSurface(): ToothSurface {
    return this.lowerArch ? 'Lingual' : 'Vestibular';
  }

  /** Superficie que queda abajo en el SVG */
  get bottomSurface(): ToothSurface {
    return this.lowerArch ? 'Vestibular' : 'Palatina';
  }

  /** Superficie central (siempre oclusal) */
  readonly centerSurface: ToothSurface = 'Oclusal';

  hasPiece(type: PieceType): boolean {
    return this.pieces.includes(type);
  }

  hasContextPiece(type: PieceType): boolean {
    return this.contextPieces.includes(type);
  }

  getContextFaceClass(surface: ToothSurface): string {
    const effective = this.effectiveSurface(surface);
    const face = this.contextFaces.find(f => f.surface === effective);
    if (!face || face.diagnoses.length === 0) return '';
    return this.diagnosisClassMap[face.diagnoses[face.diagnoses.length - 1]] || '';
  }

  @Output() surfaceClick = new EventEmitter<{
    tooth: number;
    surface: ToothSurface;
  }>();

  private readonly diagnosisClassMap: Record<string, string> = {
    // Diagnósticos
    Caries: 'diagnosis-caries',
    Obturacion: 'diagnosis-obturacion',
    Fractura: 'diagnosis-fractura',
    Sellante: 'diagnosis-sellante',
    Extraccion: 'diagnosis-extraccion',
    Endodoncia: 'diagnosis-endodoncia',
    TratamientoConducto: 'diagnosis-tratamiento-conducto',
    Sano: 'diagnosis-sano',
    Pulpotomia: 'diagnosis-pulpotomia',
    Pulpectomia: 'diagnosis-pulpectomia',
    // Procedimientos de plan de tratamiento
    Resina: 'plan-resina',
    Profilaxis: 'plan-profilaxis',
    Blanqueamiento: 'plan-blanqueamiento',
    Exodoncia: 'plan-exodoncia',
    TratamientoPeriodontal: 'plan-tratamiento-periodontal',
    Cirugia: 'plan-cirugia',
  };

  /** Intercambia Mesial↔Distal para los cuadrantes que lo requieren. */
  private effectiveSurface(surface: ToothSurface): ToothSurface {
    if (!this.mirrorMesialDistal) return surface;
    if (surface === 'Mesial') return 'Distal';
    if (surface === 'Distal') return 'Mesial';
    return surface;
  }

  faceClicked(surface: ToothSurface) {
    if (this.readonly) return;
    this.surfaceClick.emit({
      tooth: this.number,
      surface: this.effectiveSurface(surface),
    });
  }

  getFaceDiagnoses(surface: ToothSurface): string[] {
    const face = this.filledFaces.find((f) => f.surface === this.effectiveSurface(surface));
    if (!face) return [];
    return face.diagnoses.slice(0, 4);
  }

  getFaceClass(surface: ToothSurface): string {
    const diagnoses = this.getFaceDiagnoses(surface);
    if (diagnoses.length === 0) return '';
    const diagnosis = diagnoses[diagnoses.length - 1];
    return this.diagnosisClassMap[diagnosis] || '';
  }

  getDiagnosisCssClass(diagnosis: string): string {
    return this.diagnosisClassMap[diagnosis] || '';
  }

  hasMultipleDiagnoses(surface: ToothSurface): boolean {
    return this.getFaceDiagnoses(surface).length > 1;
  }

  getFaceTooltip(surface: ToothSurface): string {
    const effective = this.effectiveSurface(surface);
    const face = this.filledFaces.find((f) => f.surface === effective);

    if (!face) return `Diente: ${this.number} - Cara: ${effective}`;

    return `Diente: ${this.number} - Cara: ${effective} - Tiene: ${face.diagnoses.join(', ')}`;
  }

  getToothType(): string {
    const n = this.number;
    const lastDigit = n % 10;

    if (lastDigit === 1 || lastDigit === 2) return 'incisor';
    if (lastDigit === 3) return 'canine';
    if (lastDigit === 4 || lastDigit === 5) return this.isPrimary ? 'molar' : 'premolar';

    return 'molar';
  }
}
