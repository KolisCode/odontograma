# Biodont — Instrucciones de trabajo para Claude

## Estructura del proyecto

El proyecto tiene dos repositorios separados bajo `Biodont/`:

```
Biodont/
├── odontograma/          ← Frontend Angular (este directorio de trabajo)
│   └── src/app/
│       ├── app.routes.ts
│       ├── app.config.ts
│       └── features/
│           ├── authentication/   login, register, auth-guard, token-interceptor
│           ├── complements/      navbar, footer (compartidos)
│           ├── dashboard/        dashboard principal
│           ├── historia-clinica/ historia clínica del paciente (ruta: /history/:id)
│           ├── odontogram/       odontograma dental (ruta: /odontogram/:id)
│           │   ├── components/tooth/   componente SVG del diente
│           │   ├── interfaces/
│           │   ├── types/        diagnosis-type.ts, piece-type.ts, tooth-surface.ts
│           │   └── odontogram/   componente principal
│           ├── tratamientos/     módulo de tratamientos (ruta: /tratamientos/:id)
│           ├── user/
│           │   ├── appointment/  gestión de citas
│           │   ├── list/         listado y CRUD de pacientes
│           │   └── service/      pacientes.service.ts
│           └── wallet/finance/   ingresos y egresos
│
└── Biodont/              ← Backend Node.js/Express + Prisma
    └── src/
        ├── app.js        rutas registradas aquí
        ├── server.js     puerto 3000
        ├── controllers/
        ├── services/
        ├── routes/
        ├── middlewares/  auth.middleware.js, role.middleware.js
        ├── config/prisma.js
        └── errors/       AppError, BadRequestError, ConflictError, NotFoundError
```

## Convenciones Angular

- **Todos los componentes son standalone** (`standalone: true` o `imports: [...]` sin NgModule)
- **Formularios**: `ReactiveFormsModule` + `FormGroup` / `FormBuilder`. No usar template-driven forms
- **Estado reactivo**: `signal()` y `computed()` de `@angular/core` en odontograma. En el resto, propiedades simples + `ChangeDetectorRef.detectChanges()`
- **Control de flujo**: usar `*ngIf` / `*ngFor` (sintaxis clásica). No usar `@if` / `@for` (sintaxis nueva)
- **Formularios colapsables**: patrón `formVisible = false` + `.form-trigger` div + `*ngIf="formVisible"` en ng-container. Ver `list.html`, `appointment.html`, `finance.html`
- **HTTP**: `HttpClient` con interceptor JWT en `token-interceptor.ts`. El interceptor añade `Authorization: Bearer <token>` automáticamente. Maneja 401 (limpia storage + redirige a `/login`) y 403 (re-envuelve con mensaje amigable `"No tienes permiso para realizar esta acción"` — el componente recibe `err?.error?.message` legible en vez de JSON técnico).
- **Rutas protegidas**: `authGuard` para usuarios autenticados, `guestGuard` para login/register

## Verificación de tipos

Para verificar tipos rápido sin build completo:
```bash
npx tsc --noEmit
```

`npx ng build` **sí funciona** en el Mac (verificado 2026-07-14, ~1 min; emite directo
a `../Biodont/public`, ver abajo). La advertencia anterior de OOM era de otro entorno
y quedó obsoleta. Tras un build hay que commitear `public/` en el repo backend
(convención: el artefacto se versiona) **con las fuentes ya commiteadas aquí** — nunca
buildear con el working tree sucio (hallazgo B-2 del barrido 2026-07-10).

## Backend

- **Runtime**: Node.js con CommonJS (`require`/`module.exports`)
- **Puerto**: 3000
- **ORM**: Prisma con **SQLite** (`DATABASE_URL` en `.env`)
- **Base URL frontend**: `http://localhost:3000` (configurado en los servicios Angular)
- **Autenticación**: JWT — middleware `auth.middleware.js` protege las rutas
- **Rutas API principales**:
  - `/auth` — login, register
  - `/pacientes` — CRUD pacientes
  - `/citas` — gestión de citas
  - `/finanzas` — movimientos financieros
  - `/odontograma` — odontograma por paciente
  - `/historias-clinicas` — historia clínica
  - `/tratamientos` — tratamientos por paciente
  - `/dashboard` — estadísticas generales
  - `/notificaciones` — panel de avisos (manuales, automáticas, programadas)

## Schema Prisma — modelos clave

