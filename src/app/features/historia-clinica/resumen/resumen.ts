import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Navbar } from '../../complements/navbar/navbar';
import { Footer } from '../../complements/footer/footer';
import { HistoriaClinicaService } from '../historia-clinica.service/historia-clinica.service';
import { PatientsService } from '../../user/service/pacientes.service';
import { DocumentosComponent } from '../../documentos/documentos/documentos';
import { OdontogramService } from '../../../services/odontogram';
import { BackendOdontogramResponse } from '../../odontogram/interfaces/backend-odontogram-response';
import { OdontogramHistorialModal } from '../../odontogram/components/historial-modal/historial-modal';

export interface AlertaClinica {
  tipo: 'critica' | 'advertencia' | 'info';
  texto: string;
}

@Component({
  selector: 'app-resumen-historia',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, Footer, DocumentosComponent, OdontogramHistorialModal],
  templateUrl: './resumen.html',
  styleUrl: './resumen.css',
})
export class ResumenHistoria implements OnInit, OnDestroy {
  pacienteId!: number;
  patientName = '';
  patientDocument = '';
  numeroHistoria = '';
  motivoConsulta = '';

  loading = true;
  errorMessage = '';
  sinHistoria = false;

  alertas: AlertaClinica[] = [];

  historialOdonto: BackendOdontogramResponse[] = [];
  historialLoading = false;
  versionModal: BackendOdontogramResponse | null = null;
  versionModalVisible = false;
  private destroy$ = new Subject<void>();

  medicamentos: { medicamento: string; dosis: string; frecuencia: string }[] = [];

  higiene: {
    cepilladoVecesDia: string;
    momentos: string[];
    sedaDental: boolean;
    enjuague: boolean;
    sangradoEncias: boolean;
    halitosis: boolean;
    sensibilidad: boolean;
    movilidadDental: boolean;
    frecuenciaOdontologo: string;
  } = {
    cepilladoVecesDia: '',
    momentos: [],
    sedaDental: false,
    enjuague: false,
    sangradoEncias: false,
    halitosis: false,
    sensibilidad: false,
    movilidadDental: false,
    frecuenciaOdontologo: '',
  };

