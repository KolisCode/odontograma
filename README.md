<p align="center">
  <img src="./screenshots/readme-banner.png" alt="KolisCode Banner" width="100%"/>
</p>

# Biodont — Frontend

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

> Frontend del sistema odontológico Biodont. **Backend:** [Biodont](https://github.com/KolisCode/Biodont) · **API docs:** ver repo backend

Interfaz Angular para sistema de gestión odontológica. Incluye odontograma digital interactivo, historia clínica, agenda de citas y panel de administración.

---

## Capturas

<table>
  <tr>
    <td><img src="./screenshots/Dashboard.png" alt="Dashboard"/><br/><sub>Dashboard principal</sub></td>
    <td><img src="./screenshots/Odontograma_diagnostico.png" alt="Odontograma diagnóstico"/><br/><sub>Odontograma — diagnóstico</sub></td>
  </tr>
  <tr>
    <td><img src="./screenshots/Odontograma_tratamiento.png" alt="Odontograma tratamiento"/><br/><sub>Odontograma — plan de tratamiento</sub></td>
    <td><img src="./screenshots/Pacientes.png" alt="Listado de pacientes"/><br/><sub>Gestión de pacientes</sub></td>
  </tr>
  <tr>
    <td><img src="./screenshots/Citas_Calendario.png" alt="Citas y calendario"/><br/><sub>Agenda y calendario</sub></td>
    <td><img src="./screenshots/Administracion.png" alt="Administración"/><br/><sub>Panel de administración</sub></td>
  </tr>
  <tr>
    <td><img src="./screenshots/Movimientos.png" alt="Movimientos financieros"/><br/><sub>Módulo de finanzas</sub></td>
    <td><img src="./screenshots/Login.png" alt="Login"/><br/><sub>Inicio de sesión</sub></td>
  </tr>
</table>

---

## Stack

- **Angular 21** — standalone components, RxJS
- **TypeScript 5**
- Comunicación con API en `http://localhost:3000`

## Instalación

```bash
npm install
npm start    # → http://localhost:4200
```

> Requiere el backend corriendo en `http://localhost:3000`. Ver [KolisCode/Biodont](https://github.com/KolisCode/Biodont).

## Build de producción

```bash
npm run build    # genera dist/ para servir desde el backend
```

## Verificación de tipos

```bash
node node_modules/typescript/bin/tsc --noEmit
```
