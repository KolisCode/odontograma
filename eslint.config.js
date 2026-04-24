// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = defineConfig([
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "app", style: "camelCase" },
      ],
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "app", style: "kebab-case" },
      ],
      // El proyecto usa constructor injection de forma consistente — migrar a inject() es una
      // decisión de refactor mayor, no un bug. Desactivada para no generar ruido falso.
      "@angular-eslint/prefer-inject": "off",
      // any explícito como advertencia — hay casos legítimos en adaptadores de backend
      "@typescript-eslint/no-explicit-any": "warn",
      // Tipo inferible en declaración: estilo, no bug
      "@typescript-eslint/no-inferrable-types": "off",
      // Funciones vacías intencionales (callbacks de error vacíos, etc.)
      "@typescript-eslint/no-empty-function": "warn",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      // El proyecto usa *ngIf/*ngFor por convención — no @if/@for
      "@angular-eslint/template/prefer-control-flow": "off",
      // App clínica de uso interno — accesibilidad WCAG no es requisito activo
      "@angular-eslint/template/click-events-have-key-events": "off",
      "@angular-eslint/template/interactive-supports-focus": "off",
      // 87 labels sin `for` en todo el proyecto — deuda real pero no urgente
      "@angular-eslint/template/label-has-associated-control": "warn",
    },
  }
]);
