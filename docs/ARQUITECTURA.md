# Arquitectura

La web es estática: HTML, CSS y JavaScript clásico, sin compilación y sin dependencias en línea. Funciona
abriendo los archivos directamente (`file://`) y en GitHub Pages. Las apps Shiny sirven esa misma web y añaden
análisis nativos en R.

```
index.html             Módulo 1 · Diseño de tests (portada)
analisis.html          Módulo 2 · Análisis de ítems
tct.html               Módulo 3 · Teoría clásica
tri.html               Módulo 4 · Teoría de respuesta al ítem
afe.html               Módulo 5 · Análisis factorial exploratorio
rotacion.html          Módulo 5b · Laboratorio de rotación
afc.html               Módulo 6 · Análisis factorial confirmatorio
repaso.html            Repaso espaciado (preguntas de todos los módulos)

assets/css/            styles.css (tokens de color y tipografía, maqueta común), didactica.css (componentes
                       didácticos comunes) + una hoja por módulo
assets/fonts/          Manrope (OFL), variable, subconjuntos latino y griego
assets/vendor/         Chart.js 4.4.0 (MIT)
assets/js/core/        state.js: almacenamiento, validación, exportación/importación de fichas
                       didactica.js: predicciones, cuestionario, «predice antes de ver», autoexplicación,
                       paginación (objeto global Didactica)
                       preguntas.js: contenido de predicciones y cuestionarios (Predicciones, Preguntas)
                       repaso.js: página de repaso espaciado
assets/js/modules/
  diseno/              data.js (contenidos y referencias), ui.js
  analisis/            math.js (índices de ítems), ui.js, integration.js (validación y accesibilidad)
  tct/                 math.js, ui.js
  tri/                 math.js (1PL–4PL, MRG, información, fiabilidad condicional), ui.js
  factor/              math.js (KMO, Bartlett, autovalores), rotation.js (motor de rotación),
                       examples.js (resultados de R generados), common-ui.js, afe-ui.js, afc-ui.js,
                       rotacion-ui.js
data/                  continua.csv, ordinal.csv, independiente.csv (600 × 9, simulados)

r/app.R                Toda la web servida desde Shiny (iframe)
r/factor/app.R         AFE y AFC nativos con CSV propios (psych, lavaan) y pestaña de rotación
r/rotacion/app.R       Laboratorio de rotación manual (stats, GPArotation)
r/tct/app.R, r/tri/app.R   Anfitriones de los módulos 3 y 4
r/modules/             host.R (UTF-8, recursos), *_math.R (funciones nativas), anfitriones de iframe

tests/                 Pruebas Node (*.test.cjs), scripts de referencia R (*-reference.R) y fixtures/
docs/                  Auditoría, verificación, guía docente, guía de rotación, fuentes e imágenes
```

## Convenciones

- **Separar la matemática de la interfaz.** Cada `math.js` y `rotation.js` exporta funciones puras que se
  cargan en el navegador (`globalThis.X`) y en Node (`module.exports`). Las pruebas las contrastan con R.
- **Sin datos inventados en los cálculos factoriales.** El AFE y el AFC de la web muestran resultados reales de
  psych y lavaan, precalculados en `examples.js` por `tests/factor-reference.R`. El laboratorio de rotación sí
  calcula en el navegador, con un motor que reproduce R.
- **Tokens de color.** Todos los colores salen de `:root` en `styles.css`. Los gráficos usan tres series
  (`#2a49d4`, `#b98409`, `#1c8fcc`) validadas para daltonismo y con contraste ≥ 3:1 frente al fondo. Los textos
  tienen un contraste ≥ 4,5:1.
- **R en ASCII.** Los archivos `.R` usan escapes `\uXXXX` y `setNames()` para las etiquetas. Así funcionan en
  cualquier locale.
- **Accesibilidad.**
  - Las pestañas siguen el patrón ARIA y se manejan con el teclado.
  - Los gráficos tienen una descripción textual o una tabla equivalente.
  - Las asas de los ejes del laboratorio se mueven con las flechas.
  - Se respeta `prefers-reduced-motion`.
