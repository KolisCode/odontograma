import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Navbar } from '../complements/navbar/navbar';
import { Footer } from '../complements/footer/footer';
import { HistoriaClinicaService } from './historia-clinica.service/historia-clinica.service';
import { DocumentosComponent } from '../documentos/documentos/documentos';

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Navbar, Footer, DocumentosComponent],
  templateUrl: './historia-clinica.html',
  styleUrls: ['./historia-clinica.css'],
})
export class HistoriaClinica implements OnInit, OnDestroy {
  historiaForm: FormGroup;

  pacienteId!: number;
  patientName = 'Paciente';
  aperturaTexto = '';
  loading = false;
  loadingData = true;
  successMessage = '';
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private historiaClinicaService: HistoriaClinicaService,
    private cdr: ChangeDetectorRef,
  ) {
    this.historiaForm = this.fb.group({
      numeroHistoria: [''],

      // Datos personales / complementarios
      estadoCivil: [''],
      sexo: [''],
      ocupacion: [''],
      lugarResidencia: [''],
      acompananteNombre: [''],
      acompananteTelefono: [''],
      acompananteParentesco: [''],

      // Consulta
      motivoConsulta: [''],

      // Enfermedades sistémicas
      sistHipertension: [false],
      sistDiabetes: [false],
      sistCardiacas: [false],
      sistRespiratorias: [false],
      sistRenales: [false],
      sistHepaticas: [false],
      sistEndocrinas: [false],
      sistNeurologicas: [false],
      sistEts: [false],
      sistObservaciones: [''],

      // Quirúrgicos
      hospitalizado: ['No'],
      cirugiasPrevias: ['No'],
      quirurgicosDetalle: [''],

      // Medicación
      tomaMedicamentos: ['No'],
      medicamentos: this.fb.array([this.createMedicamentoGroup()]),

      // Alergias
      alergiaMedicamentos: [false],
      alergiaAnestesia: [false],
      alergiaLatex: [false],
      alergiasDescripcion: [''],

      // Hematológicos
      sangraFacilidad: ['No'],
      problemasCoagulacion: ['No'],
      hematologicosObservaciones: [''],

      // Gineco-obstétricos
      embarazo: ['No'],
      trimestre: ['No aplica'],
      lactancia: ['No'],

      // Hábitos
      fuma: ['No'],
      cigarrillosDia: [''],
      alcohol: ['No'],
      sustanciasPsicoactivas: ['No'],
      habitosObservaciones: [''],

      // Odontológicos
      complicacionesPrevias: ['No'],
      reaccionesAnestesia: ['No'],
      antecedentesOdontoObservaciones: [''],

      // Higiene oral
      cepilladoVecesDia: [''],
      cambioCepillo: [''],
      momentoManana: [false],
      momentoDespuesComidas: [false],
      momentoNoche: [false],
      tipoCepillo: [''],
      cremaConFluor: ['Sí'],
      usaSedaDental: ['No'],
      frecuenciaSedaDental: [''],
      usaEnjuague: ['No'],
      tipoEnjuague: ['No aplica'],
      usaCepillosInterdentales: ['No'],
      usaIrrigador: ['No'],
      frecuenciaOdontologo: ['Cada 6 meses'],
      educacionHigieneOral: ['No'],
      profilaxisReciente: ['No'],
      sangradoEncias: ['No'],
      halitosis: ['No'],
      sensibilidadDental: ['No'],
      movilidadDental: ['No'],
      usaProtesis: ['No'],
      usaOrtodoncia: ['No'],
      limpiezaProtesis: ['No'],

      // Declaración
      declaracionAceptada: [false],
    });
  }

  ngOnInit(): void {
    this.aperturaTexto = this.formatDateTime(new Date());

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const idParam = params.get('id');
      this.pacienteId = Number(idParam);

      if (this.pacienteId) {
        this.loadHistoria();
      } else {
        this.errorMessage = 'No se recibió un paciente válido';
        this.loadingData = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cdr.detectChanges();
  }

  createMedicamentoGroup(data?: any): FormGroup {
    return this.fb.group({
      medicamento: [data?.medicamento || ''],
      dosis: [data?.dosis || ''],
      frecuencia: [data?.frecuencia || ''],
    });
  }

  get medicamentosArray(): FormArray {
    return this.historiaForm.get('medicamentos') as FormArray;
  }

  get patientFirstNames(): string {
    const parts = this.patientName.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(0, -1).join(' ') : this.patientName;
  }

  get patientLastNames(): string {
    const parts = this.patientName.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(-1).join(' ') : '';
  }

  addMedicamento(): void {
    this.medicamentosArray.push(this.createMedicamentoGroup());
  }

  scrollToSection(sectionId: string): void {
  const element = document.getElementById(sectionId);

  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}

  removeMedicamento(index: number): void {
    if (this.medicamentosArray.length > 1 && index >= 0) {
      this.medicamentosArray.removeAt(index);
    }
  }

  loadHistoria(): void {
    this.loadingData = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.historiaClinicaService
      .getHistoriaByPaciente(this.pacienteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const paciente = response?.data?.paciente;
          const historia = response?.data?.historia;

          if (paciente) {
            this.patientName =
              `${paciente.nombre || ''} ${paciente.apellido || ''}`.trim() || 'Paciente';
          }

          if (historia) {
            this.patchHistoria(historia);
            this.aperturaTexto = this.formatDateTime(
              historia.fechaApertura || historia.createdAt || new Date(),
            );
          } else {
            this.resetMedicamentos();
            this.setDefaultHistoriaNumber();
          }

          this.loadingData = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'No se pudo cargar la historia clínica';
          this.loadingData = false;
          this.cdr.detectChanges();
        },
      });
  }

  setDefaultHistoriaNumber(): void {
    const year = new Date().getFullYear();
    const numero = `HC-${year}-${String(this.pacienteId).padStart(4, '0')}`;
    this.historiaForm.patchValue({ numeroHistoria: numero }, { emitEvent: false });
  }

  resetMedicamentos(): void {
    this.medicamentosArray.clear();
    this.medicamentosArray.push(this.createMedicamentoGroup());
  }

  parseJson(value: any): any {
    if (!value) return {};
    if (typeof value === 'object') return value;

    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  patchHistoria(historia: any): void {
    const enfermedades = this.parseJson(historia.enfermedadesSistemicas);
    const higiene = this.parseJson(historia.higieneOral);
    const quirurgicos = this.parseJson(historia.antecedentesQuirurgicos);
    const alergias = this.parseJson(historia.alergiasGenerales);
    const hematologicos = this.parseJson(historia.antecedentesHematologicos);
    const gineco = this.parseJson(historia.ginecoObstetricos);
    const habitos = this.parseJson(historia.habitos);
    const odonto = this.parseJson(historia.antecedentesOdontologicos);
    const medicamentos = Array.isArray(historia.medicacionActual) ? historia.medicacionActual : [];

    this.historiaForm.patchValue(
      {
        numeroHistoria: historia.numeroHistoria || '',
        estadoCivil: historia.estadoCivil || '',
        sexo: historia.sexo || '',
        ocupacion: historia.ocupacion || '',
        lugarResidencia: historia.lugarResidencia || '',
        acompananteNombre: historia.acompananteNombre || '',
        acompananteTelefono: historia.acompananteTelefono || '',
        acompananteParentesco: historia.acompananteParentesco || '',
        motivoConsulta: historia.motivoConsulta || '',

        // Enfermedades sistémicas
        sistHipertension: !!enfermedades.hipertension,
        sistDiabetes: !!enfermedades.diabetes,
        sistCardiacas: !!enfermedades.cardiacas,
        sistRespiratorias: !!enfermedades.respiratorias,
        sistRenales: !!enfermedades.renales,
        sistHepaticas: !!enfermedades.hepaticas,
        sistEndocrinas: !!enfermedades.endocrinas,
        sistNeurologicas: !!enfermedades.neurologicas,
        sistEts: !!enfermedades.ets,
        sistObservaciones: enfermedades.observaciones || '',

        // Quirúrgicos
        hospitalizado: quirurgicos.hospitalizado || 'No',
        cirugiasPrevias: quirurgicos.cirugiasPrevias || 'No',
        quirurgicosDetalle: quirurgicos.detalle || '',

        // Medicación
        tomaMedicamentos: medicamentos.length > 0 ? 'Sí' : 'No',

        // Alergias
        alergiaMedicamentos: !!alergias.medicamentos,
        alergiaAnestesia: !!alergias.anestesia,
        alergiaLatex: !!alergias.latex,
        alergiasDescripcion: alergias.descripcion || '',

        // Hematológicos
        sangraFacilidad: hematologicos.sangraFacilidad || 'No',
        problemasCoagulacion: hematologicos.problemasCoagulacion || 'No',
        hematologicosObservaciones: hematologicos.observaciones || '',

        // Gineco-obstétricos
        embarazo: gineco.embarazo || 'No',
        trimestre: gineco.trimestre || 'No aplica',
        lactancia: gineco.lactancia || 'No',

        // Hábitos
        fuma: habitos.fuma || 'No',
        cigarrillosDia: habitos.cigarrillosDia || '',
        alcohol: habitos.alcohol || 'No',
        sustanciasPsicoactivas: habitos.sustanciasPsicoactivas || 'No',
        habitosObservaciones: habitos.observaciones || '',

        // Odontológicos
        complicacionesPrevias: odonto.complicacionesPrevias || 'No',
        reaccionesAnestesia: odonto.reaccionesAnestesia || 'No',
        antecedentesOdontoObservaciones: odonto.observaciones || '',

        // Higiene oral
        cepilladoVecesDia: higiene.cepilladoVecesDia || '',
        cambioCepillo: higiene.cambioCepillo || '',
        momentoManana: Array.isArray(higiene.momentosCepillado)
          ? higiene.momentosCepillado.includes('Mañana')
          : false,
        momentoDespuesComidas: Array.isArray(higiene.momentosCepillado)
          ? higiene.momentosCepillado.includes('Después de comidas')
          : false,
        momentoNoche: Array.isArray(higiene.momentosCepillado)
          ? higiene.momentosCepillado.includes('Noche')
          : false,
        tipoCepillo: higiene.tipoCepillo || '',
        cremaConFluor: higiene.cremaConFluor === false ? 'No' : 'Sí',
        usaSedaDental: higiene.usaSedaDental ? 'Sí' : 'No',
        frecuenciaSedaDental: higiene.frecuenciaSedaDental || '',
        usaEnjuague: higiene.usaEnjuague ? 'Sí' : 'No',
        tipoEnjuague: higiene.tipoEnjuague || 'No aplica',
        usaCepillosInterdentales: higiene.usaCepillosInterdentales ? 'Sí' : 'No',
        usaIrrigador: higiene.usaIrrigador ? 'Sí' : 'No',
        frecuenciaOdontologo: higiene.frecuenciaOdontologo || 'Cada 6 meses',
        educacionHigieneOral: higiene.educacionHigieneOral ? 'Sí' : 'No',
        profilaxisReciente: higiene.profilaxisReciente ? 'Sí' : 'No',
        sangradoEncias: higiene.sangradoEncias ? 'Sí' : 'No',
        halitosis: higiene.halitosis ? 'Sí' : 'No',
        sensibilidadDental: higiene.sensibilidadDental ? 'Sí' : 'No',
        movilidadDental: higiene.movilidadDental ? 'Sí' : 'No',
        usaProtesis: higiene.usaProtesis ? 'Sí' : 'No',
        usaOrtodoncia: higiene.usaOrtodoncia ? 'Sí' : 'No',
        limpiezaProtesis: higiene.limpiezaProtesis ? 'Sí' : 'No',

        declaracionAceptada: !!historia.declaracionAceptada,
      },
      { emitEvent: false },
    );

    this.resetMedicamentos();

    if (medicamentos.length > 0) {
      this.medicamentosArray.clear();
      medicamentos.forEach((item: any) => {
        this.medicamentosArray.push(this.createMedicamentoGroup(item));
      });
    }
  }

  onSave(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const value = this.historiaForm.getRawValue();

    const payload = {
      pacienteId: this.pacienteId,
      numeroHistoria: value.numeroHistoria,
      estadoCivil: value.estadoCivil,
      sexo: value.sexo,
      ocupacion: value.ocupacion,
      lugarResidencia: value.lugarResidencia,
      acompananteNombre: value.acompananteNombre,
      acompananteTelefono: value.acompananteTelefono,
      acompananteParentesco: value.acompananteParentesco,
      motivoConsulta: value.motivoConsulta,
      enfermedadesSistemicas: {
        hipertension: value.sistHipertension,
        diabetes: value.sistDiabetes,
        cardiacas: value.sistCardiacas,
        respiratorias: value.sistRespiratorias,
        renales: value.sistRenales,
        hepaticas: value.sistHepaticas,
        endocrinas: value.sistEndocrinas,
        neurologicas: value.sistNeurologicas,
        ets: value.sistEts,
        observaciones: value.sistObservaciones,
      },
      antecedentesQuirurgicos: JSON.stringify({
        hospitalizado: value.hospitalizado,
        cirugiasPrevias: value.cirugiasPrevias,
        detalle: value.quirurgicosDetalle,
      }),
      medicacionActual:
        value.tomaMedicamentos === 'Sí'
          ? value.medicamentos.filter((m: any) => m.medicamento || m.dosis || m.frecuencia)
          : [],
      alergiasGenerales: JSON.stringify({
        medicamentos: value.alergiaMedicamentos,
        anestesia: value.alergiaAnestesia,
        latex: value.alergiaLatex,
        descripcion: value.alergiasDescripcion,
      }),
      antecedentesHematologicos: JSON.stringify({
        sangraFacilidad: value.sangraFacilidad,
        problemasCoagulacion: value.problemasCoagulacion,
        observaciones: value.hematologicosObservaciones,
      }),
      ginecoObstetricos: JSON.stringify({
        embarazo: value.embarazo,
        trimestre: value.trimestre,
        lactancia: value.lactancia,
      }),
      habitos: JSON.stringify({
        fuma: value.fuma,
        cigarrillosDia: value.cigarrillosDia,
        alcohol: value.alcohol,
        sustanciasPsicoactivas: value.sustanciasPsicoactivas,
        observaciones: value.habitosObservaciones,
      }),
      antecedentesOdontologicos: JSON.stringify({
        complicacionesPrevias: value.complicacionesPrevias,
        reaccionesAnestesia: value.reaccionesAnestesia,
        observaciones: value.antecedentesOdontoObservaciones,
      }),
      higieneOral: {
        cepilladoVecesDia: value.cepilladoVecesDia,
        cambioCepillo: value.cambioCepillo,
        momentosCepillado: [
          value.momentoManana ? 'Mañana' : null,
          value.momentoDespuesComidas ? 'Después de comidas' : null,
          value.momentoNoche ? 'Noche' : null,
        ].filter(Boolean),
        tipoCepillo: value.tipoCepillo,
        cremaConFluor: value.cremaConFluor === 'Sí',
        usaSedaDental: value.usaSedaDental === 'Sí',
        frecuenciaSedaDental: value.frecuenciaSedaDental,
        usaEnjuague: value.usaEnjuague === 'Sí',
        tipoEnjuague: value.tipoEnjuague,
        usaCepillosInterdentales: value.usaCepillosInterdentales === 'Sí',
        usaIrrigador: value.usaIrrigador === 'Sí',
        frecuenciaOdontologo: value.frecuenciaOdontologo,
        educacionHigieneOral: value.educacionHigieneOral === 'Sí',
        profilaxisReciente: value.profilaxisReciente === 'Sí',
        sangradoEncias: value.sangradoEncias === 'Sí',
        halitosis: value.halitosis === 'Sí',
        sensibilidadDental: value.sensibilidadDental === 'Sí',
        movilidadDental: value.movilidadDental === 'Sí',
        usaProtesis: value.usaProtesis === 'Sí',
        usaOrtodoncia: value.usaOrtodoncia === 'Sí',
        limpiezaProtesis: value.limpiezaProtesis === 'Sí',
      },
      declaracionAceptada: value.declaracionAceptada,
    };

    this.historiaClinicaService
      .saveHistoria(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.successMessage = response?.message || 'Historia clínica guardada correctamente';
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'No se pudo guardar la historia clínica';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  goToResumen(): void {
    this.router.navigate(['/resumen', this.pacienteId]);
  }

  goToOdontogram(): void {
    this.router.navigate(['/odontogram', this.pacienteId]);
  }

  goToFinance(): void {
    this.router.navigate(['/finance'], { queryParams: { pacienteId: this.pacienteId } });
  }

  formatDateTime(value: any): string {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  getControl(name: string): AbstractControl | null {
    return this.historiaForm.get(name);
  }
}
