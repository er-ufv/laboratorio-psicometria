(function () {
  "use strict";
  const U = FactorUI,
    { $, fmt, pv, text, table, matrix, chart } = U,
    M = FactorMath,
    D = FactorExamples,
    // Series de gráfico de la paleta común (azul, ocre, azul cielo) y gris neutro.
    colors = ["#2a49d4", "#b98409", "#1c8fcc"],
    neutral = "#999999";
  let entry, solution;
  const ROTATIONS = { none: "Sin rotar", varimax: "Varimax", oblimin: "Oblimin", promax: "Promax" };

  function render() {
    const profile = $("afe-profile").value,
      cor = $("afe-cor");
    cor.options[1].disabled = profile !== "ordinal";
    if (profile !== "ordinal") cor.value = "pearson";
    entry = D.entries[profile + "_" + cor.value];
    $("afe-download").href = "data/" + profile + ".csv";
    text(
      "afe-context",
      cor.value === "poly"
        ? "Policóricas: normalidad bivariada latente; corrección de continuidad de 0,5 en celdas vacías. Bartlett es orientativo."
        : "Correlaciones Pearson. Los ejemplos son simulados, no datos de estudiantes.",
    );
    const d = entry.diagnostics;
    text("afe-kmo", fmt(d.kmo));
    text("afe-bartlett", fmt(d.bartlett.chisq, 2));
    text("afe-bartlett-p", pv(d.bartlett["p.value"]));
    table(
      "afe-msa",
      ["Ítem", "MSA"],
      d.msa.map((x, i) => ["I" + (i + 1), x]),
    );
    matrix("afe-correlation", entry.matrix);
    parallel();
    fit();
  }

  function parallel() {
    const p = entry.parallel,
      mean = $("parallel-rule").value === "mean",
      eig = entry.diagnostics.eigen || [],
      kaiser = eig.filter((x) => x > 1).length;
    text("parallel-reference", p.reference || "");
    text(
      "parallel-summary",
      "El criterio seleccionado sugiere " +
        (mean ? p.suggestedMean : p.suggested95) +
        " factores consecutivos por encima de la referencia. La regla de Kaiser (autovalores de R > 1) daría " +
        kaiser +
        ". Contrasta la sugerencia con contenido, residuos y estabilidad.",
    );
    chart(
      "parallel-chart",
      "line",
      p.observed.map((_, i) => i + 1),
      [
        { label: "Autovalores factoriales observados", data: p.observed, borderColor: colors[0], borderWidth: 2 },
        {
          label: (mean ? "Media" : "Percentil 95") + " de " + (p.iterations || 100) + " remuestreos",
          data: mean ? p.referenceMean : p.reference95,
          borderColor: colors[1],
          borderDash: [5, 4],
          borderWidth: 2,
        },
        {
          label: "Autovalores de R (componentes; Kaiser > 1)",
          data: eig,
          borderColor: neutral,
          borderDash: [2, 3],
          borderWidth: 1.5,
          pointRadius: 2,
        },
      ],
      {
        x: { title: { display: true, text: "Orden del autovalor" } },
        y: { title: { display: true, text: "Autovalor" } },
      },
    );
  }

  const heywoodText = (s) =>
    s.heywood && s.heywood.length
      ? " Caso Heywood en " +
        s.heywood.map((i) => "I" + i + " (h² = " + fmt(s.h2[i - 1]) + ")").join(", ") +
        ": una comunalidad casi igual a 1 deja la unicidad prácticamente en cero."
      : "";

  function fit() {
    const k = +$("afe-count").value,
      method = $("afe-method").value,
      rot = $("afe-rotation").value;
    solution = entry.solutions[k + "_" + method + "_" + rot];
    text(
      "method-help",
      {
        uls: "ULS minimiza discrepancias entre correlaciones; en psych comparte implementación con minres.",
        pa: "PA itera las comunalidades y extrae ejes principales de la matriz reducida.",
        ml: "ML normal utiliza un modelo probabilístico; revisa normalidad y supuestos.",
      }[method] +
        (entry.name === "ordinal" && method === "ml"
          ? " Aplicar ML normal a estos indicadores o policóricas no proporciona automáticamente inferencia ordinal válida."
          : ""),
    );
    const status = $("afe-fit-status");
    status.classList.toggle("error", !!(solution.error || !solution.admissible || !solution.converged));
    text(
      "afe-fit-status",
      solution.error
        ? "No se obtuvo una solución interpretable: revisa método, matriz y número de factores."
        : !solution.admissible || !solution.converged
          ? "Solución impropia o sin convergencia: no debe interpretarse como un resultado válido." +
            heywoodText(solution) +
            (solution.heywood && solution.heywood.length
              ? " Suele indicar que se extraen más factores de los que sostienen los datos."
              : "")
          : "Solución convergente y admisible. " +
            (k === 1 ? "Con un factor no hay rotación entre ejes." : "") +
            (solution.warnings?.length ? " El ajuste emitió advertencias; consulta la reproducción en R." : ""),
    );
    if (solution.error) {
      ["loading-table", "phi-table", "residual-summary", "rotation-compare"].forEach((id) => text(id, ""));
      return;
    }
    const A = $("loading-view").value === "pattern" ? solution.pattern : solution.structure;
    table(
      "loading-table",
      ["Ítem", ...Array.from({ length: k }, (_, i) => "F" + (i + 1)), "h²", "u²"],
      A.map((r, i) => ["I" + (i + 1), ...r, solution.h2[i], solution.u2[i]]),
    );
    $("loading-table")
      .querySelectorAll("tbody tr")
      .forEach((tr, i) =>
        Array.from(tr.cells)
          .slice(1, k + 1)
          .forEach((c, j) => c.classList.toggle("loading-strong", Math.abs(A[i][j]) >= 0.4)),
      );
    chart(
      "loading-chart",
      "bar",
      A.map((_, i) => "I" + (i + 1)),
      Array.from({ length: k }, (_, j) => ({
        label: "F" + (j + 1),
        data: A.map((r) => r[j]),
        backgroundColor: colors[j],
      })),
      { y: { title: { display: true, text: "Carga · " + $("loading-view").selectedOptions[0].text } } },
    );
    matrix("phi-table", solution.phi, "F");
    text(
      "residual-summary",
      "RMSR fuera de la diagonal = " +
        fmt(solution.rmsr, 4) +
        ". Examina también los residuos concretos; el promedio puede ocultar desajustes.",
    );
    const ob = ["oblimin", "promax"].includes(rot) && k > 1;
    [
      ["rotation-orth", "varimax"],
      ["rotation-oblique", "oblimin"],
      ["rotation-promax", "promax"],
      ["rotation-none", "none"],
    ].forEach(([id, r]) => $(id).setAttribute("aria-pressed", rot === r));
    text(
      "rotation-help",
      k === 1
        ? "Solo hay un factor: no hay ejes que rotar. Elige 2 o 3 factores en Extracción."
        : rot === "none"
          ? "Sin rotar: F1 recoge la máxima varianza común y los demás factores son contrastes. Es una orientación de cálculo, no una interpretación."
          : ob
            ? "Rotación oblicua: los factores pueden correlacionar. Patrón y estructura difieren; h² = diagonal(ΛΦΛ′)."
            : "Rotación ortogonal: Φ es la identidad. Patrón y estructura coinciden. Elegirla impone factores no correlacionados.",
    );
    plane();
    compare();
  }

  function plane() {
    const k = +$("afe-count").value,
      method = $("afe-method").value,
      sel = $("plane-pair");
    [...sel.options].forEach((o) => (o.disabled = o.value.split(",").some((j) => +j >= Math.max(k, 2))));
    if (sel.selectedOptions[0]?.disabled) sel.value = "0,1";
    const [a, b] = sel.value.split(",").map(Number),
      base = entry.solutions[k + "_" + method + "_none"],
      point = (r, i) => ({ x: r[a], y: k > 1 ? r[b] : 0, item: "I" + (i + 1), xl: "F" + (a + 1), yl: "F" + (b + 1) }),
      sets = [
        {
          label: "Ítems · " + ROTATIONS[$("afe-rotation").value].toLowerCase(),
          data: solution.pattern.map(point),
          backgroundColor: solution.pattern.map((_, i) => colors[Math.floor(i / 3)] || colors[0]),
          borderColor: "#ffffff",
          borderWidth: 1.5,
          pointRadius: 7,
        },
      ];
    if ($("plane-unrotated").checked && $("afe-rotation").value !== "none" && base && !base.error)
      sets.push({
        label: "Mismos ítems sin rotar",
        data: base.pattern.map(point),
        backgroundColor: "rgba(153,153,153,0.55)",
        pointRadius: 5,
        pointStyle: "rectRot",
      });
    chart("factor-plane", "scatter", [], sets, {
      x: { title: { display: true, text: "F" + (a + 1) }, min: -1, max: 1 },
      y: { title: { display: true, text: k > 1 ? "F" + (b + 1) : "Segundo eje = 0 (un factor)" }, min: -1, max: 1 },
    });
  }

  // Tabla con las cuatro soluciones reales de R para la misma extracción.
  function compare() {
    const k = +$("afe-count").value,
      method = $("afe-method").value,
      sols = Object.keys(ROTATIONS).map((r) => [r, entry.solutions[k + "_" + method + "_" + r]]);
    if (k === 1 || sols.some(([, s]) => !s || s.error)) {
      text("rotation-compare", "");
      text("rotation-compare-note", k === 1 ? "Con un factor todas las rotaciones son la misma solución." : "");
      return;
    }
    const sum = (v) => v.reduce((s, x) => s + x, 0),
      contrib = (s) =>
        s.pattern[0]
          .map((_, j) => sum(s.pattern.map((r, i) => r[j] * s.structure[i][j])))
          .map((x) => fmt(x, 2))
          .join(" · "),
      maxPhi = (s) => Math.max(0, ...s.phi.flatMap((r, i) => r.filter((_, j) => j > i).map(Math.abs))),
      secondary = (s) => Math.max(...s.pattern.map((r) => r.map(Math.abs).sort((x, y) => y - x)[1])),
      maxDiffH2 = Math.max(...sols.flatMap(([, s]) => s.h2.map((h, i) => Math.abs(h - sols[0][1].h2[i])))),
      rows = [
        ["Σh² (varianza común total)", ...sols.map(([, s]) => fmt(sum(s.h2)))],
        ["h² de I1", ...sols.map(([, s]) => fmt(s.h2[0]))],
        ["RMSR de los residuos", ...sols.map(([, s]) => fmt(s.rmsr, 4))],
        ["Varianza común de cada factor", ...sols.map(([, s]) => contrib(s))],
        [
          "Mayor |φ| entre factores",
          ...sols.map(([r, s]) => (["none", "varimax"].includes(r) ? "0 (impuesto)" : fmt(maxPhi(s), 2))),
        ],
        ["Mayor carga secundaria |λ|", ...sols.map(([, s]) => fmt(secondary(s), 2))],
      ];
    table("rotation-compare", ["", ...Object.values(ROTATIONS)], rows);
    text(
      "rotation-compare-note",
      "Las tres primeras filas son iguales en las cuatro columnas (diferencia máxima en h²: " +
        maxDiffH2.toExponential(1) +
        "): rotar no cambia el ajuste. Las tres últimas cambian: la rotación solo redistribuye la misma varianza común." +
        (sols.some(([, s]) => s.heywood && s.heywood.length) ? heywoodText(sols[0][1]) : ""),
    );
  }

  function diagnostics() {
    if (["r-12", "r-13", "r-23", "diag-n"].some((id) => $(id).value.trim() === "")) {
      text("diag-status", "Completa las tres correlaciones y el tamaño muestral.");
      text("diag-values", "");
      return;
    }
    const a = +$("r-12").value,
      b = +$("r-13").value,
      c = +$("r-23").value,
      n = +$("diag-n").value,
      r = M.diagnostics(
        [
          [1, a, b],
          [a, 1, c],
          [b, c, 1],
        ],
        n,
      );
    text(
      "diag-status",
      r.error || "Matriz definida positiva. Estos diagnósticos no identifican por sí solos una estructura factorial.",
    );
    text(
      "diag-values",
      r.error ? "" : "KMO = " + fmt(r.kmo) + " · χ² = " + fmt(r.chisq, 2) + " · gl = " + r.df + " · p " + pv(r.pvalue),
    );
  }

  ["afe-profile", "afe-cor"].forEach((id) => $(id).addEventListener("change", render));
  $("parallel-rule").addEventListener("change", parallel);
  ["afe-method", "afe-count", "afe-rotation", "loading-view"].forEach((id) => $(id).addEventListener("change", fit));
  ["plane-pair", "plane-unrotated"].forEach((id) => $(id).addEventListener("change", plane));
  [
    ["rotation-orth", "varimax"],
    ["rotation-oblique", "oblimin"],
    ["rotation-promax", "promax"],
    ["rotation-none", "none"],
  ].forEach(([id, r]) =>
    $(id).addEventListener("click", () => {
      $("afe-rotation").value = r;
      fit();
    }),
  );
  ["r-12", "r-13", "r-23", "diag-n"].forEach((id) => $(id).addEventListener("input", diagnostics));
  // Predecir el número de factores antes de ver el análisis paralelo.
  if (globalThis.Didactica) {
    const chartBox = $("parallel-chart").closest(".tct-chart");
    Didactica.gate({
      anchor: $("parallel-summary"),
      hide: [$("parallel-summary"), chartBox],
      prompt:
        "mira la matriz de correlaciones del apartado 02: ¿cuántos factores crees que sugerirá el análisis paralelo con este ejemplo?",
      value: () => Number(($("parallel-summary").textContent.match(/sugiere (\d+)/) || [])[1]),
      tolerance: 0,
      format: (x) => x + (x === 1 ? " factor" : " factores"),
      explain: () => "Compara también con la regla de Kaiser y piensa por qué pueden discrepar.",
    });
  }
  // El cuestionario lo genera Didactica (assets/js/core/preguntas.js).
  render();
  diagnostics();
})();
