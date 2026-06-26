import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DocumentosService, Documento, DocumentoTipo } from '../documentos.service';
import { AuthService } from '../../authentication/service/auth-service/auth.service';

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
export class DocumentosComponent implements OnInit, OnChanges, OnDestroy {
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
  previewIndex: number | null = null;
  previewLoading = false;

  get imagenesDocumentos(): Documento[] {
    return this.documentos.filter(d => d.mimetype.startsWith('image/'));
  }

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
    private authService: AuthService,
  ) {}

  // Eliminar documentos está restringido a ADMIN/ODONTOLOGO en el backend.
  get puedeBorrar(): boolean { return this.authService.canManageSensitive(); }

  ngOnInit(): void {
    this.loadDocumentos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pacienteId'] && !changes['pacienteId'].firstChange) {
      this.documentos = [];
      this.errorMessage = '';
      this.formVisible = false;
      this.resetForm();
      this.confirmDeleteId = null;
      this.cerrarPreview();
      this.loadDocumentos();
    }
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
    const file = input.files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) {
      this.uploadError = 'El archivo supera el límite de 10 MB';
      this.selectedFile = null;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }
    this.selectedFile = file;
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
    const idx = this.imagenesDocumentos.findIndex(d => d.id === doc.id);
    this.cargarPreviewEnIndice(idx);
  }

  private cargarPreviewEnIndice(idx: number): void {
    const imagenes = this.imagenesDocumentos;
    if (idx < 0 || idx >= imagenes.length) return;
    const doc = imagenes[idx];
    this.previewLoading = true;
    this.previewIndex = idx;
    this.previewNombre = doc.nombre;
    this.cdr.detectChanges();
    this.documentosService.getArchivoBlob(doc.id, this.pacienteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
        this.previewUrl = URL.createObjectURL(blob);
        this.previewLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la previsualización';
        this.previewLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  anteriorImagen(): void {
    if (this.previewIndex === null) return;
    const siguiente = (this.previewIndex - 1 + this.imagenesDocumentos.length) % this.imagenesDocumentos.length;
    this.cargarPreviewEnIndice(siguiente);
  }

  siguienteImagen(): void {
    if (this.previewIndex === null) return;
    const siguiente = (this.previewIndex + 1) % this.imagenesDocumentos.length;
    this.cargarPreviewEnIndice(siguiente);
  }

  abrirEnNuevaTab(doc: Documento): void {
    this.documentosService.getArchivoBlob(doc.id, this.pacienteId).pipe(takeUntil(this.destroy$)).subscribe({
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
    this.documentosService.getArchivoBlob(doc.id, this.pacienteId).pipe(takeUntil(this.destroy$)).subscribe({
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
    this.previewIndex = null;
    this.previewLoading = false;
    this.cdr.detectChanges();
  }

  solicitarEliminar(id: number): void {
    this.confirmDeleteId = id;
    this.cdr.detectChanges();
  }

  cancelarEliminar(): void {
    this.confirmDeleteId = null;
    this.cdr.detectChanges();
  }

  confirmarEliminar(): void {
    if (this.confirmDeleteId === null) return;
    const id = this.confirmDeleteId;
    this.confirmDeleteId = null;

    this.documentosService.delete(id, this.pacienteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.documentos = this.documentos.filter(d => d.id !== id);
        if (this.previewIndex !== null) {
          this.cerrarPreview();
        } else {
          this.cdr.detectChanges();
        }
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