```
Paciente       id, nombre, apellido, documento (unique), telefono?, correo?,
               fechaNacimiento?, direccion?, eps?, alergias?, observaciones?,
               activo (bool), historiaClinicaCompleta (bool)

Usuario        id, nombre, apellido, correo (unique), password, rol (enum),
               telefono?, documento?, activo
               Roles: ADMIN | ODONTOLOGO | AUXILIAR | RECEPCION

Cita           id, pacienteId, usuarioId?, fecha (DateTime), motivo, tipoAtencion?,
               estado (EstadoCita: PROGRAMADA|CONFIRMADA|CANCELADA|ATENDIDA)
               NOTA: hora se guarda dentro del campo DateTime de fecha

Movimiento     id, tipo (INGRESO|EGRESO), concepto, monto, fecha, metodoPago?,
               estado (PENDIENTE|PAGADO|CANCELADO), pacienteId?, citaId?, odontogramaId?

Odontograma    id, pacienteId, fecha, version (int), activo (bool)
  └─ Diente    id, numero, odontogramaId
      └─ DiagnosticoSuperficie  id, superficie (String), diagnostico (Json), dienteId
         NOTA: diagnostico es Json libre — no hay enum en BD, no requiere migración

Tratamiento    id, pacienteId, usuarioId?, odontogramaId?, descripcion, estado
               (ACTIVO|FINALIZADO|PAUSADO), monto?, fechaInicio?, fechaFin?

HistoriaClinica  id, pacienteId, usuarioId?, odontogramaId?, numeroHistoria (unique),
                 campos simples (estadoCivil, sexo, ocupacion, etc.)
                 campos JSON: enfermedadesSistemicas, medicacionActual, alergiasGenerales,
                              antecedentesHematologicos, ginecoObstetricos, habitos,
                              antecedentesOdontologicos, higieneOral
                 declaracionAceptada (bool)

Notificacion     id, titulo, mensaje, tipo (PERSONAL|GLOBAL), leida (bool),
                 usuarioId? (destinatario para PERSONAL), creadoPor? (FK a Usuario),
                 programadaPara? (DateTime — null = inmediata, futuro = programada),
                 createdAt. @@index([programadaPara])

NotificacionDescarte  id, usuarioId, clave (string), fecha (Date)
                      — registra que el usuario descartó una alerta automática ese día
                      @@unique([usuarioId, clave])
```

## Odontograma — sistema de dos categorías

El odontograma distingue entre:

1. **Diagnósticos** (`DiagnosisType`): condiciones dentales que se aplican a superficies específicas del diente (mesial, distal, oclusal, vestibular, palatino). Se almacenan con `superficie: 'M'|'D'|'O'|'V'|'P'`.
   - Tipos: `Caries`, `Obturacion`, `Fractura`, `Sellante`, `Extraccion`, `Endodoncia`, `TratamientoConducto`, `Sano`

2. **Piezas protésicas** (`PieceType`): se aplican al diente completo, se almacenan con `superficie: 'P'` (código especial).
   - Tipos: `Corona`, `Puente`, `Implante`, `ProtesisParcial`, `ProtesisTotal`, `DienteAusente`
   - Un diente puede tener **múltiples piezas simultáneas** (Map<number, PieceType[]>)
   - Compatibilidad legacy: `Protesis` del backend se mapea a `ProtesisParcial`

## Notificaciones — notas de implementación

### Arquitectura general

Hay tres tipos de notificación en el panel "Avisos" de la navbar:

| Sección | Fuente | Persistencia |
|---|---|---|
| **Alertas del sistema** | Computadas en `getNotificacionesService` | No — se calculan en cada request |
| **Mensajes** | Tabla `Notificacion` con `programadaPara IS NULL` o `<= ahora` | Sí |
| **Próximas** | Tabla `Notificacion` con `programadaPara > ahora` | Sí |

### Backend — `notificaciones.service.js`

- `PAGE_MANUALES = 5` — página para la sección "Mensajes". `take: PAGE_MANUALES + 1` para detectar si hay más.
- `getNotificacionesService(usuarioId, { manualesSkip })`:
  - Ejecuta 4 queries en `Promise.all`: manuales paginados, alertas automáticas, próximas, `count()` de no leídas.
  - El `count()` usa el mismo `where` que los manuales **sin** `skip/take` → badge siempre correcto aunque el usuario no haya cargado todas las páginas.
  - Próximas: solo muestra las creadas por el propio usuario (`creadoPor`) o dirigidas a él (`PERSONAL`), ordenadas por `programadaPara asc`.
