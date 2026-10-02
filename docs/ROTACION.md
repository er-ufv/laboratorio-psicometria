# La rotación factorial, explicada para el aula

Esta guía acompaña al laboratorio `rotacion.html`. Resume qué hace una rotación, qué optimiza cada método,
cómo lo calculan R y psych y qué conviene contar a los estudiantes.

## 1. Por qué hay que rotar

El modelo factorial común para variables estandarizadas es

```
R = Λ Φ Λ′ + Ψ
```

Con más de un factor, la solución no es única. Si T es cualquier matriz k × k invertible cuyas columnas tienen
longitud 1, la solución

```
Λ* = Λ (T′)⁻¹      Φ* = T′ Φ T     (con Φ = I de partida: Φ* = T′T)
```

reproduce exactamente la misma matriz común Λ*Φ*Λ*′ = ΛΛ′. Por tanto, también reproduce las mismas
comunalidades, los mismos residuos y el mismo ajuste (χ², RMSR, RMSEA). Esta **indeterminación rotacional** hace
que la extracción entregue una orientación de cálculo. Por ejemplo, en ejes principales F1 recoge la máxima
varianza común y F2 queda bipolar. Esa orientación no tiene por qué ser la más interpretable.

**Rotar es elegir, entre soluciones equivalentes, la que más se acerca a una estructura simple** (el criterio de Thurstone; véase Browne,
2001): cada ítem con una carga alta en pocos factores y cada factor definido por un subconjunto de ítems.

> Idea para clase: la constelación no cambia; cambia la posición desde la que se fotografía.
> El apartado 01 del laboratorio lo muestra. La solución sin rotar parece unidimensional; tras rotar
> aparecen dos dominios.

## 2. Geometría: los ítems son vectores y los ejes, una elección

Cada fila de la matriz sin rotar A es un vector en el espacio factorial común. Su longitud al cuadrado es la
comunalidad, h² = Σ a²; por eso ningún ítem sale del círculo unidad. Las columnas de T son los ejes rotados,
expresados como vectores unitarios en ese espacio.

| | Ortogonal | Oblicua |
|---|---|---|
| Ejes | Perpendiculares (T′T = I) | Con un ángulo α entre sí |
| Φ | I (impuesto) | T′T, con φ = cos α |
| Patrón P | A·T | A·(T′)⁻¹ |
| Estructura S | = P | P·Φ = A·T |
| h² | Σ p² | diag(P Φ P′) = Σ p·s |

- **Patrón:** son las coordenadas *paralelas* a los ejes, es decir, las cantidades de cada eje que hay que sumar para
  llegar al ítem. Se interpreta como la contribución única del factor, como un coeficiente de regresión.
- **Estructura:** son las proyecciones *perpendiculares* sobre cada eje, es decir, la correlación ítem-factor.
- **En ortogonales coinciden.** En oblicuas, con dos factores, s₁ = p₁ + φ·p₂.

El apartado 03 del laboratorio dibuja ambas proyecciones para el ítem que elijas e incluye un ejercicio de
cálculo con ayudas escalonadas.

**Lo que cambia y lo que no:**

| No cambia al rotar | Cambia al rotar |
|---|---|
| h² y u² de cada ítem | Cargas de patrón y de estructura |
| Matriz reproducida ΛΦΛ′ + Ψ y residuos | Varianza común de cada factor (Σ p·s por columna) |
| χ², RMSR, RMSEA y demás índices de ajuste | Φ (en las oblicuas) |
| Σh² (la varianza común total) | La interpretación y el nombre de los factores |

El apartado 05 del Módulo 5 lo comprueba con las cuatro soluciones reales de psych (sin rotar, Varimax,
Oblimin y Promax).

## 3. Qué optimiza cada método

| Método | Tipo | Criterio | Rasgo didáctico |
|---|---|---|---|
| **Varimax** (Kaiser, 1958) | Ortogonal | Maximiza Σⱼ var(λ̃²ᵢⱼ): columnas simples | Cargas altas o casi nulas dentro de cada factor |
| **Quartimax** | Ortogonal | Maximiza Σ λ⁴: filas simples | Tiende a un factor general |
| **Oblimin directo** (Jennrich y Sampson, 1966) | Oblicua | Minimiza Σᵢ Σⱼ<ₖ λ²ᵢⱼλ²ᵢₖ − (γ/p)·Σⱼ<ₖ(Σᵢλ²ᵢⱼ)(Σᵢλ²ᵢₖ) | γ = 0 es *quartimin*, la opción por defecto de psych; γ < 0 acerca a la ortogonalidad |
| **Promax** (Hendrickson y White, 1964) | Oblicua | Varimax → objetivo λ·\|λ\|^(κ−1) → ajuste por mínimos cuadrados → normalización | κ = 4 por defecto en R y SPSS; es rápido |
| **Geomin** (Yates; véase Browne, 2001) | Oblicua | Minimiza Σᵢ (Πⱼ(λ²ᵢⱼ + δ))^(1/k) | Tolera ítems complejos; es la opción por defecto en Mplus |

