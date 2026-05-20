import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DocumentosService, Documento, DocumentoTipo } from '../documentos.service';

interface TipoOption {
  value: DocumentoTipo;
  label: string;
}

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documentos.html',
  styleUrl: './documentos.css',
})
export class DocumentosComponent implements OnInit, OnDestroy {
  @Input() pacienteId!: number;

  private destroy$ = new Subject<void>();

  documentos: Documento[] = [];
  loading = false;
  errorMessage = '';

  // Upload form
  formVisible = false;
  selectedFile: File | null = null;
  selectedTipo: DocumentoTipo = 'OTRO';
  selectedFecha = '';
  uploading = false;
  uploadError = '';

  // Confirm delete
  confirmDeleteId: number | null = null;

  // Preview
  previewUrl: string | null = null;
  previewNombre = '';

  tiposDocumento: TipoOption[] = [
    { value: 'RADIOGRAFIA', label: 'Radiografía' },
    { value: 'CONSENTIMIENTO', label: 'Consentimiento' },
    { value: 'EXAMEN', label: 'Examen' },
    { value: 'RECETA', label: 'Receta' },
    { value: 'OTRO', label: 'Otro' },
  ];

  constructor(
    private documentosService: DocumentosService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDocumentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  loadDocumentos(): void {
    if (!this.pacienteId) return;
    this.loading = true;
    this.documentosService.getByPaciente(this.pacienteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.documentos = res.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los documentos';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.uploadError = '';
  }

  toggleForm(): void {
    this.formVisible = !this.formVisible;
    if (!this.formVisible) this.resetForm();
  }

  private resetForm(): void {
    this.selectedFile = null;
    this.selectedTipo = 'OTRO';
    this.selectedFecha = '';
    this.uploadError = '';
  }

  onUpload(): void {
    if (!this.selectedFile) {
      this.uploadError = 'Selecciona un archivo';
      return;
    }

    const formData = new FormData();
    formData.append('archivo', this.selectedFile);
    formData.append('pacienteId', String(this.pacienteId));
    formData.append('tipo', this.selectedTipo);
    if (this.selectedFecha) formData.append('fecha', this.selectedFecha);

    this.uploading = true;
    this.uploadError = '';

    this.documentosService.upload(formData).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.documentos = [res.data, ...this.documentos];
        this.uploading = false;
        this.formVisible = false;
        this.resetForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadError = err?.error?.message || 'Error al subir el archivo';
        this.uploading = false;
        this.cdr.detectChanges();
      },
    });
  }

  previsualizarDocumento(doc: Documento): void {
    if (!doc.mimetype.startsWith('image/')) {
      this.abrirEnNuevaTab(doc);
      return;
    }
    this.documentosService.getArchivoBlob(doc.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
        this.previewUrl = URL.createObjectURL(blob);
        this.previewNombre = doc.nombre;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la previsualización';
        this.cdr.detectChanges();
      },
    });
  }

  abrirEnNuevaTab(doc: Documento): void {
    this.documentosService.getArchivoBlob(doc.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => {
        this.errorMessage = 'No se pudo abrir el archivo';
        this.cdr.detectChanges();
      },
    });
  }

  descargarDocumento(doc: Documento): void {
    this.documentosService.getArchivoBlob(doc.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.nombre;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage = 'No se pudo descargar el archivo';
        this.cdr.detectChanges();
      },
    });
  }

  cerrarPreview(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.previewNombre = '';
  }

  solicitarEliminar(id: number): void {
    this.confirmDeleteId = id;
  }

  cancelarEliminar(): void {
    this.confirmDeleteId = null;
  }

  confirmarEliminar(): void {
    if (this.confirmDeleteId === null) return;
    const id = this.confirmDeleteId;
    this.confirmDeleteId = null;

    this.documentosService.delete(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.documentos = this.documentos.filter(d => d.id !== id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudo eliminar el documento';
        this.cdr.detectChanges();
      },
    });
  }

  tipoLabel(tipo: DocumentoTipo): string {
    return this.tiposDocumento.find(t => t.value === tipo)?.label ?? tipo;
  }

  formatTamanio(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  esImagen(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }
}