- Alertas automáticas (`getAutoNotificaciones`): citas hoy, citas mañana, pagos pendientes >15 días, pagos con abono incompleto. Se filtran descartando claves en `NotificacionDescarte` para la fecha actual.
- `createNotificacionService`: valida que `programadaPara`, si se envía, sea una fecha futura. Si no pasa validación lanza `BadRequestError`.

### Frontend — `navbar.ts` / `navbar.html`

- **Formulario de creación** (`notifCrearVisible`): toggle "General" / "Bajo fecha" controla `tipoCreacion: 'general'|'programada'`. El campo `datetime-local` solo aparece en modo programada.
- **`minFechaPrograma`**: getter que devuelve la hora local actual +1 min formateada como `yyyy-MM-ddTHH:mm`. **No usar `toISOString()`** — devuelve UTC y en Colombia (UTC-5) el min quedaría 5 horas adelantado.
- **Paginación "Ver más"**: `manualesSkip` acumula en pasos de 5. Los ítems nuevos se *append* al array existente (`[...prev, ...nuevos]`). Si falla el request, `manualesSkip -= 5` hace rollback.
- **`cargarNotificaciones()`** resetea `manualesSkip = 0` y `cargandoMas = false` antes de cada carga completa. Llama `cdr.detectChanges()` tanto al iniciar (para mostrar "Cargando...") como al terminar — necesario por conflicto zone.js / interceptor funcional en Angular 21.
- **Validación de formulario**: `markAllAsTouched()` antes de retornar, errores inline con `.notif-input--error` y `.notif-field-error`.

### Trampas conocidas

- Si se usa `prisma migrate dev` en lugar de `prisma db push` puede fallar por drift de schema. Usar `db push` para cambios aditivos en desarrollo.
- La comparación `notificaciones.proximas.length > 0` en el template HTML no puede usar `?.` porque retorna `number | undefined` y TypeScript strict rechaza la comparación — `proximas` está definida como no-opcional en la interfaz.

## Citas — notas de implementación

- El listado tiene filtros por estado, tipo de atención, rango de fechas y **documento del paciente**
- Filtro por documento: coincidencia exacta → envía `pacienteId` al backend; coincidencia parcial → filtra client-side via `displayedAppointments` getter usando `pacienteId` del `AppointmentRow`
- `AppointmentRow` incluye `pacienteId?: number` (añadido al backend en `listCitasService`)
- `fechaISO` en `AppointmentRow`: campo seguro para el calendario; fallback en `getFechaISO()` parsea formato `es-CO` "d/m/yyyy" → "yyyy-mm-dd"
- Vista calendario: mes completo en cuadrícula 7×6, chips con hora + apellido, se refresca al guardar nueva cita

## Lenguaje visual — convenciones de sobriedad

El sistema aplica un estilo clínico-institucional consistente en todos los módulos:

- **Status badges** (`status-badge--*`): solo color de texto, sin fondo ni `border-radius` de píldora
- **Botones primarios**: color plano `#2f73d9`, hover oscurece a `#255fc0`. Sin gradiente ni `transform` en hover
- **Tarjetas**: `border-radius: 14px`, `box-shadow: 0 2px 8px rgba(18,38,63,0.06)`
- **Tipografía de títulos** (`h2`, `h3` en cards): `font-weight: 600`
- **Acciones de tabla**: texto plano ("Editar", "Eliminar"), sin íconos simbólicos
- **Fila en edición** (finance): fondo gris frío `#f5f8fb` + borde izquierdo `3px solid #2f73d9`
- **Chips de calendario**: sin fondo, conservan `border-left` de color para escaneo del mes
- Estos patrones aplican a: `finance.css`, `appointment.css`, `list.css`, `dashboard.css`, `navbar.css`, `login.css`

## Funcionalidades pendientes

- **Módulos clínicos "Próximamente"** en historia clínica (`historia-clinica.html`): tiles con clase `module-tile--disabled` pendientes:
  - Evolución de tratamiento
  - Presupuesto

- **Odontograma modo TRATAMIENTO — integración con módulo Tratamientos**
  - El backend ya soporta `tipo='TRATAMIENTO'` (validado en `TIPOS_VALIDOS`; una sola instancia activa por paciente)
  - El frontend tiene `odontogramTab = signal<'diagnostico'|'plan'>('diagnostico')` y señales `planDiagnoses`/`planPieces` — el tab "plan" existe pero no se conecta con el módulo de Tratamientos
  - Lo que falta: navegación desde `tratamientos.ts` al odontograma en modo plan, y decidir con el cliente si la paleta de colores es distinta
  - **Discusión pendiente (2026-05-23):** La lógica de cobro entre los dos tabs tiene fricción. Tab Diagnóstico tiene cobro (clave `{diente}-{tipo}`); tab Plan no tiene cobro. En odontología estricta el diagnóstico es un hallazgo (no cobrable) y el cobro debería originarse del tratamiento realizado. Las piezas también tienen semántica diferente en cada tab (existentes vs. planeadas) pero la UI no lo distingue. **No modificar esta lógica hasta que el cliente defina el flujo real del consultorio.**

