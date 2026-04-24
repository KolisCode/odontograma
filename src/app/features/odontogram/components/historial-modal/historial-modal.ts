import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { BackendOdontogramResponse } from '../../interfaces/backend-odontogram-response';
import { Tooth as ToothComponent } from '../tooth/tooth';
import { SurfaceDiagnosis } from '../../interfaces/surface-diagnosis';
import { ToothPiece } from '../../interfaces/tooth-piece';
import { DiagnosisType } from '../../types/diagnosis-type';
import { PieceType } from '../../types/piece-type';
import { ToothSurface } from '../../types/tooth-surface';

interface DiagnosisRow {
  diente: number;
  cara: string;
  diagnostico: string;
  esTemporal: boolean;
}

@Component({
  selector: 'app-odontogram-historial-modal',
  standalone: true,
  imports: [CommonModule, ToothComponent],
  templateUrl: './historial-modal.html',
  styleUrl: './historial-modal.css',
})
export class OdontogramHistorialModal implements OnChanges {
  @Input() version: BackendOdontogramResponse | null = null;
  @Input() visible = false;
  @Output() cerrar = new EventEmitter<void>();

  // Arcadas (mismo layout que odontogram principal)
  upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  upperLeft  = [21, 22, 23, 24, 25, 26, 27, 28];
  lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  lowerLeft  = [31, 32, 33, 34, 35, 36, 37, 38];
  pediatricUpperRight = [55, 54, 53, 52, 51];
  pediatricUpperLeft  = [61, 62, 63, 64, 65];
  pediatricLowerRight = [85, 84, 83, 82, 81];
  pediatricLowerLeft  = [71, 72, 73, 74, 75];
  mixedUpperRight = [18, 17, 16, 55, 54, 53, 52, 51];
  mixedUpperLeft  = [61, 62, 63, 64, 65, 26, 27, 28];
  mixedLowerRight = [48, 47, 46, 85, 84, 83, 82, 81];
  mixedLowerLeft  = [71, 72, 73, 74, 75, 36, 37, 38];

  filledFacesMap = new Map<number, SurfaceDiagnosis[]>();
  piecesMap      = new Map<number, PieceType[]>();
  diagnosisRows: DiagnosisRow[] = [];

  get tipo(): string { return this.version?.tipo ?? 'ADULTO'; }
  get isPediatric(): boolean { return this.tipo === 'PEDIATRICO'; }
  get isMixed(): boolean { return this.tipo === 'MIXTO'; }

  isPrimaryTooth(n: number): boolean {
    return (n >= 51 && n <= 55) || (n >= 61 && n <= 65) ||
           (n >= 71 && n <= 75) || (n >= 81 && n <= 85);
  }

  getFilledFaces(tooth: number): SurfaceDiagnosis[] {
    return this.filledFacesMap.get(tooth) ?? [];
  }

  getPieces(tooth: number): PieceType[] {
    return this.piecesMap.get(tooth) ?? [];
  }

  ngOnChanges(): void {
    if (this.version) {
      this.buildMaps(this.version);
    }
  }

  private buildMaps(data: BackendOdontogramResponse): void {
    const facesMap = new Map<number, Map<ToothSurface, string[]>>();
    const piecesMap = new Map<number, PieceType[]>();
    const rows: DiagnosisRow[] = [];

    const surfaceMap: Record<string, ToothSurface> = {
      M: 'Mesial', D: 'Distal', V: 'Centro', C: 'Centro', L: 'Lingual', O: 'Oclusal',
    };

    for (const diente of data.dientes ?? []) {
      for (const sup of diente.superficies ?? []) {
        if (sup.superficie === 'P') {
          const pieceType = this.mapPiece(sup.diagnostico);
          if (pieceType) {
            if (!piecesMap.has(diente.numero)) piecesMap.set(diente.numero, []);
            piecesMap.get(diente.numero)!.push(pieceType);
            rows.push({
              diente: diente.numero,
              cara: 'Pieza',
              diagnostico: this.pieceLabel(pieceType),
              esTemporal: this.isPrimaryTooth(diente.numero),
            });
          }
          continue;
        }

        const surface = surfaceMap[sup.superficie];
        if (!surface) continue;

        if (!facesMap.has(diente.numero)) facesMap.set(diente.numero, new Map());
        const toothFaces = facesMap.get(diente.numero)!;
        if (!toothFaces.has(surface)) toothFaces.set(surface, []);
        toothFaces.get(surface)!.push(sup.diagnostico as string);

        rows.push({
          diente: diente.numero,
          cara: surface,
          diagnostico: this.diagLabel(sup.diagnostico as DiagnosisType),
          esTemporal: this.isPrimaryTooth(diente.numero),
        });
      }
    }

    this.filledFacesMap = new Map(
      Array.from(facesMap.entries()).map(([tooth, surfaces]) => [
        tooth,
        Array.from(surfaces.entries()).map(([surface, diagnoses]) => ({
          surface,
          diagnoses: diagnoses as DiagnosisType[],
        })),
      ]),
    );
    this.piecesMap = piecesMap;
    this.diagnosisRows = rows.sort((a, b) => a.diente - b.diente);
  }

  private mapPiece(raw: string): PieceType | null {
    const map: Record<string, PieceType> = {
      Corona: 'Corona', Puente: 'Puente', Implante: 'Implante',
      ProtesisParcial: 'ProtesisParcial', Protesis: 'ProtesisParcial',
      ProtesisTotal: 'ProtesisTotal', DienteAusente: 'DienteAusente',
      MantenedorEspacio: 'MantenedorEspacio',
    };
    return map[raw] ?? null;
  }

  private diagLabel(type: DiagnosisType): string {
    const map: Record<string, string> = {
      Caries: 'Caries', Obturacion: 'Obturación', Fractura: 'Fractura',
      Sellante: 'Sellante', Extraccion: 'Extracción', Endodoncia: 'Endodoncia',
      TratamientoConducto: 'Tratamiento de conducto', Sano: 'Sano',
      Pulpotomia: 'Pulpotomía', Pulpectomia: 'Pulpectomía',
    };
    return map[type] ?? type;
  }

  private pieceLabel(type: PieceType): string {
    const map: Record<string, string> = {
      Corona: 'Corona', Puente: 'Puente', Implante: 'Implante',
      ProtesisParcial: 'Prótesis parcial', ProtesisTotal: 'Prótesis total',
      DienteAusente: 'Diente ausente', MantenedorEspacio: 'Mant. espacio',
    };
    return map[type] ?? type;
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
