import { CommonModule } from '@angular/common';
import { Component, signal, computed, OnInit, effect } from '@angular/core';
import { Tooth } from '../components/tooth/tooth';
import { Diagnosis } from '../interfaces/diagnosis';
import { FormsModule } from '@angular/forms';
import { OdontogramService } from '../../../services/odontogram';
import { Navbar } from "../../complements/navbar/navbar";

@Component({
  selector: 'app-odontogram',
  standalone: true,
  imports: [CommonModule, Tooth, FormsModule, Navbar],
  templateUrl: './odontogram.html',
  styleUrl: './odontogram.css',
})
export class Odontogram implements OnInit {
  // Arcada superior
  upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];

  // Arcada inferior
  lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  // Caras disponibles
  faces = [
    { code: 'V', label: 'Vestibular' },
    { code: 'L', label: 'Lingual' },
    { code: 'M', label: 'Mesial' },
    { code: 'D', label: 'Distal' },
    { code: 'O', label: 'Oclusal' },
  ];

  diagnoses = signal<Diagnosis[]>(this.loadFromStorage());
  selectedDiagnosisType: string = '';

  odontogram: any | null = null;
  originalOdontogram: any | null = null;

  ngOnInit() {
    const patientId = 1; // luego vendrá de ruta

    this.odontogramService.getActive(patientId).subscribe({
      next: (data) => {
        this.odontogram = structuredClone(data);
        this.originalOdontogram = structuredClone(data);
      },
      error: () => {
        // Si no existe, crear estructura vacía
        this.odontogram = {
          pacienteId: patientId,
          fecha: new Date().toISOString(),
          dientes: [],
        };
      },
    });
  }

  private loadFromStorage(): Diagnosis[] {
    const data = localStorage.getItem('odontogram-diagnoses');
    return data ? JSON.parse(data) : [];
  }

  // Guarda los dientes seleccionados
  selectedTeeth = new Set<number>();

  constructor(private odontogramService: OdontogramService) {
    effect(() => {
      localStorage.setItem('odontogram-diagnoses', JSON.stringify(this.diagnoses()));
    });
  }

  private buildBackendStructure() {
    const dientesMap = new Map<number, any>();

    for (const d of this.diagnoses()) {
      for (const tooth of d.teeth) {
        if (!dientesMap.has(tooth)) {
          dientesMap.set(tooth, {
            numero: tooth,
            superficies: [],
          });
        }

        const toothEntry = dientesMap.get(tooth);

        for (const face of d.faces) {
          toothEntry.superficies.push({
            superficie: face,
            diagnostico: d.type,
          });
        }
      }
    }

    return Array.from(dientesMap.values());
  }

  /*
   * Alterna la selección de un diente.
   * Si ya está seleccionado → lo elimina.
   * Si no está → lo agrega.
   */
  toggleTooth(tooth: number): void {
    if (this.selectedTeeth.has(tooth)) {
      this.selectedTeeth.delete(tooth);
    } else {
      this.selectedTeeth.add(tooth);
    }
  }

  /**
   * Alterna la selección de una cara.
   */
  toggleFace(face: string): void {
    if (this.selectedFaces.has(face)) {
      this.selectedFaces.delete(face);
    } else {
      this.selectedFaces.add(face);
    }
  }

  get selectedTeethArray(): number[] {
    return Array.from(this.selectedTeeth);
  }

  // Caras seleccionadas temporalmente
  selectedFaces = new Set<string>();

  confirmDiagnosis() {
    if (
      this.selectedTeeth.size === 0 ||
      this.selectedFaces.size === 0 ||
      !this.selectedDiagnosisType
    ) {
      alert('Debe seleccionar dientes, caras y diagnóstico.');
      return;
    }

    const newDiagnosis: Diagnosis = {
      teeth: Array.from(this.selectedTeeth),
      faces: Array.from(this.selectedFaces),
      type: this.selectedDiagnosisType,
      date: new Date(),
    };

    this.diagnoses.update((current) => [...current, newDiagnosis]);

    // Quitar solo el estado visual de selección
    this.selectedTeeth.clear();
    this.selectedFaces.clear();
  }

  toothFaceMap = computed(() => {
    const map = new Map<number, { face: string; type: string }[]>();

    for (const diagnosis of this.diagnoses()) {
      for (const tooth of diagnosis.teeth) {
        if (!map.has(tooth)) {
          map.set(tooth, []);
        }

        const currentFaces = map.get(tooth)!;

        for (const face of diagnosis.faces) {
          currentFaces.push({
            face,
            type: diagnosis.type,
          });
        }
      }
    }

    return map;
  });

  clearSelection(): void {
    this.selectedTeeth.clear();
    this.selectedFaces.clear();
    this.selectedDiagnosisType = '';
  }

  removeDiagnosis(index: number): void {
    this.diagnoses.update((current) => current.filter((_, i) => i !== index));
  }

  diagnosisSummary = computed(() => {
    const summary: Record<string, number> = {};

    for (const d of this.diagnoses()) {
      summary[d.type] = (summary[d.type] || 0) + 1;
    }

    return summary;
  });

  save() {
    if (!this.odontogram) return;

    // PACIENTE FIJO TEMPORAL
    const pacienteIdFijo = 1;

    // Sincronizar diagnoses → dientes
    this.odontogram.dientes = this.buildBackendStructure();

    const cleaned = this.cleanOdontogram({
      ...this.odontogram,
      pacienteId: pacienteIdFijo, // lo forzamos aquí
    });

    console.log('Enviando al backend:', cleaned);

    if (!this.originalOdontogram) {
      this.odontogramService.create(cleaned).subscribe((response) => {
        this.originalOdontogram = structuredClone(response);
        this.odontogram = structuredClone(response);
      });
    } else {
      this.odontogramService.update(this.originalOdontogram.id, cleaned).subscribe((response) => {
        this.originalOdontogram = structuredClone(response);
        this.odontogram = structuredClone(response);
      });
    }
  }

  cleanOdontogram(odontogram: any) {
    return {
      ...odontogram,
      dientes: odontogram.dientes
        .map((tooth: any) => ({
          ...tooth,
          superficies: tooth.superficies.filter((surface: any) => surface.diagnostico),
        }))
        .filter((tooth: any) => tooth.superficies.length > 0),
    };
  }
}