**Normalización de Kaiser.** Antes de rotar se divide cada fila por su h; después se deshace. Así los ítems con
mucha comunalidad no dominan el criterio. `stats::varimax` y `psych::fa(rotate = "varimax")` la aplican por
defecto. `GPArotation::oblimin` no la aplica salvo que se pida (`normalize = TRUE`), y psych tampoco.

**Varimax con dos factores es una curva.** Al girar ejes ortogonales un ángulo θ, el criterio V(θ) es periódico
de 90°: girar 90° intercambia o refleja los factores. El apartado 02 dibuja esa curva y compara el ángulo que
eligen los estudiantes con el óptimo.

## 4. Cómo lo calculan R y psych (y cómo lo reproduce la web)

- `psych::fa(rotate = "varimax")` llama a `stats::varimax` (Kaiser, `eps = 1e-5`).
- `rotate = "oblimin"`, `"quartimax"` y `"geominQ"` usan **GPArotation**, con el algoritmo de proyección del
  gradiente de Bernaards y Jennrich (2005), partiendo de la solución sin rotar (T = I).
- `rotate = "promax"` es `psych::kaiser(…, rotate = "Promax")`: aplica Kaiser y después el Promax de psych,
  con m = 4.
- **Después de rotar, psych hace dos ajustes.** Primero refleja cada factor para que la suma de sus cargas sea
  positiva. Después los ordena de mayor a menor varianza explicada, que en oblicuas es diag(Φ·Λ′Λ). **El orden y
  el signo no tienen significado sustantivo.**

`assets/js/modules/factor/rotation.js` es una traducción directa de esos algoritmos (stats::varimax, GPForth,
GPFoblq, vgQ.*, psych::Promax, kaiser y la ordenación de fa). La prueba `tests/rotation.test.cjs` reproduce:

- las **72 rotaciones de psych::fa** de los ejemplos (Varimax, Oblimin y Promax; 2–3 factores; ULS, PA y ML;
  cuatro matrices), con error ≤ 2·10⁻¹⁵;
- **56 rotaciones** de GPArotation y psych sobre siete matrices: Quartimax, Oblimin con γ = −0,5, 0 y 0,5,
  Geomin y Promax con κ = 2 y 4. El error es ≤ 1,3·10⁻⁷, compatible con la tolerancia de 10⁻⁵ del algoritmo.

### Óptimos locales y varios inicios: un hallazgo de la auditoría

R parte siempre de la solución sin rotar y aplica una sola rotación. Al revisar el laboratorio se observó lo
siguiente:

1. **Con poblaciones muy simétricas, `stats::varimax` se queda en el punto de partida.** Ocurre, por ejemplo,
   con dos grupos de ítems del mismo tamaño. La iteración salta a otra orientación y en el segundo paso vuelve
   exactamente a la de partida; como su criterio interno no mejora más de 10⁻⁵, se detiene. Devuelve así la
   solución sin rotar, cerca del mínimo del criterio: V = 0,025, con el mínimo en 0 (a 6,8°) y el máximo en
   0,455. Promax, que empieza por ese Varimax, hereda el problema (φ = 0,03 en lugar de 0,30).
2. **Con datos reales, la parada es solo algo prematura.** En las soluciones de dos factores de los ejemplos, el
   criterio queda en 0,3305 frente a 0,3307 del óptimo. Las cargas cambian como mucho 0,015: no hay otra solución.

Por eso el laboratorio usa por defecto **12 inicios** (la identidad, giros de 15° y matrices ortogonales
aleatorias reproducibles), con tolerancia estricta, y conserva el mejor valor del criterio. Es lo mismo que
hacen `GPArotation::…(randomStarts = 12)` o `psych::fa(n.rotations = …)`. La calculadora avisa cuando un único
inicio se habría quedado lejos del óptimo. En la docencia conviene decirlo así: *los algoritmos de rotación son
iterativos y pueden detenerse antes de tiempo o en óptimos locales; con soluciones dudosas, prueba varios
inicios*.

## 5. ¿Ortogonal u oblicua?

1. **Empieza con una oblicua** (Oblimin o Promax) si la teoría admite constructos relacionados, como casi siempre
   en Psicología. Informa Φ.
