# Biodont — Frontend

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

> Frontend del sistema odontológico Biodont. **Backend:** [Biodont](https://github.com/JhohanBustamante/Biodont) · **Documentación completa:** [README raíz](../README.md)

Interfaz Angular para sistema de gestión odontológica. Incluye odontograma digital interactivo, historia clínica, agenda de citas y panel de administración.

## Stack

- **Angular 21** — standalone components, RxJS
- **TypeScript 5**
- Comunicación con API local en `http://localhost:3000`

## Instalación

```bash
npm install
npm start    # → http://localhost:4200
```

> Requiere el backend corriendo en `http://localhost:3000`. Ver [biodont-api](https://github.com/TU_USUARIO/biodont-api).

## Build de producción

```bash
npm run build    # genera dist/ para servir desde el backend
```

## Verificación de tipos

```bash
node node_modules/typescript/bin/tsc --noEmit
```
