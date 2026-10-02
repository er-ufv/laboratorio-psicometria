# Cómo adaptar o mejorar el laboratorio

Las propuestas de otros docentes son bienvenidas: abre una *issue* o un *pull request*.

## Antes de cambiar nada

- **Fuentes legibles y sin compilación.** El código está formateado con prettier (`--print-width 120`). Cada
  módulo separa la matemática (`assets/js/modules/<módulo>/math.js`) de la interfaz (`ui.js`).
- **Colores.** Están en los tokens de `assets/css/styles.css` (`:root`). Cambia la paleta ahí. Los gráficos usan
  `--series-1..3`, y en JavaScript los mismos valores hexadecimales.
- **Cálculos nuevos.** Añade una prueba Node que los compare con R (psych, lavaan, GPArotation o mirt) y, si
  hace falta, un script en `tests/*-reference.R` que genere el fixture.
- **Textos.** Los puntos de corte se presentan como orientaciones, no como reglas. Los ejemplos simulados se
  declaran como tales y no se incluyen datos personales de estudiantes.
- **Preguntas.** Van en `assets/js/core/preguntas.js`, con al menos tres opciones y una explicación para cada una.
  Los distractores deben recoger errores frecuentes, no ser opciones de relleno. `tests/preguntas.test.cjs`
  comprueba el formato y las pautas de redacción.
- **Diseño didáctico.** Antes de mostrar un resultado, pide al estudiante que prediga o produzca algo
  (`Didactica.gate`). Al cambiar un módulo, mantén los objetivos, el cierre y la guía docente. Detalles en
  `docs/REVISION-DIDACTICA.md` y `docs/ARQUITECTURA.md`.

## Pruebas

```sh
npm install                          # Playwright, solo para las pruebas de navegador
npx playwright install chromium
npm test                             # matemáticas + navegador
npm run test:math                    # solo matemáticas (sin navegador)
```

Pruebas de Shiny, con R y los paquetes instalados, desde la raíz:

```sh
Rscript -e 'shiny::runApp("r/factor", port = 3875)' &
Rscript -e 'shiny::runApp("r/rotacion", port = 3877)' &
SHINY=1 npm test
```

Para regenerar los resultados de referencia: `Rscript tests/factor-reference.R` reescribe
`assets/js/modules/factor/examples.js`, y `Rscript tests/rotation-reference.R` reescribe
`tests/fixtures/rotation-r.json`. Anota las versiones de R y de los paquetes en el *commit*.
