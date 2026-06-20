import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

export type ParsedRow = Record<string, string>;

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
}

/**
 * Servicio genérico de parseo de archivos tabulares (CSV, XLSX, XLS, ODS).
 * Normaliza los encabezados a minúsculas sin espacios para facilitar el mapeo.
 * Reutilizable para cualquier entidad (pacientes, movimientos, etc.).
 */
@Injectable({ providedIn: 'root' })
export class ImportParserService {
  /** Extensiones aceptadas */
  readonly acceptedExtensions = '.csv,.xlsx,.xls,.ods';

  /**
   * Parsea un File y devuelve headers + filas como objetos planos.
   * Los encabezados se normalizan: lowercase, sin espacios extremos.
   * @param preferredSheet Nombre de la hoja que se intentará leer primero (útil
   *   cuando el XLSX tiene varias hojas, p. ej. el exportado por Biodont que
   *   incluye "Leyenda" como primera hoja). Búsqueda case-insensitive.
   *   Si no se encuentra la hoja preferida, se usa la primera del libro.
   */
  parse(file: File, preferredSheet?: string): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const wb = XLSX.read(data, { type: 'binary', cellDates: true });

          let sheetName = wb.SheetNames[0];
          if (preferredSheet) {
            const match = wb.SheetNames.find(
              (n) => n.trim().toLowerCase() === preferredSheet.trim().toLowerCase(),
            );
            if (match) sheetName = match;
          }
          const ws = wb.Sheets[sheetName];
          const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          if (!raw || raw.length < 2) {
            reject(new Error('El archivo no tiene datos o le falta la fila de encabezados'));
            return;
          }

          const headers: string[] = (raw[0] as any[]).map((h) =>
            String(h ?? '').trim().toLowerCase().replace(/\s+/g, '_'),
          );

          const rows: ParsedRow[] = raw.slice(1)
            .filter((row) => (row as any[]).some((cell) => String(cell ?? '').trim() !== ''))
            .map((row) => {
              const obj: ParsedRow = {};
              headers.forEach((h, i) => {
                const cell = (row as any[])[i];
                // Fechas: XLSX puede devolver Date objects
                if (cell instanceof Date) {
                  const _pad = (n: number) => String(n).padStart(2, '0');
                  obj[h] = `${cell.getUTCFullYear()}-${_pad(cell.getUTCMonth() + 1)}-${_pad(cell.getUTCDate())}`;
                } else {
                  obj[h] = String(cell ?? '').trim();
                }
              });
              return obj;
            });

          resolve({ headers, rows, totalRows: rows.length });
        } catch (err: any) {
          reject(new Error('No se pudo leer el archivo: ' + (err?.message ?? 'formato no reconocido')));
        }
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsBinaryString(file);
    });
  }

  /**
   * Mapea los encabezados del archivo a los campos internos usando una tabla de alias.
   * Devuelve un objeto { campoInterno → headerEnArchivo | null }.
   */
  mapHeaders(
    fileHeaders: string[],
    aliasMap: Record<string, string[]>,
  ): Record<string, string | null> {
    const mapping: Record<string, string | null> = {};
    for (const [field, aliases] of Object.entries(aliasMap)) {
      const found = fileHeaders.find((h) => aliases.includes(h));
      mapping[field] = found ?? null;
    }
    return mapping;
  }

  /**
   * Aplica un mapping (campoInterno → headerEnArchivo) a las filas parseadas.
   * Devuelve filas con claves en el nombre interno del campo.
   */
  applyMapping(rows: ParsedRow[], mapping: Record<string, string | null>): ParsedRow[] {
    return rows.map((row) => {
      const mapped: ParsedRow = {};
      for (const [field, header] of Object.entries(mapping)) {
        mapped[field] = header ? (row[header] ?? '') : '';
      }
      return mapped;
    });
  }
}