- **Scripts de arranque con un clic** — ✅ implementados (2026-05-24). Tres scripts `.command` en `/Biodont/` (raíz del workspace):
  - `iniciar.command` — modo desarrollo: abre 2 terminales (`npm run dev` en :3000 + `ng serve` en :4200)
  - `iniciar-produccion.command` — modo producción: `NODE_ENV=production node src/server.js`, sirve el build Angular desde Express en :3000, abre el navegador automáticamente
  - `reconstruir.command` — ejecutar después de cambios de código: corre `ng build`, que emite **directamente** a `Biodont/public/` (el `outputPath` de `angular.json` apunta allá; no hay paso de copia)

- **Acceso multi-equipo** — ✅ funcional en producción. Backend escucha en `0.0.0.0`. Con `NODE_ENV=production`, Express sirve el frontend desde `public/` (mismo origen → sin CORS). Acceso desde cualquier equipo de la red en `http://<IP_DEL_MAC>:3000` (actualmente `http://192.168.2.8:3000`). La IP del Mac puede cambiar si el router asigna IPs dinámicas — configurar IP estática en las Preferencias de Red si se usa en consultorio.

## Funcionalidades implementadas (antes marcadas como pendientes)

- `list.html`: botón **"Importar"** — ✅ implementado con modal completo (CSV/Excel), `openImportModal()` en `list.ts`, endpoint `POST /pacientes/importar` en backend.
- **Módulo de tratamientos** — ✅ implementado con integración al plan de odontograma (2026-05-26). Formulario, tabla con columna "Plan odo.", botón "Crear desde plan", link al tab plan del odontograma.
- **Pagos parciales en movimientos** — ✅ implementado. Panel de abonos expandible por fila en `finance.html`, barra de progreso, `PagoMovimiento` en schema.
- **Odontograma modo MIXTO** — ✅ implementado. Arcadas mixtas en `odontogram.ts`, botón de selección en UI.
- **Notificaciones programadas y paginación** — ✅ implementado (2026-05-21). Campo `programadaPara`, sección "Próximas", paginación de 5 en 5 con append.
- **Enfermedades odontológicas** — ✅ implementado (2026-05-24). Campo `enfermedadesOdontologicas` en HistoriaClinica, tile activo en módulos clínicos.
- **Fórmulas médicas** — ✅ implementado. Módulo `/formulas-medicas`, ruta en `app.js`, tile activo en historia clínica.
- **Evoluciones** — ✅ implementado. Módulo `/evoluciones`, ruta en `app.js`, tile activo en historia clínica.
- **Hardening de seguridad** — ✅ completado (2026-05-24/26). 4 rondas de auditoría + correcciones: magic bytes, timing attack, RBAC en documentos, restricción de rol en citas, state machines, overpayment guard, JWT placeholder check, race conditions, graceful shutdown.

## UX para uso local en consultorio

El sistema corre en local en 1–2 computadores.

- **Backup/restore** — ✅ implementado en módulo Admin (`/admin`). Descarga `.zip` (dev.db + documentos), restaura desde `.zip` o `.db` con recarga automática de página.
- **Sesión JWT** — Token de 8 horas (`expiresIn: '8h'`). Al expirar el interceptor limpia `localStorage` y redirige a `/login`. No hay refresh token — adecuado para jornada de consultorio.
- **Arranque del sistema** — ✅ implementado (2026-05-24). `iniciar-produccion.command` (doble clic) arranca el backend con `NODE_ENV=production` y abre `http://localhost:3000`. `iniciar.command` para modo desarrollo (2 terminales). `reconstruir.command` para rebuild del frontend.
- **Acceso multi-equipo** — ✅ funcional. Con `iniciar-produccion.command`, cualquier equipo de la red puede acceder en `http://192.168.2.8:3000` (IP puede cambiar si es dinámica — ver nota en sección Scripts).

## Historia clínica — notas de implementación

