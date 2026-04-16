import { CommonModule } from '@angular/common';
import { Component, signal, computed, OnInit, effect } from '@angular/core';
import { finalize } from 'rxjs';

import { Tooth as ToothComponent } from '../components/tooth/tooth';
import { Diagnosis } from '../interfaces/diagnosis';
import { Tooth } from '../interfaces/tooth';
import { SurfaceDiagnosis } from '../interfaces/surface-diagnosis';

import { ToothSurface } from '../types/tooth-surface';
import { DiagnosisType } from '../types/diagnosis-type';

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
  pacienteId!: number;

  // Arcada inferior
  lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  selectedDiagnosis: DiagnosisType | null = null;

  diagnoses = signal<Diagnosis[]>([]);

  quickDiagnoses: { type: DiagnosisType; label: string; cssClass: string }[] = [
    { type: 'Caries', label: 'Caries', cssClass: 'diagnosis-caries' },
    { type: 'Obturacion', label: 'Obturación', cssClass: 'diagnosis-obturacion' },
    { type: 'Fractura', label: 'Fractura', cssClass: 'diagnosis-fractura' },
    { type: 'Sellante', label: 'Sellante', cssClass: 'diagnosis-sellante' },
    { type: 'Extraccion', label: 'Extracción', cssClass: 'diagnosis-extraccion' },
    { type: 'Corona', label: 'Corona', cssClass: 'diagnosis-corona' },
    { type: 'Puente', label: 'Puente', cssClass: 'diagnosis-puente' },
    { type: 'Implante', label: 'Implante', cssClass: 'diagnosis-implante' },
    { type: 'Endodoncia', label: 'Endodoncia', cssClass: 'diagnosis-endodoncia' },
    { type: 'TratamientoConducto', label: 'Trat. Conducto', cssClass: 'diagnosis-tratamiento-conducto' },
    { type: 'Protesis', label: 'Prótesis', cssClass: 'diagnosis-protesis' },
    { type: 'Sano', label: 'Sano', cssClass: 'diagnosis-sano' },
  ];

  patientId!: number;
  patientName = 'Paciente';
  patientDocument = '';

  selectDiagnosis(diagnosis: DiagnosisType) {
    this.selectedDiagnosis = this.selectedDiagnosis === diagnosis ? null : diagnosis;
  }

  clearActiveDiagnosis() {
    this.selectedDiagnosis = null;
  }

  private loadOdontogram(): void {
    this.odontogramService.getActive(this.patientId).subscribe({
      next: (data) => {
        if (!data) {
          this.originalOdontogram = null;
          this.odontogram = {
            patientId: this.patientId,
            date: new Date().toISOString(),
            teeth: [],
          };
          this.diagnoses.set([]);
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

        const diagnosesFromBackend = this.buildDiagnosesFromBackend(data);
        this.diagnoses.set(diagnosesFromBackend);
      },
      error: () => {
        this.originalOdontogram = null;
        this.odontogram = {
          patientId: this.patientId,
          date: new Date().toISOString(),
          teeth: [],
        };
        this.diagnoses.set([]);
        this.showSaveMessage(
          'info',
          'No se pudo consultar el odontograma del paciente.',
          true,
          3000,
        );
      },
    });
  }

  applyDiagnosis(event: { tooth: number; surface: ToothSurface }) {
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
  odontogram: Odontogram | null = null;
  originalOdontogram: Odontogram | null = null;

  isSaving = false;
  saveMessage = '';
  saveMessageType: 'success' | 'error' | 'info' | '' = '';

  constructor(
    private odontogramService: OdontogramService,
    private route: ActivatedRoute,
      private patientsService: PatientsService,
      private router: Router,

  ) {
    effect(() => {
      localStorage.setItem('odontogram-diagnoses', JSON.stringify(this.diagnoses()));
    });
  }

  ngOnInit() {
    
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.pacienteId = Number(id);


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

  private loadPatientInfo(): void {
  this.patientsService.getPatientById(this.patientId).subscribe({
    next: (patient) => {
      this.patientName = `${patient.data.nombre} ${patient.data.apellido}`.trim();
      this.patientDocument = patient.documento || '';
      console.log(patient);
    },
    error: () => {
      this.patientName = `Paciente #${this.patientId}`;
      this.patientDocument = '';
    },
  });
}

  groupedDiagnosesByTooth = computed(() => {
    const grouped = new Map<
      number,
      {
        tooth: number;
        date: string;
        surfaces: {
          surface: ToothSurface;
          diagnoses: DiagnosisType[];
        }[];
      }
    >();

    for (const diagnosis of this.diagnoses()) {
      for (const tooth of diagnosis.teeth) {
        if (!grouped.has(tooth)) {
          grouped.set(tooth, {
            tooth,
            date: diagnosis.date,
            surfaces: [],
          });
        }

        const toothEntry = grouped.get(tooth)!;

        for (const face of diagnosis.faces) {
          const existingSurface = toothEntry.surfaces.find((s) => s.surface === face);

          if (existingSurface) {
            if (!existingSurface.diagnoses.includes(diagnosis.type)) {
              existingSurface.diagnoses = [...existingSurface.diagnoses, diagnosis.type];
            }
          } else {
            toothEntry.surfaces.push({
              surface: face,
              diagnoses: [diagnosis.type],
            });
          }
        }

        if (new Date(diagnosis.date) > new Date(toothEntry.date)) {
          toothEntry.date = diagnosis.date;
        }
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.tooth - b.tooth);
  });

  removeSurfaceRecord(toothNumber: number, surface: ToothSurface): void {
    this.diagnoses.update((current) =>
      current
        .map((diagnosis) => {
          if (!diagnosis.teeth.includes(toothNumber)) {
            return diagnosis;
          }

          const updatedFaces = diagnosis.faces.filter((face) => face !== surface);

          if (updatedFaces.length === 0) {
            return null;
          }

          return {
            ...diagnosis,
            faces: updatedFaces,
          };
        })
        .filter((diagnosis): diagnosis is Diagnosis => diagnosis !== null),
    );
  }
  private buildBackendStructure(): Tooth[] {
    const teethMap = new Map<number, Tooth>();

    for (const d of this.diagnoses()) {
      for (const tooth of d.teeth) {
        if (!teethMap.has(tooth)) {
          teethMap.set(tooth, {
            number: tooth,
            surfaces: [],
          });
        }

        const toothEntry = teethMap.get(tooth)!;

        for (const face of d.faces) {
          const existingSurface = toothEntry.surfaces.find((s) => s.surface === face);

          if (existingSurface) {
            if (!existingSurface.diagnoses.includes(d.type)) {
              existingSurface.diagnoses.push(d.type);
            }
          } else {
            toothEntry.surfaces.push({
              surface: face,
              diagnoses: [d.type],
            });
          }
        }
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
            superficie: this.mapFrontendSurfaceToBackend(surface.surface),
            diagnostico: diagnosis,
          })),
        ),
      })),
    };
  }
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
            surfaces.push({
              surface: face,
              diagnoses: [diagnosis.type],
            });
          }
        }
      }
    }

    return map;
  });

  diagnosisSummary = computed(() => {
    const summary: Partial<Record<DiagnosisType, number>> = {};
    for (const d of this.diagnoses()) {
      summary[d.type] = (summary[d.type] || 0) + 1;
    }

    return summary;
  });

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

  save() {
    if (!this.odontogram || this.isSaving) return;

    const isCreate = !this.originalOdontogram;
    const payload = this.buildVersioningPayload();

    this.isSaving = true;
    this.showSaveMessage('info', 'Guardando odontograma...', false);

    console.log('Diagnoses actuales:', JSON.stringify(this.diagnoses(), null, 2));
    console.log('Payload para backend:', JSON.stringify(payload, null, 2));

    const request$ = isCreate
      ? this.odontogramService.create(payload)
      : this.odontogramService.update(this.originalOdontogram!.id!, payload);

    request$
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('Respuesta del backend:', response);

          this.originalOdontogram = {
            id: response.id,
            patientId: response.pacienteId,
            date: response.fecha,
            teeth: [],
            version: response.version,
          };

          this.odontogram = structuredClone(this.originalOdontogram);

          const diagnosesFromBackend = this.buildDiagnosesFromBackend(response);
          this.diagnoses.set(diagnosesFromBackend);

          this.showSaveMessage(
            'success',
            isCreate
              ? 'Odontograma guardado correctamente.'
              : 'Odontograma actualizado correctamente.',
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

  goToHistoria(): void {
    this.router.navigate(['/history', this.pacienteId]);
  }

  private buildDiagnosesFromBackend(rawOdontogram: BackendOdontogramResponse): Diagnosis[] {
    const grouped = new Map<string, Diagnosis>();
    const dientes = rawOdontogram?.dientes ?? [];
    const fecha = rawOdontogram?.fecha ?? new Date().toISOString();

    for (const diente of dientes) {
      const numero = diente?.numero;
      const superficies = diente?.superficies ?? [];

      for (const superficie of superficies) {
        const mappedSurface = this.mapBackendSurface(superficie?.superficie);
        const mappedDiagnosis = this.mapBackendDiagnosis(superficie?.diagnostico);

        if (!numero || !mappedSurface || !mappedDiagnosis) continue;

        const key = `${numero}-${mappedDiagnosis}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            teeth: [numero],
            faces: [mappedSurface],
            type: mappedDiagnosis,
            date: fecha,
          });
        } else {
          const existing = grouped.get(key)!;

          if (!existing.faces.includes(mappedSurface)) {
            existing.faces = [...existing.faces, mappedSurface];
          }
        }
      }
    }

    return Array.from(grouped.values());
  }

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
      Corona: 'Corona',
      Puente: 'Puente',
      Implante: 'Implante',
      Endodoncia: 'Endodoncia',
      TratamientoConducto: 'TratamientoConducto',
      Protesis: 'Protesis',
      Sano: 'Sano',
    };

    return diagnosisMap[diagnosis] ?? null;
  }

  showToothGuideModal = false;

  openToothGuideModal(): void {
    this.showToothGuideModal = true;
  }

  closeToothGuideModal(): void {
    this.showToothGuideModal = false;
  }
}