  acompanante: {
    nombre: string;
    telefono: string;
    parentesco: string;
  } = { nombre: '', telefono: '', parentesco: '' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private historiaService: HistoriaClinicaService,
    private patientsService: PatientsService,
    private odontogramService: OdontogramService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (!id || isNaN(Number(id))) {
        this.errorMessage = 'Paciente no válido';
        this.loading = false;
        return;
      }
      this.pacienteId = Number(id);
      this.loadData();
      this.loadHistorialOdonto();
    });
  }

  private loadData(): void {
    this.historiaService.getHistoriaByPaciente(this.pacienteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        const paciente = response?.data?.paciente;
        const historia = response?.data?.historia;

        if (paciente) {
          this.patientName = `${paciente.nombre || ''} ${paciente.apellido || ''}`.trim();
          this.patientDocument = paciente.documento || '';
        }

        if (!historia) {
          this.sinHistoria = true;
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        this.numeroHistoria = historia.numeroHistoria || '';
        this.motivoConsulta = historia.motivoConsulta || '';

        this.buildAlertas(historia);
        this.buildHigiene(historia);

        this.acompanante = {
          nombre: historia.acompananteNombre || '',
          telefono: historia.acompananteTelefono || '',
          parentesco: historia.acompananteParentesco || '',
        };

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la historia clínica';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private parseJson(value: any): any {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return {}; }
  }

  private buildAlertas(historia: any): void {
    const alertas: AlertaClinica[] = [];

    // ── Alergias ─────────────────────────────────────────────────────────────
    const alergias = this.parseJson(historia.alergiasGenerales);
    if (alergias.anestesia) {
      alertas.push({ tipo: 'critica', texto: 'Alergia a la anestesia' });
    }
    if (alergias.medicamentos) {
      const detalle = alergias.descripcion ? `: ${alergias.descripcion}` : '';
      alertas.push({ tipo: 'critica', texto: `Alergia a medicamentos${detalle}` });
    }
    if (alergias.latex) {
      alertas.push({ tipo: 'advertencia', texto: 'Alergia al látex' });
    }
    if (!alergias.anestesia && !alergias.medicamentos && alergias.descripcion) {
      alertas.push({ tipo: 'advertencia', texto: `Alergias: ${alergias.descripcion}` });
    }

    // ── Antecedentes odontológicos ────────────────────────────────────────────
    const odonto = this.parseJson(historia.antecedentesOdontologicos);
    if (odonto.reaccionesAnestesia === 'Sí') {
      alertas.push({ tipo: 'critica', texto: 'Reacciones previas a la anestesia' });
    }
    if (odonto.complicacionesPrevias === 'Sí') {
      const detalle = odonto.observaciones ? `: ${odonto.observaciones}` : '';
      alertas.push({ tipo: 'advertencia', texto: `Complicaciones en tratamientos previos${detalle}` });
    }

    // ── Hematológicos ─────────────────────────────────────────────────────────
    const hema = this.parseJson(historia.antecedentesHematologicos);
    if (hema.sangraFacilidad === 'Sí') {
      alertas.push({ tipo: 'critica', texto: 'Sangrado con facilidad' });
    }
    if (hema.problemasCoagulacion === 'Sí') {
      alertas.push({ tipo: 'critica', texto: 'Problemas de coagulación' });
    }

    // ── Enfermedades sistémicas ───────────────────────────────────────────────
    const enf = this.parseJson(historia.enfermedadesSistemicas);
    const mapa: Record<string, string> = {
      hipertension: 'Hipertensión arterial',
      diabetes: 'Diabetes',
      cardiacas: 'Enfermedad cardíaca',
      respiratorias: 'Enfermedad respiratoria',
      renales: 'Enfermedad renal',
      hepaticas: 'Enfermedad hepática',
      endocrinas: 'Enfermedad endocrina',
      neurologicas: 'Enfermedad neurológica',
      ets: 'ETS',
    };
    for (const [key, label] of Object.entries(mapa)) {
      if (enf[key]) alertas.push({ tipo: 'advertencia', texto: label });
    }

    // ── Gineco-obstétricos ────────────────────────────────────────────────────
    const gineco = this.parseJson(historia.ginecoObstetricos);
    if (gineco.embarazo === 'Sí') {
      const trimestre = gineco.trimestre && gineco.trimestre !== 'No aplica'
        ? ` (${gineco.trimestre})`
        : '';
      alertas.push({ tipo: 'advertencia', texto: `Embarazo${trimestre}` });
    }
    if (gineco.lactancia === 'Sí') {
      alertas.push({ tipo: 'info', texto: 'En periodo de lactancia' });
    }

    // ── Medicación ────────────────────────────────────────────────────────────
    const meds = Array.isArray(historia.medicacionActual) ? historia.medicacionActual : [];
    this.medicamentos = meds.filter((m: any) => m?.medicamento?.trim());
    if (this.medicamentos.length > 0) {
      alertas.push({ tipo: 'info', texto: `Toma ${this.medicamentos.length} medicamento(s) actualmente` });
    }

    // ── Hábitos relevantes ────────────────────────────────────────────────────
    const habitos = this.parseJson(historia.habitos);
    if (habitos.fuma === 'Sí') {
      alertas.push({ tipo: 'info', texto: `Fumador${habitos.cigarrillosDia ? ` (${habitos.cigarrillosDia} cig/día)` : ''}` });
    }
    if (habitos.alcohol === 'Sí') {
      alertas.push({ tipo: 'info', texto: 'Consume alcohol' });
    }
    if (habitos.sustanciasPsicoactivas === 'Sí') {
      alertas.push({ tipo: 'advertencia', texto: 'Uso de sustancias psicoactivas' });
    }

    this.alertas = alertas;
  }

  private buildHigiene(historia: any): void {
    const h = this.parseJson(historia.higieneOral);
    const momentos: string[] = [];
    if (Array.isArray(h.momentosCepillado)) {
      momentos.push(...h.momentosCepillado);
    }
    this.higiene = {
      cepilladoVecesDia: h.cepilladoVecesDia || '',
      momentos,
      sedaDental: !!h.usaSedaDental,
      enjuague: !!h.usaEnjuague,
      sangradoEncias: !!h.sangradoEncias,
      halitosis: !!h.halitosis,
      sensibilidad: !!h.sensibilidadDental,
      movilidadDental: !!h.movilidadDental,
      frecuenciaOdontologo: h.frecuenciaOdontologo || '',
    };
  }

  get alertasCriticas(): AlertaClinica[] {
    return this.alertas.filter(a => a.tipo === 'critica');
  }

  get alertasAdvertencia(): AlertaClinica[] {
    return this.alertas.filter(a => a.tipo === 'advertencia');
  }

  get alertasInfo(): AlertaClinica[] {
    return this.alertas.filter(a => a.tipo === 'info');
  }

  get tieneAcompanante(): boolean {
    return !!(this.acompanante.nombre || this.acompanante.telefono);
  }

  goToHistoria(): void {
    this.router.navigate(['/history', this.pacienteId]);
  }

  goToOdontogram(): void {
    this.router.navigate(['/odontogram', this.pacienteId]);
  }

  private loadHistorialOdonto(): void {
    this.historialLoading = true;
    this.odontogramService.getHistorial(this.pacienteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.historialOdonto = data.filter(v => !v.activo).sort((a, b) => b.version - a.version);
        this.historialLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.historialLoading = false; this.cdr.detectChanges(); },
    });
  }

  abrirVersionModal(v: BackendOdontogramResponse): void {
    this.versionModal = v;
    this.versionModalVisible = true;
  }

  cerrarVersionModal(): void {
    this.versionModal = null;
    this.versionModalVisible = false;
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const parts = fecha.substring(0, 10).split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return fecha;
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  goToPatients(): void {
    this.router.navigate(['/patients']);
  }
}
