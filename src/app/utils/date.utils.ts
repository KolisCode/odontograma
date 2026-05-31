const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Devuelve la fecha de hoy en Colombia como string YYYY-MM-DD.
 * Correcto incluso si el navegador está en otra zona horaria.
 */
export function fechaHoyCol(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

/**
 * Devuelve la medianoche Colombia de hoy (offsetDias=0) o de otro día
 * como instante UTC, para comparar contra fechas ISO del backend.
 */
export function medianocheColUTC(offsetDias = 0): Date {
  const col = new Date(Date.now() - BOGOTA_OFFSET_MS);
  return new Date(
    Date.UTC(col.getUTCFullYear(), col.getUTCMonth(), col.getUTCDate() + offsetDias)
    + BOGOTA_OFFSET_MS
  );
}

/**
 * Formatea una fecha ISO (ej. "2024-03-15T14:30:00.000Z") a string
 * de hora Colombia "HH:mm" o "dd/MM HH:mm" según el formato indicado.
 * Evita el drift UTC-5 del pipe | date sin timezone.
 */
export function formatISOEnColombia(iso: string, formato: 'fecha' | 'hora' | 'fechaHora' | 'dd/MM HH:mm' | 'dd/MM/yy HH:mm'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'America/Bogota' };
  if (formato === 'fecha')            return d.toLocaleDateString('es-CO',  { ...opts, day: '2-digit', month: '2-digit', year: 'numeric' });
  if (formato === 'hora')             return d.toLocaleTimeString('es-CO',  { ...opts, hour: '2-digit', minute: '2-digit', hour12: false });
  if (formato === 'fechaHora')        return d.toLocaleString('es-CO',      { ...opts, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  // formatos para pipe date: dd/MM HH:mm y dd/MM/yy HH:mm
  const day   = String(d.toLocaleDateString('es-CO', { ...opts, day:   '2-digit' })).padStart(2, '0');
  const month = String(d.toLocaleDateString('es-CO', { ...opts, month: '2-digit' })).padStart(2, '0');
  const year2 = d.toLocaleDateString('en-CA', { ...opts, year: '2-digit' });
  const time  = d.toLocaleTimeString('es-CO', { ...opts, hour: '2-digit', minute: '2-digit', hour12: false });
  if (formato === 'dd/MM HH:mm')    return `${day}/${month} ${time}`;
  if (formato === 'dd/MM/yy HH:mm') return `${day}/${month}/${year2} ${time}`;
  return '';
}

export function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  // Ambas fechas ancladas a Colombia midnight como UTC → usar getUTC* siempre,
  // independiente de la timezone del navegador.
  const hoy = new Date(`${fechaHoyCol()}T00:00:00-05:00`);
  const nac = new Date(`${fechaNacimiento}T00:00:00-05:00`);
  if (isNaN(nac.getTime())) return null;
  let edad = hoy.getUTCFullYear() - nac.getUTCFullYear();
  const m = hoy.getUTCMonth() - nac.getUTCMonth();
  if (m < 0 || (m === 0 && hoy.getUTCDate() < nac.getUTCDate())) edad--;
  return edad;
}

export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
