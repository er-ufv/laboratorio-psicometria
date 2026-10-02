# Verificación

**Entorno de la última ejecución** (2 de octubre de 2026):

- **R y paquetes:** R 4.3.3, psych 2.4.1, GPArotation 2024.2-1, lavaan 0.6.17, shiny 1.8.0.
- **Node y navegador:** Node 22 y Chromium (Playwright 1.56).
- **TRI:** los valores de referencia proceden de mirt 1.47 (fixtures incluidos).
- **Locale:** las pruebas de R y Shiny se ejecutaron también con `LANG=C`.

## Resultados por módulo

| Módulo | Prueba | Qué se contrasta | Resultado |
|---|---|---|---|
| 1 · Diseño | `diseno.test.cjs`, `ui.test.cjs` | Progreso, almacenamiento fallido, saneamiento, 3–5 opciones, importación JSON validada, impresión, móvil | Pasa |
| 2 · Ítems | `analisis.test.cjs` | Pearson, varianza cero, ítem-total → ítem-resto exacta, α estandarizado frente a `stats::cor`/`cov` | Pasa |
| 2 · Ítems | `analisis-discriminacion.test.cjs` + `analisis-discriminacion-reference.R` | p, D (27 %), r_bp, ítem-resto, distractores y α frente a R/psych (`score.multiple.choice`, `alpha`) | 131 valores; error máx. 5·10⁻¹⁶ |
| 2 · Ítems | `analisis-ui.test.cjs` | Todas las pestañas, 11 gráficos con tooltip, contraste y entradas inválidas | Pasa |
| 3 · TCT | `tct.test.cjs` + `tct-reference.R` | α bruto/estandarizado, α sin cada ítem, EEM, intervalos, Spearman–Brown, dos mitades, KR-20/21, Kelley, error de la diferencia | 33 valores; error máx. 2,1·10⁻¹⁴ |
| 3 · TCT | `tct-ui.test.cjs` | Seis paneles, «Nueva muestra», ejes fijos, casos límite (r = 1, varianzas nulas, α negativo) | Pasa |
| 4 · TRI | `tri.test.cjs` | 1PL–4PL y MRG: probabilidades, información y EE frente a mirt 1.47; bancos de 10–30 ítems; fiabilidad condicional (dos definiciones); máximos de información | 1260 + 336 valores; error máx. 2,6·10⁻¹¹ |
| 4 · TRI | `tri-native.R` | Funciones R nativas: fiabilidad condicional, 192 máximos de información, indeterminación lineal de θ | Pasa (dif. máx. 1,1·10⁻⁷) |
| 4 · TRI | `tri-ui.test.cjs` | Cuatro modelos, 3–5 categorías, umbrales inválidos, teclado | Pasa |
| 5 · AFE | `factor.test.cjs` | KMO, Bartlett y autovalores JS frente a psych; 144 soluciones (h² = diag(ΛΦΛ′), S = PΦ, matriz reproducida, RMSR); 16 Heywood | Pasa |
| 5 · AFE | `factor-ui.test.cjs` | Navegación, un factor, matriz imposible, Heywood visible, comparación de rotaciones, móvil | Pasa |
| 5b · Rotación | `rotation.test.cjs` + `rotation-reference.R` | 72 rotaciones de `psych::fa` (Varimax, Oblimin, Promax) desde la solución sin rotar; 56 rotaciones de GPArotation/psych (Quartimax, Oblimin γ ∈ {−0,5; 0; 0,5}, Geomin, Promax κ ∈ {2; 4}); rotación manual; criterios; invariancia de h²; recuperación de la población; inicios múltiples | 7404 valores; error máx. 1,3·10⁻⁷ (2·10⁻¹⁵ frente a psych::fa) |
| 5b · Rotación | `rotacion-ui.test.cjs` | Los siete apartados en escritorio y móvil: teclado, animaciones, práctica con ayudas, calculadora y CSV, calibración | Pasa |
| 5b · Rotación | `rotacion-shiny.test.cjs` | `r/rotacion`: Varimax con varios inicios (−38° / 52°), Oblimin (φ ≈ 0,30), h² invariante | Pasa, también con `LANG=C` |
| Todos · Didáctica | `preguntas.test.cjs` | 47 preguntas y 18 predicciones: identificadores, tipos, ≥ 3 opciones con explicación, transferencia en cada módulo, longitud de la correcta | Pasa |
| Todos · Didáctica | `didactica.test.cjs` | Objetivos y cierre, predicciones guardadas y contrastadas, «predice antes de ver» en TCT/TRI/AFE/AFC con reintento, paginación, autoexplicación, escalera pista → solución, calibración, CSV seudónimo, repetir falladas, cola y página de repaso, ejemplo de Diseño y almacenamiento bloqueado | Pasa |
| Todos · Didáctica | `quiz-colors-ui.test.cjs` | El mismo cuestionario en los siete módulos: rojo sin revelar al fallar, verde al acertar, opciones bloqueadas | Pasa |
| 6 · AFC | `factor.test.cjs` + `factor-reference.R` | χ² ML recalculado (n·F_ML), RMSEA, CFI y TLI por fórmula, gl = momentos − parámetros, Δχ², AIC/BIC; identificación por marcador equivalente | Pasa |
| 5–6 · Shiny | `factor-shiny.test.cjs`, `factor-edge.R` | AFE y paralelo, Heywood, AFC ML/WLSMV robusto, modelos no identificados y saturados, CSV con separador o decimal erróneos, BOM, vuelta a ejemplos, archivos expuestos | Pasa, también con `LANG=C` |

