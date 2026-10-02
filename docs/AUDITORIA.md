# Auditoría y revisión del laboratorio · octubre de 2026

## Resumen

- **Cálculos.** Los cálculos básicos ya eran correctos y coinciden con R: proporciones, correlaciones, α, EEM,
  Spearman–Brown, probabilidades e información en TRI, KMO, Bartlett e índices ML del AFC. Los problemas
  importantes estaban en otros sitios: en la **interpretación** (puntos de corte presentados como reglas
  universales), en la **detección de soluciones impropias**, en la **referencia del análisis paralelo**, en los
  **índices ordinales del AFC** y en la **robustez de las apps Shiny**.
- **Rotación.** Era el punto más débil para la enseñanza. Había una demostración geométrica con vectores
  inventados, que no optimizaba nada, y un único gráfico F1–F2. Se ha sustituido por un **laboratorio de rotación**
  completo (`rotacion.html` y `r/rotacion`) y por una pestaña del Módulo 5 con resultados reales de R. El motor
  de rotación del navegador reproduce exactamente stats::varimax, GPArotation y psych.
- **Hallazgo en R.** Con poblaciones simétricas, `stats::varimax` (y con él Promax) puede detenerse en el punto
  de partida. Con datos reales, la parada es solo algo prematura. Por eso el laboratorio usa varios inicios y lo
  documenta.
- **Formato del proyecto.** Se han corregido fallos de interfaz (tooltips, tablas, contraste, impresión, menú en
  móvil, desbordamiento) y se han añadido los contenidos básicos que faltaban (D, biserial puntual, distractores,
  dos mitades, KR-20/21, Kelley, Δχ², AIC/BIC). La paleta pasa a tokens comunes y la tipografía es local. Las
  fuentes están en formato legible y las pruebas no dependen de ningún navegador concreto.
- **Didáctica.** Una segunda revisión aplicó criterios de diseño instruccional a los siete módulos: objetivos,
  predicciones, «predice antes de ver», escalera de ayudas, calibración, cierre con guía docente y repaso
  espaciado. Detalle en [`REVISION-DIDACTICA.md`](REVISION-DIDACTICA.md).
- **Pruebas.** 18 pruebas automáticas (Node, navegador y Shiny) y 8 scripts de R, entre referencias y casos límite. Todas pasan con
  R 4.3.3, psych 2.4.1, GPArotation 2024.2-1, lavaan 0.6.17 y Chromium, también con `LANG=C`.

## Alcance y método

- **Qué se revisó.** Todo el código: 6 páginas HTML (más la nueva del laboratorio), los scripts JS y CSS, los
  archivos R y las pruebas. También los textos de los seis módulos y la documentación anterior.
- **Cálculos.** Se recalcularon en R (psych, lavaan, GPArotation) y en Node; los resultados TRI se compararon
  con los fixtures de mirt 1.47 incluidos.
- **Interfaz.** Se recorrió con Playwright y Chromium a 1440 y 390 px, comprobando errores de consola, tooltips,
  desbordamiento, impresión y teclado.
- **Shiny.** Se ejecutaron las cuatro apps (`r/`, `r/factor`, `r/tct`, `r/tri`) y la nueva `r/rotacion`, en
  locale UTF-8 y en locale C.
- **Severidad.** **Alta** = resultado o interpretación incorrectos, o app que no funciona. **Media** = error
  conceptual menor, contenido básico ausente o fallo visible de interfaz. **Baja** = detalle de presentación o
  de mantenimiento.

## Hallazgos y correcciones

### Transversales

