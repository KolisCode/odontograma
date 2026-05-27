import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

export interface ExportSheet {
  nombre: string;
  datos: Record<string, any>[];
  total: number;
}

export interface ExportData {
  hojas: ExportSheet[];
  generadoEn: string;
}

/**
 * Genera archivos XLSX a partir de los datos recibidos del backend.
 * Incluye siempre una hoja "Leyenda" que documenta el formato,
 * qué hojas son re-importables y cómo usarlas.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {

  /** Columnas de cada hoja y si es re-importable */
  private readonly SHEET_META: Record<string, { reimportable: boolean; columnas: string }> = {
    Pacientes: {
      reimportable: true,
      columnas: 'nombre, apellido, documento, telefono, correo, fechaNacimiento, direccion, eps, alergias, observaciones, activo',
    },
    Movimientos: {
      reimportable: false,
      columnas: 'fecha, tipo, concepto, monto, estado, metodoPago, nota, diagnosticoRef, paciente_documento, paciente_nombre',
    },
    Citas: {
      reimportable: false,
      columnas: 'fecha, hora, motivo, tipoAtencion, estado, paciente_documento, paciente_nombre',
    },
    Tratamientos: {
      reimportable: false,
      columnas: 'descripcion, estado, monto, fechaInicio, fechaFin, paciente_documento, paciente_nombre',
    },
  };

  descargar(data: ExportData, nombreArchivo?: string): void {
    const wb = XLSX.utils.book_new();

    // ── Hoja de leyenda (siempre la primera) ────────────────────────────────
    const leyendaData = this.buildLeyenda(data);
    const wsLeyenda = XLSX.utils.aoa_to_sheet(leyendaData);
    wsLeyenda['!cols'] = [{ wch: 32 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsLeyenda, 'Leyenda');

    // ── Una hoja por entidad ─────────────────────────────────────────────────
    for (const hoja of data.hojas) {
      if (!hoja.datos.length) {
        const meta = this.SHEET_META[hoja.nombre];
        const headers = meta ? meta.columnas.split(', ') : [];
        const ws = XLSX.utils.aoa_to_sheet(headers.length ? [headers] : []);
        XLSX.utils.book_append_sheet(wb, ws, hoja.nombre);
        continue;
      }

      const ws = XLSX.utils.json_to_sheet(hoja.datos);
      this.autoColumnWidth(ws, hoja.datos);
      XLSX.utils.book_append_sheet(wb, ws, hoja.nombre);
    }

    const _d = new Date();
    const _pad = (n: number) => String(n).padStart(2, '0');
    const fecha = `${_d.getFullYear()}-${_pad(_d.getMonth() + 1)}-${_pad(_d.getDate())}`;
    const filename = nombreArchivo ?? `biodont_export_${fecha}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  private buildLeyenda(data: ExportData): any[][] {
    const fecha = new Date(data.generadoEn).toLocaleString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Bogota',
    });

    const rows: any[][] = [
      ['BIODONT — Exportación de datos', ''],
      ['Generado el', fecha],
      ['', ''],
      ['HOJAS INCLUIDAS', ''],
    ];

    for (const hoja of data.hojas) {
      const meta = this.SHEET_META[hoja.nombre];
      rows.push([hoja.nombre, `${hoja.total} registro(s)`]);
      if (meta) {
        rows.push(['  Columnas', meta.columnas]);
        rows.push(['  Re-importable', meta.reimportable ? 'SÍ — Pacientes → Importar' : 'NO (solo referencia)']);
      }
      rows.push(['', '']);
    }

    rows.push(['CLAVE DE RE-ENLACE', '']);
    rows.push(['paciente_documento', 'Número de documento del paciente. Usado para re-importar y relacionar registros.']);
    rows.push(['', '']);
    rows.push(['INSTRUCCIONES', '']);
    rows.push(['Re-importar pacientes', 'Ir a Pacientes → Importar → seleccionar este mismo archivo XLSX (se leerá la hoja "Pacientes" automáticamente)']);
    rows.push(['Otras entidades', 'Importadores no disponibles aún. Los datos son referencia histórica.']);
    rows.push(['', '']);
    rows.push(['NOTA', 'El campo "activo" acepta SI/NO al re-importar pacientes.']);

    return rows;
  }

  /** Calcula ancho de columna según el contenido más largo */
  private autoColumnWidth(ws: XLSX.WorkSheet, data: Record<string, any>[]): void {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    ws['!cols'] = keys.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...data.map((row) => String(row[key] ?? '').length),
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
  }
}