## Valores de referencia de los ejemplos (600 personas × 9 indicadores, simulados)

| Ejemplo | KMO | Paralelo (media / P95) | Kaiser (autovalores de R > 1) |
|---|---|---|---|
| Continuos · Pearson | 0,802 | 3 / 3 | 3 |
| Ordinales · Pearson | 0,791 | 3 / 3 | 3 |
| Ordinales · policóricas | 0,796 | 3 / 3 | 3 |
| Independientes · Pearson | 0,492 | 0 / 0 | 4 |

| AFC | Estimador | χ² (gl) | RMSEA [IC 90 %] | CFI | TLI | SRMR |
|---|---|---|---|---|---|---|
| Continuos, 3 factores | ML | 28,25 (24) | 0,017 [0, 0,039] | 0,998 | 0,997 | 0,020 |
| Continuos, 1 factor | ML | 785,30 (27) | 0,216 [0,203, 0,230] | 0,606 | 0,475 | 0,127 |
| Ordinales, 3 factores | WLSMV (robusto) | 31,24 (24) | 0,045 [0,022, 0,067] | 0,986 | 0,978 | 0,026 |
| Ordinales, 1 factor | WLSMV (robusto) | 710,29 (27) | 0,220 [0,204, 0,236] | 0,612 | 0,482 | 0,130 |

**Comparación de 1 frente a 3 factores:**

- **ML:** Δχ² = 757,04 con gl = 3.
- **WLSMV:** prueba ajustada de Satorra (2000), Δχ² = 299,07 con gl = 3.

## Convenciones que conviene conocer

- **Análisis paralelo.** `psych::fa.parallel` con factores comunes, SMC = TRUE y 100 réplicas por remuestreo de
  cada columna con reposición (semilla 5041). Se cuentan los autovalores iniciales consecutivos por encima de la
  referencia.
- **Casos Heywood.** Se marca un ítem si h² > 0,99: psych acota u² en torno a 0,005, así que no aparecen
  unicidades negativas.
- **Policóricas.** `psych::polychoric(…, smooth = FALSE, correct = 0,5)`. Bartlett sobre policóricas se presenta
  solo como orientación.
- **AFC.** `lavaan::cfa(std.lv = TRUE)`. Con datos ordinales: `ordered` + WLSMV; χ², gl y p *scaled.shifted*;
  RMSEA, CFI y TLI *robust* (Savalei, 2021). El RMSEA ML usa la convención de lavaan, √(max(0, (χ² − gl)/(gl·n))).
- **TRI.** El parámetro D es explícito (1 o 1,702). Parametrización de mirt: a1 = D·a; intercepto = −D·a·b; g y u
  son las asíntotas. Los parámetros son conocidos: no hay calibración.
- **Rotación.** Igual que `psych::fa`: Varimax de `stats` con Kaiser; Oblimin y Geomin de GPArotation sin Kaiser;
  Promax de psych con Kaiser y m = 4. Después, reflexión (suma de cargas positiva) y orden por varianza
  explicada. En el laboratorio, 12 inicios con tolerancia estricta (ver `ROTACION.md`). Frente a psych, en los
  ejemplos reales las diferencias son ≤ 0,015 en cargas y solo aparecen en soluciones de dos factores con
  Varimax o Promax.
- **Versiones.** Las referencias factoriales se regeneraron con psych 2.4.1 y lavaan 0.6.17. Frente a las de
  psych 2.6.5 y lavaan 0.7.2, la diferencia máxima en cargas rotadas es 0,0013. Las comunalidades y los índices
  ML son idénticos.

## Reproducir

```sh
npm install && npx playwright install chromium
npm test                      # 16 pruebas Node y de navegador; las 2 de Shiny con SHINY=1
Rscript tests/rotation-reference.R
Rscript tests/factor-reference.R    # reescribe examples.js y fixtures/factor-r.json
Rscript tests/factor-edge.R
Rscript tests/tri-native.R
```
