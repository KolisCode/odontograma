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
- **HTTP**: `HttpClient` con interceptor JWT en `token-interceptor.ts`. El interceptor añade `Authorization: Bearer <token>` automáticamente
- **Rutas protegidas**: `authGuard` para usuarios autenticados, `guestGuard` para login/register

## Verificación de tipos

**NO usar `npx ng build`** — se queda sin memoria en este entorno.

Usar en su lugar:
```bash
npx tsc --noEmit
```

## Backend

- **Runtime**: Node.js con CommonJS (`require`/`module.exports`)
- **Puerto**: 3000
- **ORM**: Prisma con PostgreSQL
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

## Odontograma — sistema de dos categorías

El odontograma distingue entre:

1. **Diagnósticos** (`DiagnosisType`): condiciones dentales que se aplican a superficies específicas del diente (mesial, distal, oclusal, vestibular, palatino). Se almacenan con `superficie: 'M'|'D'|'O'|'V'|'P'`.
   - Tipos: `Caries`, `Obturacion`, `Fractura`, `Sellante`, `Extraccion`, `Endodoncia`, `TratamientoConducto`, `Sano`

2. **Piezas protésicas** (`PieceType`): se aplican al diente completo, se almacenan con `superficie: 'P'` (código especial).
   - Tipos: `Corona`, `Puente`, `Implante`, `ProtesisParcial`, `ProtesisTotal`, `DienteAusente`
   - Un diente puede tener **múltiples piezas simultáneas** (Map<number, PieceType[]>)
   - Compatibilidad legacy: `Protesis` del backend se mapea a `ProtesisParcial`

## Funcionalidades pendientes / botones sin implementar

- `list.html`: botón **"Importar"** — sin acción
- `appointment.html`: botón **"Ver calendario"** — sin acción
- `historia-clinica.html`: botón **"Vista previa"** — sin acción
- `historia-clinica.html`: sección **"Módulos clínicos asociados"** — comentada (~líneas 603-647)

## Qué NO hacer

- No cambiar el schema de Prisma sin avisar — requiere migración de base de datos
- No usar `ng build` para verificar — OOM
- No agregar NgModule, todo es standalone
- No agregar `console.log` de debug al código final
- No crear archivos README ni documentación salvo que se pida explícitamente
- No refactorizar código que no está en el alcance del cambio pedido