- **Privacidad.** Nada se envía a ningún servidor. El navegador guarda las fichas del Módulo 1, las
  predicciones y la cola de repaso en `localStorage`, siempre con `try/catch`; sin almacenamiento, todo
  funciona igual. La exportación CSV usa un código seudónimo.

## Componentes didácticos (`assets/js/core/didactica.js`)

Se cargan antes de los scripts de cada módulo y se activan de forma declarativa.

**Marcas en el HTML:**

| Marca | Qué genera |
|---|---|
| `<div data-predict="clave">` | Formulario de predicciones de `Predicciones[clave]` |
| `<div data-predcheck="clave">` | Botón que las contrasta |
| `<div data-quiz="clave" data-module="m">` | Cuestionario de `Preguntas[clave]` |
| `<div data-autoexp>` | Autoexplicación: necesita `textarea`, `button` y `.dx-model[hidden]`. El modelo solo se muestra con 20 o más caracteres |
| `[role=tablist][data-pager]` | Añade botones de avance al final de cada panel |

**Formato de pregunta:**

```js
{ id: "tct-07", tipo: "recuerdo" | "aplicacion" | "transferencia", q: "…",
  o: [["opción", "por qué"], …], a: índice, pista: "…" }
```

- La explicación de la correcta empieza por «Correcto».
- Las opciones se barajan con una semilla fija.
- Los fallos al primer intento se guardan en la cola `psicometria.v1.repaso`.

**API:**

- `Didactica.gate({ anchor, hide, prompt, kind, value, tolerance, explain })` vela uno o varios elementos hasta
  que el estudiante predice. Se llama desde el `ui.js` de cada módulo, después de pintar el resultado.
- `Didactica.quiz(host, clave, { items, module, review })` crea un cuestionario con preguntas propias. Es lo que
  usa `repaso.js`.
- `Didactica.store` es el único acceso a `localStorage`, con `try/catch` y el prefijo `psicometria.v1.`.

## Motor de rotación (`assets/js/modules/factor/rotation.js`)

- **`rotate(A, método, opciones)`** admite `none`, `varimax`, `quartimax`, `oblimin` (γ), `geominQ` (δ) y
  `promax` (κ). Opciones:
  - `normalize`: Kaiser, en GPA;
  - `order`: reflejar y ordenar como psych;
  - `starts`: número de inicios.
  Devuelve el patrón, la estructura, Φ, los ejes T, h², la varianza común de cada factor, las iteraciones, la
  convergencia y los valores del criterio.
- **Rotación a mano:**
  - `manual(A, [α1, α2])` construye la solución a partir de dos ángulos;
  - `fromAxes(A, T)`, a partir de unos ejes cualesquiera;
  - `axisAngles(T)` devuelve los ángulos de unos ejes.
- **Otras funciones:**
  - `principalAxes(Λ, Φ)` da la solución sin rotar de una población;
  - `congruence(A, B)` calcula la congruencia de Tucker;
  - `parseMatrix(texto)` lee las cargas pegadas en la calculadora.
- **Inicios.** Con `starts: 1` (por defecto) se reproduce R. Con más inicios se usa una tolerancia estricta y se
  conserva el mejor criterio; ver `docs/ROTACION.md`.

## Añadir o cambiar un módulo

1. Copia la estructura de una página existente: barra lateral, `topbar` con «Página principal», pestañas
   `.tct-tabs` y pie.
2. Pon la matemática en `assets/js/modules/<módulo>/math.js`, con una prueba en `tests/<módulo>.test.cjs`
   contrastada con R.
3. Añade el enlace en la barra lateral de todas las páginas y en `.home-modules` de `index.html`.
4. Incluye `didactica.css`, `preguntas.js` y `didactica.js` en el `<head>`. Después añade:
   - el bloque `.dx-start` con objetivos y `data-predict`;
   - el cuestionario `data-quiz`;
   - el cierre `.dx-closing` con `data-predcheck`, `data-autoexp`, las ideas clave y `.dx-teacher`.
   Las preguntas van en `preguntas.js`.
5. Ejecuta `npm test` y revisa la página a 1440 y 390 px.
