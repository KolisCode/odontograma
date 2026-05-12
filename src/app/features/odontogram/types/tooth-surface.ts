export type ToothSurface =
  | 'Vestibular' // Cara externa (labios / mejillas) — arriba en arcada superior
  | 'Lingual'    // Cara interna hacia la lengua — arriba en arcada inferior
  | 'Palatina'   // Cara interna hacia el paladar — abajo en arcada superior
  | 'Mesial'     // Cara que mira hacia la línea media
  | 'Distal'     // Cara opuesta a la línea media
  | 'Oclusal';   // Superficie central de oclusión / mordida