| Sev. | Hallazgo | Corrección |
|---|---|---|
| Alta | Las apps Shiny fallaban en locale C/POSIX: `factor_math.R` se cortaba en la primera tilde y las etiquetas salían como `<U+00F3>`. | `r/modules/host.R` activa UTF-8 si es posible. Las fuentes R son ASCII con escapes `\u`; las etiquetas se crean con `setNames()`. Probado con `LANG=C`. |
| Media | HTML, CSS y JS estaban minificados en una línea, imposibles de revisar o adaptar en GitHub. | Todo el código está ahora formateado con prettier, ancho 120. `examples.js` sigue en una línea porque son datos generados. |
| Media | Unos 130 colores sueltos, sin sistema, y varios con contraste insuficiente (#85c8ff o ámbar sobre blanco). | Tokens en `:root` de `styles.css`, con la paleta de azul marino, azul y amarillo. Textos con contraste ≥ 4,5:1 y series de gráficos validadas para daltonismo. |
| Media | Los créditos atribuían el «perfeccionamiento» a una herramienta de IA y una fuente citaba una web institucional. | Créditos: «Diseño, contenidos y dirección: Eduar Ramírez». La interfaz no nombra ninguna institución. La asistencia de IA se indica en el README. |
| Baja | La cuadrícula de módulos de la portada pegaba número, título y subtítulo. | Estilos de `.home-modules`. |
| Baja | «Imprimir ficha» imprimía también la cabecera y la cuadrícula. | Regla de impresión final. Los campos vacíos se imprimen como líneas para escribir a mano. |
| Baja | En pantallas de 768 px de alto la barra lateral cortaba los créditos. | La barra lateral es compacta y desplazable. |
| Baja | Las pruebas de navegador exigían Microsoft Edge. | Usan el Chromium de Playwright; `PLAYWRIGHT_CHANNEL` permite elegir otro navegador. |

### Módulo 1 · Diseño de tests

| Sev. | Hallazgo | Corrección |
|---|---|---|
| Media | El editor de rendimiento óptimo obligaba a usar exactamente 3 opciones. | Admite de 3 a 5 opciones. Pide confirmación si al reducirlas se pierde texto y avisa si la clave quedaba fuera. |
| Media | El README prometía trasladar fichas entre equipos, pero no había importación. | Nuevo «Importar ficha JSON», con la misma validación y saneamiento que el almacenamiento local. |
| Baja | Al retirar un campo con el foco puesto, un evento «change» corrompía las opciones. | Corregido. |

### Módulo 2 · Análisis de ítems

| Sev. | Hallazgo | Corrección |
|---|---|---|
| Alta | Faltaban el índice D de grupos extremos, la biserial puntual y el análisis de distractores. Además, la página decía que discriminación y homogeneidad eran «exactamente el mismo cálculo». | Nueva pestaña «Grupos extremos y distractores»: 24 × 8 respuestas A–D editables, con p, p_S, p_I, D (27 %), r_bp, r ítem-resto, α (KR-20) y tabla de distractores, más una predicción previa. Texto corregido: Pearson con un ítem 0/1 *es* r_bp. |
| Alta | Puntos de corte presentados como universales: «se retienen ítems con r ≥ 0,30», α «inaceptable/excelente», p «zona óptima». | Ahora son orientaciones convencionales (Ebel, 1965; Nunnally y Bernstein, 1994) que dependen del uso. Se aplican a la correlación ítem-resto. Se añade que, con azar, la dificultad óptima es ≈ (1 + 1/k)/2. |
| Media | «Más ítems aumenta α solo si son homogéneos» es falso: con r̄ > 0 constante, α siempre aumenta con la longitud. | Texto corregido: un α alto puede deberse solo a la longitud. |
| Media | Un ítem inverso con r = −0,42 se describía como «no discrimina». | Ahora: discrimina en sentido opuesto; recodificar con x′ = mín + máx − x. |
| Media | Notación ambigua: D para la dificultad (choca con D de discriminación) y s²_X para la varianza del ítem. | p_j y s²_j = p_j·q_j (denominador N). |
| Media | La corrección por azar tenía una etiqueta contradictoria y un ejemplo que solo cuadraba con k = 2. | Fórmulas, ejemplo (k = 4) y limitaciones coherentes. |
| Media | Los tooltips lanzaban un TypeError al pasar el ratón por el gráfico; la tabla de calidad de vida tenía el pie desalineado; el valor del paso a paso era invisible (azul sobre azul marino); el punto «tu configuración» era blanco sobre blanco. | Corregido y cubierto por las pruebas, que ahora pasan el ratón por cada gráfico. |
| Baja | La «Práctica global» no mostraba α; salían «+NaN» y «59,999…»; el menú lateral reaparecía en móvil; había código muerto. | Corregido. |

### Módulo 3 · Teoría clásica

| Sev. | Hallazgo | Corrección |
|---|---|---|
| Media | Faltaban contenidos básicos: dos mitades con Spearman–Brown, KR-20/21, índice de fiabilidad, estimación de Kelley y error de la diferencia. | Panel 06 «Mitades y estimación»: matriz 0/1 editable, las 10 divisiones en mitades (su media es α), Guttman–Flanagan, KR-20/21 y una calculadora de Kelley con sus intervalos. |
| Media | La simulación de formas paralelas usaba semillas fijas, y en esa realización la r entre formas sobrestimaba siempre ρ. | Botón «Nueva muestra» y explicación de la variabilidad muestral. |
| Baja | Los gráficos reescalaban los ejes con cada cambio y ocultaban el efecto que se quería ver. | Ejes fijos y diagonal y = x. |

### Módulo 4 · Respuesta al ítem

| Sev. | Hallazgo | Corrección |
|---|---|---|
| Media | La fiabilidad condicional 1 − 1/[I·Var(θ̂)], con Var(θ̂) = 1, salía negativa en gran parte de la escala, porque Var(θ̂) ≈ σ² + E[EE²] > 1. | Por defecto se usa ρ(θ) = σ²I/(σ²I + 1), acotada en [0, 1). La variante de Raju et al. (2007) queda como opción explicada. |
| Media | No se trataban la invarianza (que solo se cumple si el modelo ajusta), la indeterminación de la escala de θ ni la información máxima. | Añadidos: I_max = D²a²/4 en el 2PL y θ_max del 3PL (verificados en 192 casos en R) y dos preguntas nuevas. |
| Baja | Punto decimal en un módulo escrito con coma; el eje del EE llegaba a 100. | Formato es-ES; el eje del EE se corta en 5 y se avisa cuando ocurre. |

### Módulo 5 · Análisis factorial exploratorio

| Sev. | Hallazgo | Corrección |
|---|---|---|
| Alta | Casos Heywood presentados como «convergente y admisible»: psych acota u² en 0,005, así que `u2 > 0` nunca los detectaba. Había 16 soluciones del ejemplo independiente con h² ≈ 0,995. | Regla h² > 0,99, campo `heywood` en las 144 soluciones y aviso con el ítem afectado en la web y en Shiny. |
| Media | El análisis paralelo usaba SMC = FALSE: en el 15–24 % de las réplicas psych caía en un Heywood y el «percentil 95» era un artefacto. El texto, además, hablaba de «permutar». | SMC = TRUE (matriz reducida con correlaciones múltiples al cuadrado). El texto describe ahora lo que hace psych: remuestreo de cada columna con reposición. Las sugerencias son 3/3/3/0, con media y con P95. |
| Media | Faltaban la escala orientativa del KMO (Kaiser, 1974) y los autovalores de R, aunque el texto criticaba la regla «> 1». | Añadidos. En el ejemplo independiente la regla de Kaiser sugeriría 4 factores; el análisis paralelo, 0. |

### Rotación (Módulo 5 y laboratorio nuevo)

| Sev. | Hallazgo | Corrección |
|---|---|---|
| Alta (didáctica) | La «demostración geométrica» giraba vectores inventados que ya tenían estructura simple. Girar los empeoraba, y la escena no mostraba ninguna solución real. | Se sustituye por el **laboratorio de rotación** (`rotacion.html`), que parte de soluciones sin rotar de poblaciones y de los datos del Módulo 5. |
| Media | Solo había un gráfico F1–F2 de cargas de patrón, sin elegir el par de factores ni comparar con la solución sin rotar. | Selector de par de factores, superposición con la solución sin rotar y tabla con las cuatro soluciones reales de psych: muestra que Σh², h² y RMSR no cambian y que la varianza por factor, Φ y las cargas secundarias sí. |
| Media | No se explicaba qué optimiza cada método, qué hace la normalización de Kaiser, ni la diferencia geométrica entre patrón y estructura. | Apartados 02–04 del laboratorio y `docs/ROTACION.md`. |
| Media | `stats::varimax` (y Promax, que empieza por Varimax) puede quedarse en la solución sin rotar con poblaciones simétricas: su iteración vuelve al punto de partida (V = 0,025 frente a 0,455). Con los datos de dos factores se detiene algo antes del óptimo: Δcarga ≤ 0,015. | 12 inicios con tolerancia estricta en el laboratorio, con aviso en la calculadora y explicación en la guía. La web conserva la reproducción exacta de psych con un inicio. |
| Baja | El botón «Oblicua · Oblimin / Promax» marcaba como activas dos rotaciones a la vez. | Un botón por rotación, con `aria-pressed` correcto. |

### Módulo 6 · Análisis factorial confirmatorio

| Sev. | Hallazgo | Corrección |
|---|---|---|
| Alta | Shiny aceptaba modelos no identificados: `F1 =~ I1 + I2` daba gl = −1 y aparecía como «admisible». | Se detiene si gl < 0 o si lavaan avisa de no identificación. Con gl = 0 indica que el modelo está saturado. |
| Media | Con WLSMV se mostraban RMSEA, CFI y TLI `.scaled` (ingenuos): RMSEA 0,022 frente a 0,045 robusto. | χ², gl y p escalados y desplazados; RMSEA, CFI y TLI `.robust` (Savalei, 2021). |
| Media | Faltaban Δχ² entre modelos anidados, AIC/BIC, el cálculo de gl, las fórmulas y la identificación por indicador marcador. | Añadidos, con Δχ² = 757,04 (gl = 3) en ML y la prueba ajustada de Satorra (2000) en WLSMV. |
| Baja | En la tabla Φ con un factor aparecía «G1» en lugar de «G»; el diagrama no tenía flechas dobles. | Corregido. |

### Shiny

| Sev. | Hallazgo | Corrección |
|---|---|---|
| Media | Los errores salían en crudo: separador equivocado, campo «Factores» vacío, decimal con coma. | Mensajes en castellano, lectura robusta (BOM, una sola columna, separador igual al decimal) y vuelta a los ejemplos tras cargar un CSV. |
| Media | Enlaces absolutos `/laboratorio/…`, que fallan bajo Shiny Server o Connect, y `addResourcePath` publicaba todo el repositorio. | Enlaces relativos; solo se publican los `.html`, `assets/` y `data/`. |
| Nuevo | — | `r/rotacion`: laboratorio manual de rotación. `r/factor` tiene una pestaña «Rotación» con la comparación de las cuatro rotaciones, un plano de cargas, la estructura y la congruencia de Tucker. |

## Verificación ejecutada

Resultados en `docs/VERIFICACION.md`.

## Limitaciones conocidas

- **TRI.** mirt no pudo instalarse en el entorno de esta revisión. Los contrastes de TRI siguen usando los
  fixtures generados con mirt 1.47, y las fórmulas nuevas se contrastan con R nativo.
- **Versiones de R.** Las referencias factoriales se regeneraron con psych 2.4.1 y lavaan 0.6.17; antes se usaron
  2.6.5 y 0.7.2. La diferencia máxima en cargas rotadas es 0,0013; las comunalidades e índices ML no cambian.
- **AFE con datos nuevos.** La web del AFE muestra resultados de R ya calculados; para datos propios se usa
  `r/factor`. La calculadora de rotación sí rota cualquier matriz en el navegador.
- **TRI sin calibración.** El módulo explora parámetros conocidos: no estima parámetros ni θ.
- **Apps antiguas.** Las tres apps Shiny originales de la versión anterior no se incluyen,
  porque no estaban auditadas.
- **Efecto didáctico.** No se ha evaluado. Las herramientas están diseñadas para movilizar predicción,
  generación, ejemplos resueltos, recuperación espaciada y calibración, pero no se ha medido su efecto. En
  `REVISION-DIDACTICA.md` se propone cómo comprobarlo.