- Formulario enorme (~135 campos) en un solo `FormGroup` plano — los campos JSON del backend se deserializan/serializan en `patchHistoria()` / `onSave()`
- Los campos `antecedentesQuirurgicos`, `alergiasGenerales`, `antecedentesHematologicos`, `ginecoObstetricos`, `habitos`, `antecedentesOdontologicos` se guardan como `JSON.stringify({...})` (string)
- Los campos `enfermedadesSistemicas` e `higieneOral` se guardan como objeto JSON directo
- `medicacionActual` es un array de `{medicamento, dosis, frecuencia}` — manejado con `FormArray`
- `numeroHistoria` se auto-genera como `HC-{año}-{pacienteId padded 4}`

## Odontograma — notas de implementación

- `buildBackendStructure()`: múltiples piezas por diente se persisten correctamente (corregido). Cada pieza genera una entrada `superficie:'P'` independiente en el array.
- `localStorage` guarda diagnósticos y piezas como caché temporal (efecto en constructor) — no apto para producción multi-tab
- Superficies backend: `M`=Mesial, `D`=Distal, `V`/`C`=Centro, `L`=Lingual, `O`=Oclusal, `P`=Pieza protésica
- Tabla de registros usa `rowspan` por diente; `record-row-last` marca la última fila de cada grupo para el separador entre dientes

## Seguridad backend — patrones establecidos (no cambiar sin razón)

- **Magic bytes en documentos**: `documentos.service.js` usa `detectMimeFromBuffer()` que lee los bytes reales del archivo para determinar el tipo (JPEG, PNG, WebP, PDF). WebP verifica bytes 0–3 (`RIFF`) Y bytes 8–11 (`WEBP`) para distinguir de WAV. El `mimetype` guardado en BD es el detectado, no el declarado.
- **CORS wildcard**: `ALLOWED_ORIGIN: '*'` en `ecosystem.config.js` es **intencional** — decisión del cliente para acceso multi-equipo LAN. En producción (mismo origen), el wildcard no aplica a los requests reales. **No cambiar.**
- **Timing attack**: `auth.service.js` siempre ejecuta `bcrypt.compare` con `DUMMY_HASH` aunque el usuario no exista.
- **Restricción de roles en citas**: el profesional asignado (`usuarioId`) debe tener rol ODONTOLOGO o AUXILIAR — validado en `citas.service.js`. RECEPCION no puede ser asignado.
- **RBAC documentos**: `POST /documentos` requiere ADMIN/ODONTOLOGO/AUXILIAR. `DELETE` requiere ADMIN/ODONTOLOGO. `GET /:id/archivo` requiere ADMIN/ODONTOLOGO/AUXILIAR.
- **Pagos**: `round2 = (n) => Math.round(n * 100) / 100` + `FLOAT_TOL = 0.005` en `finanzas.service.js`. No sobrescribir con lógica propia.
- **resolveDbPath**: en `admin.routes.js`, las rutas relativas de `DATABASE_URL` se resuelven desde `prisma/` (no desde `cwd`).
- **Estado de máquinas**: `TRANSICIONES_VALIDAS` en tratamientos, citas y movimientos. No permitir transiciones arbitrarias.

## Scripts npm (backend)

```
npm start          → node src/server.js (producción)
npm run dev        → nodemon src/server.js (desarrollo)
npm run seed       → node prisma/seed.js (datos base)
npm run seed:demo  → node prisma/seed-demo.js (55 pacientes, datos demo para cliente)
```

`.env.example` disponible en `Biodont/.env.example` como plantilla para nuevas instalaciones.

## Tratamientos — integración con odontograma plan (2026-05-26)

- `tratamientos.html` muestra tarjeta "Plan de odontograma" leyendo el odontograma tipo `TRATAMIENTO` del paciente
- Botón "Crear tratamiento desde plan" pre-completa el formulario con los procedimientos del plan
- Columna "Plan odo." en la tabla muestra link a `/odontogram/{id}?tab=plan` si el tratamiento tiene `odontogramaId`
- Montos en tabla usan `.toLocaleString('es-CO')` — siempre pasar el locale

## Qué NO hacer

- No cambiar el schema de Prisma sin avisar — requiere migración de base de datos
- Para verificar solo tipos, preferir `npx tsc --noEmit` (más rápido que `ng build`; el build sí funciona en el Mac — ver "Verificación de tipos")
- No agregar NgModule, todo es standalone
- No agregar `console.log` de debug al código final
- No crear archivos README ni documentación salvo que se pida explícitamente
- No refactorizar código que no está en el alcance del cambio pedido
- No usar `transform: translateY` ni `box-shadow` animado en hover de botones — rompe el estilo institucional
- **No cambiar `ALLOWED_ORIGIN: '*'`** en `ecosystem.config.js` — decisión explícita del cliente
