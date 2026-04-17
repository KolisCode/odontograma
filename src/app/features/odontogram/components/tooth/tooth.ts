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

  @Input() piece: PieceType | null = null;

  @Output() surfaceClick = new EventEmitter<{
    tooth: number;
    surface: ToothSurface;
  }>();

  private diagnosisClassMap: Record<string, string> = {
    Caries: 'diagnosis-caries',
    Obturacion: 'diagnosis-obturacion',
    Fractura: 'diagnosis-fractura',
    Sellante: 'diagnosis-sellante',
    Extraccion: 'diagnosis-extraccion',
    Endodoncia: 'diagnosis-endodoncia',
    TratamientoConducto: 'diagnosis-tratamiento-conducto',
    Sano: 'diagnosis-sano',
  };

  faceClicked(surface: ToothSurface) {
    this.surfaceClick.emit({
      tooth: this.number,
      surface,
    });
  }

  getFaceDiagnoses(surface: ToothSurface): string[] {
    const face = this.filledFaces.find((f) => f.surface === surface);
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
    const face = this.filledFaces.find((f) => f.surface === surface);

    if (!face) return `Diente: ${this.number} - Cara: ${surface}`;

    return `Diente: ${this.number} - Cara: ${surface} - Tiene: ${face.diagnoses.join(', ')}`;
  }

  getToothType(): string {
    const n = this.number;
    const lastDigit = n % 10;

    if (lastDigit === 1 || lastDigit === 2) return 'incisor';
    if (lastDigit === 3) return 'canine';
    if (lastDigit === 4 || lastDigit === 5) return 'premolar';

    return 'molar';
  }
}