import { CommonModule } from '@angular/common';
import { decodeId, encodeId } from '../../shared/ids';
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
import { HistoriaClinicaService, EvolucionRow, FormulaMedicaRow, MedicamentoFormula } from './historia-clinica.service/historia-clinica.service';
import { DocumentosComponent } from '../documentos/documentos/documentos';
import { fechaHoyCol } from '../../utils/date.utils';

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
  pacienteNoEncontrado = false;
  successMessage = '';
  errorMessage = '';

  evoluciones: EvolucionRow[] = [];
  loadingEvoluciones = false;
  nuevaNota = '';
  guardandoNota = false;
  notaError = '';
  confirmandoEliminarNota: number | null = null;

  formulas: FormulaMedicaRow[] = [];
  loadingFormulas = false;
  formulaFormVisible = false;
  formulaDiagnostico = '';
  formulaInstrucciones = '';
  formulaMedicamentos: MedicamentoFormula[] = [{ medicamento: '', dosis: '', frecuencia: '', duracion: '' }];
  guardandoFormula = false;
  formulaError = '';
  confirmandoEliminarFormula: number | null = null;

  collapsedSections = new Set<string>();

  toggleSection(id: string): void {
    if (this.collapsedSections.has(id)) {
      this.collapsedSections.delete(id);
    } else {
      this.collapsedSections.add(id);
    }
  }

  isCollapsed(id: string): boolean {
    return this.collapsedSections.has(id);
  }

  private destroy$ = new Subject<void>();
  private _successTimer: ReturnType<typeof setTimeout> | null = null;

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

      // Enfermedades odontológicas
      odontBruxismo: [false],
      odontPeriodontitis: [false],
      odontGingivitis: [false],
      odontMaloclusion: [false],
      odontXerostomia: [false],
      odontHipersensibilidad: [false],
      odontFluorosis: [false],
      odontErosion: [false],
      odontAtm: [false],
      odontObservaciones: [''],

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
      const parsed = idParam ? decodeId(idParam) : null;
      if (parsed === null) {
        this.errorMessage = 'No se recibió un paciente válido';
        this.loadingData = false;
        return;
      }
      this.pacienteId = parsed;
      this.loadHistoria();
      this.loadEvoluciones();
      this.loadFormulas();
    });
  }

  ngOnDestroy(): void {
    if (this._successTimer) clearTimeout(this._successTimer);
    this.destroy$.next();
    this.destroy$.complete();
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

  private setSuccess(msg: string): void {
    if (this._successTimer) clearTimeout(this._successTimer);
    this.successMessage = msg;
    this._successTimer = setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);
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
          if (err?.status === 404) {
            this.pacienteNoEncontrado = true;
          } else {
            this.errorMessage = err?.error?.message || 'No se pudo cargar la historia clínica';
          }
          this.loadingData = false;
          this.cdr.detectChanges();
        },
      });
  }

  setDefaultHistoriaNumber(): void {
    const year = new Date(`${fechaHoyCol()}T00:00:00-05:00`).getUTCFullYear();
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
    const enfermedadesOdontol = this.parseJson(historia.enfermedadesOdontologicas);
    const medicamentos = (() => {
      if (Array.isArray(historia.medicacionActual)) return historia.medicacionActual;
      try { return JSON.parse(historia.medicacionActual) ?? []; } catch { return []; }
    })();

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

        // Enfermedades odontológicas
        odontBruxismo: !!enfermedadesOdontol.bruxismo,
        odontPeriodontitis: !!enfermedadesOdontol.periodontitis,
        odontGingivitis: !!enfermedadesOdontol.gingivitis,
        odontMaloclusion: !!enfermedadesOdontol.maloclusion,
        odontXerostomia: !!enfermedadesOdontol.xerostomia,
        odontHipersensibilidad: !!enfermedadesOdontol.hipersensibilidad,
        odontFluorosis: !!enfermedadesOdontol.fluorosis,
        odontErosion: !!enfermedadesOdontol.erosion,
        odontAtm: !!enfermedadesOdontol.atm,
        odontObservaciones: enfermedadesOdontol.observaciones || '',

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
    if (this.loading) return;
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
      enfermedadesOdontologicas: JSON.stringify({
        bruxismo: value.odontBruxismo,
        periodontitis: value.odontPeriodontitis,
        gingivitis: value.odontGingivitis,
        maloclusion: value.odontMaloclusion,
        xerostomia: value.odontXerostomia,
        hipersensibilidad: value.odontHipersensibilidad,
        fluorosis: value.odontFluorosis,
        erosion: value.odontErosion,
        atm: value.odontAtm,
        observaciones: value.odontObservaciones,
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
          this.setSuccess(response?.message || 'Historia clínica guardada correctamente');
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

  goToPatients(): void {
    this.router.navigate(['/patients']);
  }

  goToResumen(): void {
    this.router.navigate(['/resumen', encodeId(this.pacienteId)]);
  }

  goToOdontogram(): void {
    this.router.navigate(['/odontogram', encodeId(this.pacienteId)]);
  }

  goToFinance(): void {
    this.router.navigate(['/finance'], { queryParams: { pacienteId: encodeId(this.pacienteId) } });
  }

  goToTratamientos(): void {
    this.router.navigate(['/tratamientos', encodeId(this.pacienteId)]);
  }

  formatDateTime(value: any): string {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    });
  }

  getControl(name: string): AbstractControl | null {
    return this.historiaForm.get(name);
  }

  loadEvoluciones(): void {
    this.loadingEvoluciones = true;
    this.historiaClinicaService.getEvoluciones(this.pacienteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.evoluciones = res.data;
          this.loadingEvoluciones = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingEvoluciones = false;
          this.cdr.detectChanges();
        },
      });
  }

  agregarNota(): void {
    if (!this.nuevaNota.trim()) {
      this.notaError = 'La nota no puede estar vacía.';
      return;
    }
    this.notaError = '';
    this.guardandoNota = true;
    this.historiaClinicaService.crearEvolucion(this.pacienteId, this.nuevaNota)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.evoluciones = [res.data, ...this.evoluciones];
          this.nuevaNota = '';
          this.guardandoNota = false;
          this.setSuccess('Nota guardada correctamente');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.notaError = err?.error?.message || 'No se pudo guardar la nota.';
          this.guardandoNota = false;
          this.cdr.detectChanges();
        },
      });
  }

  eliminarNota(id: number): void {
    this.historiaClinicaService.eliminarEvolucion(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.evoluciones = this.evoluciones.filter(e => e.id !== id);
          this.confirmandoEliminarNota = null;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.confirmandoEliminarNota = null;
          this.errorMessage = err?.error?.message || 'No se pudo eliminar la evolución';
          this.cdr.detectChanges();
        },
      });
  }

  loadFormulas(): void {
    this.loadingFormulas = true;
    this.historiaClinicaService.getFormulas(this.pacienteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.formulas = res.data;
          this.loadingFormulas = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingFormulas = false;
          this.cdr.detectChanges();
        },
      });
  }

  addFormulaMedicamento(): void {
    if (this.formulaMedicamentos.length >= 20) return;
    this.formulaMedicamentos = [...this.formulaMedicamentos, { medicamento: '', dosis: '', frecuencia: '', duracion: '' }];
  }

  removeFormulaMedicamento(index: number): void {
    if (this.formulaMedicamentos.length > 1) {
      this.formulaMedicamentos = this.formulaMedicamentos.filter((_, i) => i !== index);
    }
  }

  guardarFormula(): void {
    const validos = this.formulaMedicamentos.filter(m => m.medicamento.trim());
    if (validos.length === 0) {
      this.formulaError = 'Debe incluir al menos un medicamento con nombre.';
      return;
    }
    this.formulaError = '';
    this.guardandoFormula = true;

    this.historiaClinicaService.crearFormula({
      pacienteId: this.pacienteId,
      diagnostico: this.formulaDiagnostico,
      medicamentos: validos,
      instrucciones: this.formulaInstrucciones,
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.formulas = [res.data, ...this.formulas];
          this.formulaFormVisible = false;
          this.formulaDiagnostico = '';
          this.formulaInstrucciones = '';
          this.formulaMedicamentos = [{ medicamento: '', dosis: '', frecuencia: '', duracion: '' }];
          this.guardandoFormula = false;
          this.setSuccess('Fórmula guardada correctamente');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.formulaError = err?.error?.message || 'No se pudo guardar la fórmula.';
          this.guardandoFormula = false;
          this.cdr.detectChanges();
        },
      });
  }

  eliminarFormula(id: number): void {
    this.historiaClinicaService.eliminarFormula(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.formulas = this.formulas.filter(f => f.id !== id);
          this.confirmandoEliminarFormula = null;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.confirmandoEliminarFormula = null;
          this.formulaError = err?.error?.message || 'No se pudo eliminar la fórmula';
          this.cdr.detectChanges();
        },
      });
  }
}