2. **Si Φ es casi nula**, las dos soluciones coinciden en la práctica. Puedes informar la ortogonal y justificarlo.
   Que la oblicua dé φ ≈ 0 no es un fallo: la permite, no la obliga.
3. **Si los factores correlacionan**, Varimax obliga a que sean independientes y fabrica **cargas cruzadas**. En
   el laboratorio, con Φ = 0,60, Varimax deja cargas secundarias de 0,17–0,24 que Oblimin elimina. **No elimines
   ítems por cargas cruzadas que solo existen porque se impuso la ortogonalidad.**
4. **No elijas la rotación por el ajuste:** es idéntico. Tampoco por la que da «mejores» cargas sin un argumento
   teórico.
5. **Si sale un factor con todas las cargas negativas**, refléjalo: cambia de signo su columna en P y S, y su fila y
   su columna en Φ. Nombra los factores por el contenido de sus ítems.

**Qué informar en una solución oblicua:** método de extracción y de rotación (con γ o κ y si se aplicó Kaiser),
patrón, estructura, Φ, comunalidades y varianza común de cada factor. En oblicuas, cada valor (Σ p·s) incluye varianza compartida con otros
factores: suman Σh², pero no son aportaciones exclusivas. Las sumas de cuadrados de la estructura que da SPSS no se
pueden sumar.

## 6. Errores frecuentes (para buscar en clase)

- Calcular h² sumando los cuadrados del patrón en una solución oblicua.
- Leer la estructura como contribución única, o el patrón como correlación.
- Pensar que la solución sin rotar demuestra unidimensionalidad.
- Creer que una rotación «mejora el ajuste».
- Dar significado al orden (F1, F2) o al signo de un factor.
- Eliminar ítems por cargas cruzadas producidas por una rotación ortogonal forzada.

## 7. El laboratorio, apartado a apartado

| Apartado | Actividad | Proceso que se busca |
|---|---|---|
| 01 · Predice | Tres predicciones con grado de seguridad, antes de ver nada | Activar ideas previas |
| 02 · Gira ejes ortogonales | Girar hasta la estructura simple y compararse con Varimax (curva V(θ)) | Generar antes de ver la solución |
| 03 · Ejes oblicuos | Mover cada eje; ver patrón y estructura; ejemplo resuelto y cálculo con ayudas escalonadas | Integración y ejemplo resuelto que se retira |
| 04 · Qué optimiza cada método | Predecir qué método da la mayor φ y comparar cinco criterios con γ y κ ajustables | Comparar y organizar |
| 05 · Espacio 3D | Tres factores del Módulo 5, con animación desde la solución sin rotar | Visualización guiada |
| 06 · Tus cargas | Calculadora: pegar cargas, rotar, descargar CSV y obtener código R equivalente | Transferir a datos propios |
| 07 · Comprueba y cierra | 7 preguntas con seguridad y calibración (2 de transferencia), autoexplicación e ideas clave | Recuperación y metacognición |

También hay una versión Shiny en R: `shiny::runApp("r/rotacion")`. Usa los mismos ejemplos de población, rota a
mano con deslizadores y calcula Varimax y Oblimin con stats y GPArotation.

**Límites:** los ejemplos de dos factores son poblaciones sin error muestral, más limpias que los datos reales.
La herramienta no guarda datos de los estudiantes. Es una herramienta diseñada para movilizar estos procesos,
pero su efecto sobre el aprendizaje no se ha evaluado.

## Referencias

- Bernaards, C. A. y Jennrich, R. I. (2005). Gradient projection algorithms and software for arbitrary rotation
  criteria in factor analysis. *Educational and Psychological Measurement, 65*(5), 676–696.
- Browne, M. W. (2001). An overview of analytic rotation in exploratory factor analysis. *Multivariate
  Behavioral Research, 36*(1), 111–150.
- Hendrickson, A. E. y White, P. O. (1964). Promax: A quick method for rotation to oblique simple structure.
  *British Journal of Statistical Psychology, 17*(1), 65–70.
- Jennrich, R. I. y Sampson, P. F. (1966). Rotation for simple loadings. *Psychometrika, 31*(3), 313–323.
- Kaiser, H. F. (1958). The varimax criterion for analytic rotation in factor analysis. *Psychometrika, 23*(3),
  187–200.
- Lloret-Segura, S., Ferreres-Traver, A., Hernández-Baeza, A. y Tomás-Marco, I. (2014). El análisis factorial
  exploratorio de los ítems: una guía práctica, revisada y actualizada. *Anales de Psicología, 30*(3), 1151–1169.
- Lorenzo-Seva, U. y ten Berge, J. M. F. (2006). Tucker's congruence coefficient as a meaningful index of factor
  similarity. *Methodology, 2*(2), 57–64.
