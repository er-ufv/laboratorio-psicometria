(function () {
  "use strict";
  const U = FactorUI,
    { $, fmt, pv, text, table } = U,
    E = FactorExamples,
    NS = "http://www.w3.org/2000/svg",
    blue = "#001391",
    sky = "#2a49d4",
    warn = "#7a5600";
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many),
    pText = (x) => (x < 0.001 ? "< 0,001" : "= " + fmt(x)),
    words = { 1: "una", 2: "dos", 3: "tres" };
  function render() {
    const profile = $("cfa-data").value,
      ordinal = profile === "ordinal",
      d = E.cfa[profile + "_" + $("cfa-model").value],
      m = d.measures,
      robust = m.fitIndices === "robust",
      tag = ordinal ? (robust ? " robusto" : " escalado") : "";
    text(
      "cfa-estimator",
      ordinal
        ? "WLSMV · χ² escalado y desplazado; RMSEA/CFI/TLI robustos (Savalei, 2021); SRMR estándar. Parámetros DWLS con correcciones para errores típicos y χ². Varianzas latentes fijadas a 1."
        : "ML normal · χ², RMSEA, CFI, TLI y SRMR estándar; AIC y BIC. Varianzas latentes fijadas a 1.",
    );
    text(
      "cfa-status",
      (d.admissible
        ? "Ajuste convergente y parámetros admisibles. Evalúa su ajuste y significado."
        : "Solución impropia: requiere revisión antes de interpretar.") +
        (d.notes.length ? " " + d.notes.join(" ") : ""),
    );
    text("cfa-syntax", d.model);
    const boxes = [
      [ordinal ? "χ² escalado y desplazado" : "χ² (ML)", fmt(m.chisq, 3)],
      ["gl", fmt(m.df, 0)],
      ["p", pv(m.pvalue)],
      ["RMSEA" + tag, fmt(m.rmsea, 3)],
      ["IC 90% del RMSEA" + tag, fmt(m.rmseaLower, 3) + " – " + fmt(m.rmseaUpper, 3)],
      ["CFI" + tag, fmt(m.cfi, 3)],
      ["TLI" + tag, fmt(m.tli, 3)],
      ["SRMR", fmt(m.srmr, 3)],
      ...(ordinal
        ? []
        : [
            ["AIC", fmt(m.aic, 1)],
            ["BIC", fmt(m.bic, 1)],
          ]),
    ];
    const host = $("cfa-indices");
    host.replaceChildren();
    boxes.forEach(([label, value]) => {
      const box = document.createElement("div"),
        strong = document.createElement("strong"),
        small = document.createElement("span");
      box.className = "factor-index";
      strong.textContent = value;
      small.textContent = label;
      box.append(strong, small);
      host.append(box);
    });
    const loads = d.standardized.filter((r) => r.op === "=~"),
      factors = [...new Set(loads.map((r) => r.lhs))],
      items = loads.map((r) => r.rhs),
      p = items.length,
      k = factors.length,
      correlations = (k * (k - 1)) / 2;
    // gl = momentos no redundantes − parámetros libres.
    const parts = [plural(loads.length, "carga", "cargas")];
    if (ordinal) {
      if (correlations) parts.push(plural(correlations, "correlación entre factores", "correlaciones entre factores"));
      parts.push(m.npar - loads.length - correlations + " umbrales");
    } else {
      parts.push(p + " varianzas residuales");
      if (correlations) parts.push(plural(correlations, "correlación entre factores", "correlaciones entre factores"));
    }
    text(
      "cfa-df",
      (ordinal
        ? `gl = ${m.moments} estadísticos (${(p * (p - 1)) / 2} correlaciones policóricas + ${m.moments - (p * (p - 1)) / 2} umbrales) − ${m.npar} parámetros (${parts.join(" + ")}) = ${m.df}. En la parametrización delta las varianzas residuales no son parámetros libres.`
        : `gl = ${m.moments} momentos (${p}·${p + 1}/2 varianzas y covarianzas) − ${m.npar} parámetros (${parts.join(" + ")}) = ${m.df}.`) +
        " Las varianzas de los factores están fijadas a 1.",
    );
    table(
      "cfa-loadings",
      ["Factor", "Ítem", "Carga estandarizada"],
      loads.map((r) => [r.lhs, r.rhs, r["est.std"]]),
    );
    const phiOf = (f, g) =>
      f === g
        ? 1
        : (d.standardized.find(
            (r) => r.op === "~~" && ((r.lhs === f && r.rhs === g) || (r.rhs === f && r.lhs === g)),
          )?.["est.std"] ?? 0);
    table(
      "cfa-phi",
      ["Φ", ...factors],
      factors.map((f) => [f, ...factors.map((g) => phiOf(f, g))]),
    );
    const residual = (item) =>
      d.standardized.find((r) => r.op === "~~" && r.lhs === item && r.rhs === item)?.["est.std"] ?? NaN;
    // Identificación: varianza latente fijada (std.lv) frente a indicador marcador.
    const id = d.identification,
      marker = (r) => id.marker.find((x) => x.lhs === r.lhs && x.rhs === r.rhs)?.est;
    table(
      "cfa-identification",
      ["Factor", "Ítem", "λ · varianza latente = 1", "λ · indicador marcador", "λ estandarizada"],
      id.stdlv.map((r, i) => [r.lhs, r.rhs, r.est, marker(r), loads[i]["est.std"]]),
    );
    text(
      "cfa-identification-note",
      `Con un indicador marcador, la primera carga de cada factor vale 1 y se estima la varianza del factor. El ajuste es el mismo (χ² = ${fmt(m.chisq, 3)} con varianza latente fijada y ${fmt(id.markerChisq, 3)} con marcador) y también las cargas estandarizadas; solo cambia la escala de las no estandarizadas.`,
    );
    diagram(loads, factors, phiOf, residual);
    comparison(profile);
    formulas();
  }
  function diagram(loads, factors, phiOf, residual) {
    const svg = $("cfa-diagram"),
      W = 600,
      H = 440,
      fx = 205,
      rx = 410,
      rw = 70;
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    function el(tag, a, t, parent = svg) {
      const n = document.createElementNS(NS, tag);
      Object.entries(a).forEach(([k, v]) => n.setAttribute(k, v));
      if (t !== undefined) n.textContent = t;
      parent.append(n);
      return n;
    }
    const defs = el("defs", {}),
      marker = el(
        "marker",
        {
          id: "cfa-arrow",
          viewBox: "0 0 10 10",
          refX: "9",
          refY: "5",
          markerWidth: "6",
          markerHeight: "6",
          orient: "auto-start-reverse",
        },
        undefined,
        defs,
      );
    el("path", { d: "M0 0 L10 5 L0 10 Z", fill: blue }, undefined, marker);
    const fy = (f) => (factors.length === 1 ? H / 2 : 80 + factors.indexOf(f) * 140),
      iy = (i) => 26 + i * 47,
      halo = { "paint-order": "stroke", stroke: "#fff", "stroke-width": 4, "stroke-linejoin": "round" },
      edge = (y, angle) => [fx - 36 * Math.cos(angle), y + 36 * Math.sin(angle)];
    // Correlaciones entre factores: arcos con dos puntas a la izquierda.
    factors.forEach((f, i) =>
      factors.slice(i + 1).forEach((g, j) => {
        // Arcos contiguos salen en diagonal; el exterior, del lateral, para no superponer puntas.
        const y1 = fy(f),
          y2 = fy(g),
          bulge = 60 + 55 * j,
          x0 = fx - 36,
          angle = j === 0 ? Math.PI / 4 : 0,
          [ax, ay] = edge(y1, angle),
          [bx, by] = edge(y2, -angle);
        el("path", {
          d: `M ${ax} ${ay} Q ${x0 - bulge * 2} ${(y1 + y2) / 2} ${bx} ${by}`,
          fill: "none",
          stroke: sky,
          "stroke-width": 1.6,
          "marker-start": "url(#cfa-arrow)",
          "marker-end": "url(#cfa-arrow)",
        });
        const extreme = (ax + 2 * (x0 - bulge * 2) + bx) / 4;
        el("text", { x: extreme + 8, y: (y1 + y2) / 2 + 4, fill: sky, "font-size": 13, ...halo }, fmt(phiOf(f, g), 2));
      }),
    );
    // Varianza de cada factor fijada a 1: arco sobre el círculo.
    factors.forEach((f) => {
      const y = fy(f);
      el("path", {
        d: `M ${fx - 20} ${y - 30} C ${fx - 30} ${y - 70}, ${fx + 30} ${y - 70}, ${fx + 20} ${y - 30}`,
        fill: "none",
        stroke: blue,
        "stroke-width": 1.2,
        "marker-start": "url(#cfa-arrow)",
        "marker-end": "url(#cfa-arrow)",
      });
      el("text", { x: fx, y: y - 62, "text-anchor": "middle", "font-size": 12, fill: blue }, "1");
      el("circle", { cx: fx, cy: y, r: 35, fill: "#edf5ff", stroke: blue, "stroke-width": 1.5 });
      el("text", { x: fx, y: y + 5, "text-anchor": "middle", "font-weight": 700, fill: "#070e46" }, f);
    });
    loads.forEach((r, i) => {
      const y = iy(i),
        f = fy(r.lhs);
      el("line", {
        x1: fx + 36,
        y1: f,
        x2: rx - 3,
        y2: y,
        stroke: blue,
        "stroke-width": 1.3,
        "marker-end": "url(#cfa-arrow)",
      });
      el("rect", { x: rx, y: y - 16, width: rw, height: 32, rx: 4, fill: "#fff", stroke: blue });
      el("text", { x: rx + rw / 2, y: y + 5, "text-anchor": "middle", fill: "#070e46" }, r.rhs);
      const t = 0.78;
      el(
        "text",
        {
          x: fx + 36 + t * (rx - fx - 39),
          y: f + t * (y - f) - 5,
          "text-anchor": "middle",
          fill: blue,
          "font-size": 12,
          ...halo,
        },
        fmt(r["est.std"], 2),
      );
      // Varianza residual estandarizada (1 − λ²): arco de dos puntas a la derecha.
      el("path", {
        d: `M ${rx + rw} ${y - 9} C ${rx + rw + 34} ${y - 22}, ${rx + rw + 34} ${y + 22}, ${rx + rw} ${y + 9}`,
        fill: "none",
        stroke: warn,
        "stroke-width": 1.2,
        "marker-start": "url(#cfa-arrow)",
        "marker-end": "url(#cfa-arrow)",
      });
      el("text", { x: rx + rw + 32, y: y + 4, "font-size": 12, fill: warn }, fmt(residual(r.rhs), 2));
    });
    svg.setAttribute(
      "aria-label",
      `Diagrama: ${factors.length === 1 ? "un factor" : factors.length + " factores correlacionados"} y ${loads.length} indicadores con cargas estandarizadas, correlaciones entre factores y varianzas residuales.`,
    );
  }
  function comparison(profile) {
    const c = E.cfaComparisons[profile],
      uno = E.cfa[profile + "_uno"].measures,
      tres = E.cfa[profile + "_tres"].measures,
      base = `El modelo de un factor equivale a fijar en 1 las ${words[c.dfDiff] || c.dfDiff} correlaciones entre factores: está anidado en el de tres factores, con Δgl = ${uno.df} − ${tres.df} = ${c.dfDiff}.`;
    text(
      "cfa-comparison",
      profile === "continua"
        ? `${base} Razón de verosimilitudes (ML): Δχ² = ${fmt(uno.chisq, 2)} − ${fmt(tres.chisq, 2)} = ${fmt(c.chisqDiff, 2)}, gl = ${c.dfDiff}, p ${pText(c.pvalue)}. AIC: ${fmt(tres.aic, 1)} (tres) frente a ${fmt(uno.aic, 1)} (uno); BIC: ${fmt(tres.bic, 1)} frente a ${fmt(uno.bic, 1)}. Menor AIC/BIC es preferible entre modelos para los mismos datos.`
        : `${base} Con WLSMV no basta restar los χ² escalados (${fmt(uno.chisq, 2)} − ${fmt(tres.chisq, 2)} = ${fmt(uno.chisq - tres.chisq, 2)}): la diferencia ajustada de lavTestLRT (Satorra, 2000) da Δχ² = ${fmt(c.chisqDiff, 2)}, gl = ${c.dfDiff}, p ${pText(c.pvalue)}. AIC y BIC no existen sin verosimilitud.`,
    );
    text(
      "cfa-comparison-note",
      "Como 1 es el extremo del rango admisible de una correlación, el valor p de esta comparación es aproximado. Una diferencia significativa indica que las restricciones empeoran el ajuste; no prueba que el modelo general sea correcto.",
    );
  }
  function formulas() {
    const m = E.cfa.continua_tres.measures,
      n = m.ntotal;
    text(
      "cfa-formula-example",
      `Ejemplo continuo de tres factores (ML, N = ${n}): RMSEA = √[(${fmt(m.chisq, 2)} − ${m.df})/(${m.df}·${n})] = ${fmt(m.rmsea, 3)}; CFI = 1 − ${fmt(m.chisq - m.df, 2)}/(${fmt(m.baselineChisq, 2)} − ${m.baselineDf}) = ${fmt(m.cfi, 3)}; TLI = (${fmt(m.baselineChisq / m.baselineDf, 2)} − ${fmt(m.chisq / m.df, 3)})/(${fmt(m.baselineChisq / m.baselineDf, 2)} − 1) = ${fmt(m.tli, 3)}.`,
    );
    const o = E.cfa.ordinal_tres.measures;
    text(
      "cfa-robust-example",
      `En el ejemplo ordinal de tres factores, las versiones solo escaladas darían RMSEA = ${fmt(o.rmseaScaled, 3)}, CFI = ${fmt(o.cfiScaled, 3)} y TLI = ${fmt(o.tliScaled, 3)}; las robustas, ${fmt(o.rmsea, 3)}, ${fmt(o.cfi, 3)} y ${fmt(o.tli, 3)}. Las escaladas estiman otra cantidad poblacional y suelen resultar más optimistas.`,
    );
  }
  ["cfa-data", "cfa-model"].forEach((id) => $(id).addEventListener("change", render));
  // Calcular los grados de libertad antes de verlos.
  if (globalThis.Didactica)
    Didactica.gate({
      anchor: $("cfa-df"),
      hide: [$("cfa-df"), $("cfa-indices")],
      prompt: "¿cuántos grados de libertad tiene el modelo seleccionado? (Prueba también con el de un factor.)",
      value: () => Number(($("cfa-df").textContent.match(/= (\d+)\./) || [])[1]),
      tolerance: 0,
      explain: (pred, actual, ok) =>
        ok
          ? ""
          : "Cuenta los momentos, p(p + 1)/2, y resta cargas, varianzas residuales y correlaciones entre factores.",
    });
  // El cuestionario lo genera Didactica (assets/js/core/preguntas.js).
  render();
})();
