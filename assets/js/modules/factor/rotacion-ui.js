/* Laboratorio de rotación factorial: interfaz. La matemática está en rotation.js. */
(function () {
  "use strict";
  const R = globalThis.RotationMath,
    EX = globalThis.FactorExamples,
    $ = (id) => document.getElementById(id),
    SVGNS = "http://www.w3.org/2000/svg",
    reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = {
    navy: "#070e46",
    blue: "#001391",
    series: ["#2a49d4", "#b98409", "#1c8fcc"],
    gray: "#999999",
    warnInk: "#7a5600",
    ok: "#0c3d00",
    error: "#a80808",
  };
  const fmt = (x, n = 3) =>
    Number.isFinite(x)
      ? (Math.abs(x) < 0.5 * 10 ** -n ? 0 : x).toLocaleString("es-ES", {
          minimumFractionDigits: n,
          maximumFractionDigits: n,
        })
      : "—";
  const deg = (x) => Math.round(x) + "°";
  // Inicios múltiples: R parte solo de la solución sin rotar y, en poblaciones muy simétricas, stats::varimax
  // puede detenerse sin girar (su iteración vuelve al punto de partida). Con 12 inicios se conserva el mejor criterio.
  const ROBUST = 12;
  const text = (id, s) => ($(id).textContent = s);
  const wrapAngle = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
  const lineDist = (a, b) => {
    // Distancia angular entre direcciones (no entre líneas): 0–180.
    const d = Math.abs(wrapAngle(a - b));
    return d;
  };

  // ---------- Datos ----------
  function simple(a, b) {
    return [...a.map((x) => [x, 0]), ...b.map((x) => [0, x])];
  }
  const PRESETS = {
    relacionados: {
      label: "Dos dominios relacionados (Φ = 0,30)",
      pattern: simple([0.75, 0.7, 0.65, 0.6], [0.7, 0.65, 0.6, 0.55]),
      phi: [
        [1, 0.3],
        [0.3, 1],
      ],
      names: ["O1", "O2", "O3", "O4", "M1", "M2", "M3", "M4"],
      groups: [0, 0, 0, 0, 1, 1, 1, 1],
    },
    independientes: {
      label: "Dos dominios independientes (Φ = 0)",
      pattern: simple([0.75, 0.7, 0.65, 0.6], [0.7, 0.65, 0.6, 0.55]),
      phi: [
        [1, 0],
        [0, 1],
      ],
      names: ["O1", "O2", "O3", "O4", "M1", "M2", "M3", "M4"],
      groups: [0, 0, 0, 0, 1, 1, 1, 1],
    },
    general: {
      label: "Factores muy relacionados (Φ = 0,60)",
      pattern: simple([0.75, 0.7, 0.65, 0.6], [0.7, 0.65, 0.6, 0.55]),
      phi: [
        [1, 0.6],
        [0.6, 1],
      ],
      names: ["O1", "O2", "O3", "O4", "M1", "M2", "M3", "M4"],
      groups: [0, 0, 0, 0, 1, 1, 1, 1],
    },
    complejo: {
      label: "Con dos ítems complejos (Φ = 0,30)",
      pattern: [...simple([0.75, 0.7, 0.65], [0.7, 0.65, 0.6]), [0.45, 0.4], [0.4, 0.45]],
      phi: [
        [1, 0.3],
        [0.3, 1],
      ],
      names: ["O1", "O2", "O3", "M1", "M2", "M3", "C1", "C2"],
      groups: [0, 0, 0, 1, 1, 1, 2, 2],
    },
  };
  Object.values(PRESETS).forEach((p) => (p.A = R.principalAxes(p.pattern, p.phi)));
  let custom = null; // matriz de 2 factores cargada desde la calculadora

  const dataset = (key) => (key === "custom" && custom ? custom : PRESETS[key] || PRESETS.relacionados);
  function fillPresetSelect(sel, value = "relacionados") {
    const current = sel.value || value;
    sel.replaceChildren();
    Object.entries(PRESETS).forEach(([k, p]) => sel.append(new Option(p.label, k)));
    if (custom) sel.append(new Option("Tus cargas (calculadora)", "custom"));
    sel.value = [...sel.options].some((o) => o.value === current) ? current : value;
  }

  // ---------- Tablas ----------
  function heatTable(host, headers, rows, opts = {}) {
    const t = document.createElement("table"),
      cap = document.createElement("caption");
    cap.className = "sr-only";
    cap.textContent = opts.caption || headers.join(" · ");
    t.append(cap);
    const hr = t.createTHead().insertRow();
    headers.forEach((h) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = h;
      hr.append(th);
    });
    const body = t.createTBody();
    rows.forEach((row) => {
      const tr = body.insertRow();
      row.forEach((cell, j) => {
        const c = j === 0 ? document.createElement("th") : tr.insertCell();
        if (j === 0) {
          c.scope = "row";
          tr.append(c);
        }
        if (cell && typeof cell === "object") {
          c.textContent = fmt(cell.v, cell.n ?? 3);
          if (cell.heat) {
            const a = Math.min(1, Math.abs(cell.v));
            c.style.background = `rgba(42, 73, 212, ${(a * 0.45).toFixed(3)})`;
            if (a >= 0.4) c.classList.add("rot-strong");
          }
          if (cell.cross) c.classList.add("rot-cross");
          if (cell.title) c.title = cell.title;
        } else c.textContent = typeof cell === "number" ? fmt(cell) : cell;
      });
    });
    (typeof host === "string" ? $(host) : host).replaceChildren(t);
  }
  // Marca la carga secundaria cuando el ítem tiene una principal ≥ 0,40 y otra ≥ 0,20.
  const crossFlags = (row) => {
    const abs = row.map(Math.abs),
      top = Math.max(...abs);
    return abs.map((a) => top >= 0.4 && a !== top && a >= 0.2);
  };
  const loadingRows = (names, M, extra = []) =>
    M.map((r, i) => {
      const cf = crossFlags(r);
      return [
        names[i],
        ...r.map((v, j) => ({ v, heat: true, cross: cf[j], title: cf[j] ? "Carga secundaria ≥ 0,20" : "" })),
        ...extra.map((e) => ({ v: e[i] })),
      ];
    });
  const countSimple = (M) =>
    M.filter((r) => {
      const a = r.map(Math.abs).sort((x, y) => y - x);
      return a[0] >= 0.4 && a[1] < 0.2;
    }).length;

  // ---------- Pestañas ----------
  const tabs = [...document.querySelectorAll(".rot-tabs [role=tab]")];
  function activate(tab, focus) {
    tabs.forEach((t, i) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      $(t.dataset.panel).hidden = !on;
      if (on) text("rot-progress-text", `Apartado ${i + 1} de ${tabs.length}`);
    });
    if (focus) tab.focus();
    window.dispatchEvent(new Event("rot-panel"));
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => activate(t));
    t.addEventListener("keydown", (e) => {
      const n = {
        ArrowRight: (i + 1) % tabs.length,
        ArrowLeft: (i + tabs.length - 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[e.key];
      if (n !== undefined) {
        e.preventDefault();
        activate(tabs[n], true);
      }
    });
  });
  const goTo = (panel) => activate(tabs.find((t) => t.dataset.panel === panel));

  // ---------- Plano SVG ----------
  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(SVGNS, name);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (parent) parent.append(n);
    return n;
  };
  const unit = (a) => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)];
  // Coordenadas: y hacia arriba (se invierte al dibujar).
  const P = ([x, y]) => [x, -y];
  function svgText(parent, xy, s, attrs = {}) {
    const [x, y] = P(xy),
      t = el("text", Object.assign({ x, y, "font-size": 0.075, fill: COLORS.navy }, attrs), parent);
    t.textContent = s;
    return t;
  }
  function svgLine(parent, a, b, attrs) {
    const [x1, y1] = P(a),
      [x2, y2] = P(b);
    return el("line", Object.assign({ x1, y1, x2, y2 }, attrs), parent);
  }
  function drawPlane(svg, cfg) {
    // cfg: {A, names, groups, angles:[a1,a2], sol, selected, mode, onAxis(index, angle), onSelect(i), showProj}
    svg.replaceChildren();
    const defs = el("defs", {}, svg);
    const marker = el(
      "marker",
      {
        id: svg.id + "-arrow",
        viewBox: "0 0 10 10",
        refX: 8,
        refY: 5,
        markerWidth: 5,
        markerHeight: 5,
        orient: "auto-start-reverse",
      },
      defs,
    );
    el("path", { d: "M0,0 L10,5 L0,10 z", fill: COLORS.navy }, marker);
    el("circle", { cx: 0, cy: 0, r: 1, fill: "none", stroke: "#b3b3b3", "stroke-width": 0.006 }, svg);
    el("circle", { cx: 0, cy: 0, r: 0.5, fill: "none", stroke: "#e5e5e5", "stroke-width": 0.005 }, svg);
    svgLine(svg, [-1.15, 0], [1.15, 0], {
      stroke: COLORS.gray,
      "stroke-width": 0.007,
      "stroke-dasharray": "0.04 0.03",
    });
    svgLine(svg, [0, -1.15], [0, 1.15], {
      stroke: COLORS.gray,
      "stroke-width": 0.007,
      "stroke-dasharray": "0.04 0.03",
    });
    svgText(svg, [1.02, -0.09], "F1", { fill: "#666666", "font-size": 0.065 });
    svgText(svg, [0.04, 1.12], "F2", { fill: "#666666", "font-size": 0.065 });
    const T = cfg.angles.map(unit);
    // Proyecciones del ítem seleccionado.
    const g = el("g", {}, svg);
    if (cfg.sol && cfg.selected != null && cfg.showProj !== false) {
      const i = cfg.selected,
        v = cfg.A[i],
        p = cfg.sol.pattern[i],
        s = cfg.sol.structure[i],
        oblique = cfg.mode === "obl";
      T.forEach((t, j) => {
        const foot = [s[j] * t[0], s[j] * t[1]];
        svgLine(g, v, foot, {
          stroke: COLORS.warnInk,
          "stroke-width": 0.009,
          "stroke-dasharray": "0.012 0.018",
          "stroke-linecap": "round",
        });
        el("circle", { cx: P(foot)[0], cy: P(foot)[1], r: 0.016, fill: COLORS.warnInk }, g);
        const lab = [foot[0] * 1 + t[1] * 0.09 * (j ? 1 : -1), foot[1] - t[0] * 0.09 * (j ? 1 : -1)];
        svgText(g, lab, (oblique ? "s" : "λ") + (j ? "₂" : "₁") + " " + fmt(s[j], 2), {
          fill: COLORS.warnInk,
          "font-size": 0.06,
          "text-anchor": "middle",
        });
        if (oblique) {
          const other = T[1 - j],
            pt = [p[j] * t[0], p[j] * t[1]];
          svgLine(g, v, pt, { stroke: COLORS.blue, "stroke-width": 0.009, "stroke-dasharray": "0.04 0.025" });
          el("rect", { x: P(pt)[0] - 0.014, y: P(pt)[1] - 0.014, width: 0.028, height: 0.028, fill: COLORS.blue }, g);
          const lab2 = [pt[0] - other[0] * 0.1, pt[1] - other[1] * 0.1];
          svgText(g, lab2, "p" + (j ? "₂" : "₁") + " " + fmt(p[j], 2), {
            fill: COLORS.blue,
            "font-size": 0.06,
            "text-anchor": "middle",
          });
        }
      });
    }
    // Ítems.
    cfg.A.forEach((v, i) => {
      const [x, y] = P(v),
        item = el("g", { class: "item", tabindex: -1 }, svg);
      if (cfg.selected === i)
        el("circle", { cx: x, cy: y, r: 0.05, fill: "none", stroke: COLORS.navy, "stroke-width": 0.01 }, item);
      el(
        "circle",
        {
          cx: x,
          cy: y,
          r: 0.032,
          fill: COLORS.series[cfg.groups[i]] || COLORS.series[0],
          stroke: "#ffffff",
          "stroke-width": 0.008,
        },
        item,
      );
      // Etiqueta a un lado u otro del vector (alternando) para que los ítems alineados no se solapen.
      const len = Math.hypot(v[0], v[1]) || 1,
        side = i % 2 ? 1 : -1,
        nx = (-v[1] / len) * side,
        ny = (v[0] / len) * side,
        [lx, ly] = P([v[0] + nx * 0.075, v[1] + ny * 0.075]),
        t = el(
          "text",
          {
            x: lx,
            y: ly + 0.022,
            "font-size": 0.062,
            fill: "#1a1a1a",
            "font-weight": 600,
            "text-anchor": nx >= 0 ? "start" : "end",
          },
          item,
        );
      t.textContent = cfg.names[i];
      const title = el("title", {}, item);
      title.textContent = `${cfg.names[i]}: sin rotar (${fmt(v[0], 2)}; ${fmt(v[1], 2)})`;
      item.addEventListener("click", () => cfg.onSelect && cfg.onSelect(i));
    });
    // Ejes rotados con asas.
    T.forEach((t, j) => {
      svgLine(svg, [-1.08 * t[0], -1.08 * t[1]], [1.08 * t[0], 1.08 * t[1]], {
        stroke: COLORS.navy,
        "stroke-width": 0.014,
        "marker-end": `url(#${svg.id}-arrow)`,
      });
      svgText(svg, [1.17 * t[0] - 0.05, 1.17 * t[1] - 0.03], j ? "F2′" : "F1′", {
        "font-size": 0.085,
        "font-weight": 700,
      });
      const [hx, hy] = P([1.08 * t[0], 1.08 * t[1]]),
        h = el(
          "circle",
          {
            cx: hx,
            cy: hy,
            r: 0.055,
            fill: "#ffffff",
            stroke: COLORS.navy,
            "stroke-width": 0.014,
            class: "handle",
            tabindex: 0,
            role: "slider",
            "aria-label": `Ángulo del eje F${j + 1}′`,
            "aria-valuenow": Math.round(cfg.angles[j]),
            "aria-valuemin": -180,
            "aria-valuemax": 180,
          },
          svg,
        );
      h.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        h.setPointerCapture(e.pointerId);
        const move = (ev) => {
          const pt = svg.createSVGPoint();
          pt.x = ev.clientX;
          pt.y = ev.clientY;
          const q = pt.matrixTransform(svg.getScreenCTM().inverse());
          cfg.onAxis(j, (Math.atan2(-q.y, q.x) * 180) / Math.PI, true);
        };
        const up = () => {
          h.removeEventListener("pointermove", move);
          h.removeEventListener("pointerup", up);
          h.removeEventListener("pointercancel", up);
        };
        h.addEventListener("pointermove", move);
        h.addEventListener("pointerup", up);
        h.addEventListener("pointercancel", up);
      });
      h.addEventListener("keydown", (e) => {
        const step = e.shiftKey ? 5 : 1,
          d = { ArrowUp: step, ArrowRight: -step, ArrowDown: -step, ArrowLeft: step }[e.key];
        if (d !== undefined) {
          e.preventDefault();
          cfg.onAxis(j, cfg.angles[j] + d, false);
          requestAnimationFrame(() => svg.querySelectorAll(".handle")[j]?.focus());
        }
      });
    });
  }

  // Animación entre ángulos (respeta reducción de movimiento).
  function tween(from, to, apply, ms = 1100) {
    if (reduceMotion) return apply(to, true);
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / ms),
        e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      apply(
        from.map((a, i) => a + (to[i] - a) * e),
        u === 1,
      );
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- 01 · Predice ----------
  const predictions = {};
  function renderPredict() {
    const d = PRESETS.relacionados;
    heatTable(
      "predict-table",
      ["Ítem", "F1", "F2", "h²"],
      loadingRows(d.names, d.A, [d.A.map((r) => r[0] ** 2 + r[1] ** 2)]),
      { caption: "Cargas sin rotar de la escala de hábitos de estudio" },
    );
  }
  $("predict-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    ["p1", "p2", "p3", "pconf"].forEach((k) => (predictions[k] = f.get(k)));
    const missing = ["p1", "p2", "p3"].filter((k) => !predictions[k]).length;
    text(
      "predict-status",
      missing
        ? `Has dejado ${missing} ${missing === 1 ? "pregunta" : "preguntas"} sin responder; puedes seguir igualmente.`
        : "Predicciones guardadas. Vamos al apartado 02.",
    );
    goTo("ortogonal");
  });
  const PREDICT_FEEDBACK = {
    p1: {
      ok: "b",
      text: {
        a: "No necesariamente. La extracción orienta F1 hacia la máxima varianza común, así que casi todo carga en F1 aunque haya dos dominios.",
        b: "Correcto: la orientación inicial es una convención de la extracción; la dimensionalidad no cambia al rotar, solo lo que se ve. Tras rotar aparecen dos grupos.",
        c: "La redacción no se deduce de este patrón: es el efecto de la orientación inicial de los ejes.",
      },
    },
    p2: {
      ok: "c",
      text: {
        a: "No: h² es la longitud al cuadrado del vector del ítem, y girar los ejes no lo alarga.",
        b: "No: h² es la longitud al cuadrado del vector del ítem, y girar los ejes no lo acorta.",
        c: "Correcto: lo has visto en la columna h², que no cambia con ningún giro.",
      },
    },
    p3: {
      ok: "a",
      text: {
        a: "Correcto: O1–O4 y M1–M4 se separan cuando los ejes atraviesan cada grupo.",
        b: "Con estos datos hay dos dominios: el factor «general» solo era la orientación inicial.",
        c: "El orden de los ítems no tiene relación con la estructura; lo que agrupa es el contenido compartido.",
      },
    },
  };
  function renderPredictCheck() {
    const host = $("predict-check");
    host.replaceChildren();
    if (!["p1", "p2", "p3"].some((k) => predictions[k])) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "No guardaste predicciones en el apartado 01. Puedes volver y hacerlo para comparar.";
      host.append(p);
      return;
    }
    const h = document.createElement("h3");
    h.textContent = "Tus predicciones del apartado 01";
    host.append(h);
    let hits = 0;
    ["p1", "p2", "p3"].forEach((k, i) => {
      const fb = PREDICT_FEEDBACK[k],
        ans = predictions[k],
        ok = ans === fb.ok,
        div = document.createElement("div");
      hits += ok;
      div.className = "item-feedback" + (ok ? "" : " miss");
      div.textContent = `${i + 1}. ${ok ? "Acertaste." : ans ? "No era esa." : "Sin respuesta."} ${fb.text[ans] || fb.text[fb.ok]}`;
      host.append(div);
    });
    if (predictions.pconf) {
      const p = document.createElement("p");
      p.className = "explanation";
      const conf = { seguro: "seguro", dudo: "con dudas", adivino: "adivinando" }[predictions.pconf];
      p.textContent = `Respondiste ${conf} y acertaste ${hits} de 3. ${predictions.pconf === "seguro" && hits < 3 ? "Es frecuente: la solución sin rotar parece muy clara y engaña." : "Compara tu seguridad con tu resultado."}`;
      host.append(p);
    }
  }

  // ---------- 02 · Ortogonal ----------
  const orth = { key: "relacionados", angle: 0, selected: 0, done: false };
  let orthChart;
  function orthSolution() {
    const d = dataset(orth.key);
    return { d, sol: R.manual(d.A, [orth.angle, orth.angle + 90]) };
  }
  function varimaxCurve(A) {
    const xs = [],
      ys = [];
    for (let a = -90; a <= 90; a += 0.5) {
      xs.push(a);
      ys.push(R.varimaxValue(R.manual(A, [a, a + 90]).pattern));
    }
    return { xs, ys };
  }
  function nearestOptimum(A, angle) {
    // Óptimo Varimax: ángulo del primer eje de stats::varimax y sus equivalentes cada 90°.
    const vm = R.rotate(A, "varimax", { order: false, starts: ROBUST }),
      a0 = R.axisAngles(vm.T)[0];
    let best = a0,
      bd = Infinity;
    for (let k = -4; k <= 4; k++) {
      const a = a0 + 90 * k;
      if (a < -180 || a > 180) continue;
      const d = Math.abs(a - angle);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    return { angle: best, value: R.varimaxValue(vm.pattern) };
  }
  function setOrthAngle(a, fromDrag) {
    let v = Math.round(wrapAngle(a));
    if (v > 180) v -= 360;
    orth.angle = Math.max(-180, Math.min(180, v));
    $("orth-angle").value = Math.max(-90, Math.min(90, orth.angle));
    renderOrth();
    void fromDrag;
  }
  function renderOrth() {
    const { d, sol } = orthSolution();
    text("orth-angle-value", deg(orth.angle));
    drawPlane($("orth-plane"), {
      A: d.A,
      names: d.names,
      groups: d.groups,
      angles: [orth.angle, orth.angle + 90],
      sol,
      selected: orth.selected,
      mode: "orth",
      onAxis: (j, a) => setOrthAngle(j ? a - 90 : a, true),
      onSelect: (i) => {
        orth.selected = i;
        renderOrth();
      },
    });
    heatTable("orth-table", ["Ítem", "F1′", "F2′", "h²"], loadingRows(d.names, sol.pattern, [sol.h2]), {
      caption: "Cargas tras el giro",
    });
    text("orth-varimax", fmt(R.varimaxValue(sol.pattern)));
    text("orth-simple", countSimple(sol.pattern) + " de " + d.names.length);
    text("orth-total", fmt(sol.totalCommon));
    text(
      "orth-contrib",
      `Varianza común de cada factor: F1′ = ${fmt(sol.contribution[0])} y F2′ = ${fmt(sol.contribution[1])}. Al girar se reparte de otra forma, pero la suma (${fmt(sol.totalCommon)}) no cambia.`,
    );
    text(
      "orth-plane-desc",
      `Ejes girados ${orth.angle} grados. ${d.names.map((n, i) => `${n}: ${fmt(sol.pattern[i][0], 2)} y ${fmt(sol.pattern[i][1], 2)}`).join("; ")}.`,
    );
    $("orth-note").hidden = orth.key !== "independientes";
    if (orth.done) renderOrthReveal();
  }
  function renderOrthReveal() {
    const { d } = orthSolution(),
      opt = nearestOptimum(d.A, orth.angle),
      cur = R.varimaxValue(R.manual(d.A, [orth.angle, orth.angle + 90]).pattern),
      gap = Math.abs(opt.angle - orth.angle);
    $("orth-reveal").hidden = false;
    text(
      "orth-feedback",
      `Tu giro: ${deg(orth.angle)} (V = ${fmt(cur)}). Varimax: ${deg(opt.angle)} (V = ${fmt(opt.value)}). ` +
        (gap <= 4
          ? "Prácticamente lo mismo: has encontrado la estructura simple a ojo."
          : gap <= 15
            ? `Cerca: ${Math.round(gap)}° de diferencia.`
            : `Hay ${Math.round(gap)}° de diferencia: fíjate en qué cargas cruzadas quedaban.`) +
        " Cualquier giro de ±90° da la misma solución con los factores intercambiados o reflejados.",
    );
    const c = varimaxCurve(d.A);
    if (orthChart) orthChart.destroy();
    orthChart = new Chart($("orth-curve"), {
      type: "line",
      data: {
        labels: c.xs,
        datasets: [
          {
            label: "Criterio Varimax",
            data: c.ys,
            borderColor: COLORS.series[0],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0,
          },
          {
            label: "Tu giro",
            type: "scatter",
            data: [{ x: orth.angle, y: cur }],
            backgroundColor: COLORS.series[1],
            borderColor: "#ffffff",
            borderWidth: 2,
            pointRadius: 8,
            pointStyle: "rectRot",
          },
          {
            label: "Varimax",
            type: "scatter",
            data: [-2, -1, 0, 1, 2]
              .map((k) => opt.angle + 90 * k)
              .filter((a) => a >= -90 && a <= 90)
              .map((a) => ({ x: a, y: opt.value })),
            backgroundColor: COLORS.navy,
            borderColor: "#ffffff",
            borderWidth: 2,
            pointRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: true,
        scales: {
          x: {
            type: "linear",
            min: -90,
            max: 90,
            title: { display: true, text: "Giro de los ejes (grados)" },
            ticks: { stepSize: 30 },
          },
          y: { title: { display: true, text: "V (más alto = más simple)" } },
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              title: (items) => "Giro " + Math.round(items[0].parsed.x) + "°",
              label: (ctx) => `${ctx.dataset.label}: V = ${fmt(ctx.parsed.y)}`,
            },
          },
        },
        interaction: { mode: "nearest", intersect: false },
      },
    });
    renderPredictCheck();
  }
  $("orth-angle").addEventListener("input", (e) => setOrthAngle(+e.target.value));
  $("orth-reset").addEventListener("click", () => setOrthAngle(0));
  $("orth-preset").addEventListener("change", (e) => {
    orth.key = e.target.value;
    orth.selected = 0;
    setOrthAngle(0);
  });
  $("orth-done").addEventListener("click", () => {
    orth.done = true;
    renderOrth();
    $("orth-reveal").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
  $("orth-animate").addEventListener("click", () => {
    const { d } = orthSolution(),
      target = nearestOptimum(d.A, orth.angle).angle;
    tween([orth.angle], [target], ([a], end) => {
      orth.angle = end ? Math.round(a * 10) / 10 : a;
      $("orth-angle").value = Math.max(-90, Math.min(90, orth.angle));
      renderOrth();
    });
  });

  // ---------- 03 · Oblicua ----------
  const obl = { key: "relacionados", angles: [0, 90], selected: 0, hint: 0, practiceItem: null };
  const MIN_SEP = 15;
  function oblSolution() {
    const d = dataset(obl.key);
    return { d, sol: R.manual(d.A, obl.angles) };
  }
  function sepOk(a1, a2) {
    const s = Math.abs(Math.sin(((a2 - a1) * Math.PI) / 180));
    return s >= Math.sin((MIN_SEP * Math.PI) / 180);
  }
  function setOblAngles(next, opts = {}) {
    const a = next.map((x) => Math.max(-180, Math.min(180, wrapAngle(x))));
    if (!sepOk(a[0], a[1])) {
      text(
        "obl-status",
        `Los ejes no pueden acercarse a menos de ${MIN_SEP}°: con ejes casi paralelos φ → ±1 y el patrón se dispara.`,
      );
      return;
    }
    obl.angles = opts.exact ? a : a.map((x) => Math.round(x));
    $("obl-a1").value = Math.max(-90, Math.min(90, obl.angles[0]));
    $("obl-a2").value = Math.max(-90, Math.min(180, obl.angles[1]));
    renderObl();
  }
  // Ajusta los ejes de una solución (T) a los actuales: elige asignación y signo más cercanos.
  function matchAxes(T) {
    const ang = R.axisAngles(T),
      cands = [];
    for (const perm of [
      [0, 1],
      [1, 0],
    ])
      for (const s0 of [0, 180])
        for (const s1 of [0, 180]) {
          const a = [wrapAngle(ang[perm[0]] + s0), wrapAngle(ang[perm[1]] + s1)];
          const cost = lineDist(a[0], obl.angles[0]) + lineDist(a[1], obl.angles[1]);
          cands.push({ a, cost });
        }
    cands.sort((x, y) => x.cost - y.cost);
    const best = cands[0].a;
    // Continuidad para animar sin saltos de ±360°.
    return best.map((x, i) => obl.angles[i] + wrapAngle(x - obl.angles[i]));
  }
  function renderObl() {
    const { d, sol } = oblSolution();
    if (!sol) return;
    obl.selected = Math.min(obl.selected, d.names.length - 1);
    text("obl-a1-value", deg(obl.angles[0]));
    text("obl-a2-value", deg(obl.angles[1]));
    drawPlane($("obl-plane"), {
      A: d.A,
      names: d.names,
      groups: d.groups,
      angles: obl.angles,
      sol,
      selected: obl.selected,
      mode: "obl",
      onAxis: (j, a) => {
        const next = [...obl.angles];
        next[j] = a;
        setOblAngles(next);
      },
      onSelect: (i) => {
        obl.selected = i;
        $("obl-item").value = i;
        renderObl();
      },
    });
    const phi = sol.phi[0][1],
      between = (Math.acos(Math.max(-1, Math.min(1, phi))) * 180) / Math.PI;
    text("obl-phi", fmt(phi));
    text("obl-angle", Math.round(between) + "°");
    text("obl-quartimin", fmt(R.quartiminValue(sol.pattern), 4));
    heatTable(
      "obl-table",
      ["Ítem", "Patrón F1′", "Patrón F2′", "Estructura F1′", "Estructura F2′", "h²"],
      d.names.map((n, i) => {
        const cf = crossFlags(sol.pattern[i]);
        return [
          n,
          ...sol.pattern[i].map((v, j) => ({ v, heat: true, cross: cf[j] })),
          ...sol.structure[i].map((v) => ({ v })),
          { v: sol.h2[i] },
        ];
      }),
      { caption: "Patrón, estructura y comunalidad" },
    );
    const orthogonal = Math.abs(phi) < 0.005;
    text(
      "obl-status",
      orthogonal
        ? "Ahora los ejes son perpendiculares (φ ≈ 0): patrón y estructura coinciden."
        : `Con φ = ${fmt(phi, 2)}, patrón y estructura ya no coinciden. h² sigue igual en todas las filas.`,
    );
    // Ejemplo resuelto y práctica.
    const i = obl.selected,
      p = sol.pattern[i],
      s = sol.structure[i];
    text(
      "worked-example",
      `${d.names[i]}: patrón (${fmt(p[0])}; ${fmt(p[1])}), φ = ${fmt(phi)}. s₁ = ${fmt(p[0])} + ${fmt(phi)} × ${fmt(p[1])} = ${fmt(s[0])}; s₂ = ${fmt(p[1])} + ${fmt(phi)} × ${fmt(p[0])} = ${fmt(s[1])}. h² = ${fmt(p[0])}·${fmt(s[0])} + ${fmt(p[1])}·${fmt(s[1])} = ${fmt(sol.h2[i])}.`,
    );
    const j = (i + Math.ceil(d.names.length / 2)) % d.names.length;
    obl.practiceItem = j;
    text(
      "practice-prompt",
      `Con los ejes actuales, ${d.names[j]} tiene patrón p₁ = ${fmt(sol.pattern[j][0])} y p₂ = ${fmt(sol.pattern[j][1])}, y φ = ${fmt(phi)}. ¿Cuál es su estructura s₁ (su correlación con F1′)?`,
    );
    text(
      "obl-plane-desc",
      `Eje F1′ a ${Math.round(obl.angles[0])} grados y F2′ a ${Math.round(obl.angles[1])} grados; φ = ${fmt(phi, 2)}. Ítem seleccionado ${d.names[i]}: patrón ${fmt(p[0], 2)} y ${fmt(p[1], 2)}; estructura ${fmt(s[0], 2)} y ${fmt(s[1], 2)}.`,
    );
    renderTruth();
  }
  function renderTruth() {
    const box = $("obl-truth-box"),
      d = dataset(obl.key);
    box.hidden = !$("obl-truth").checked;
    if (box.hidden) return;
    if (!d.pattern) {
      box.textContent =
        "Tus cargas no proceden de una población conocida: no hay estructura verdadera con la que comparar.";
      return;
    }
    box.textContent =
      `Población que generó estos datos: φ = ${fmt(d.phi[0][1], 2)}; patrón ` +
      d.names.map((n, i) => `${n} (${fmt(d.pattern[i][0], 2)}; ${fmt(d.pattern[i][1], 2)})`).join(", ") +
      ". Si todos los ítems son puros, Oblimin la recupera exactamente (cada ítem tiene una carga nula); con ítems complejos, solo de forma aproximada. Varimax solo lo hace si φ = 0.";
  }
  ["obl-a1", "obl-a2"].forEach((id, j) =>
    $(id).addEventListener("input", (e) => {
      const next = [...obl.angles];
      next[j] = +e.target.value;
      setOblAngles(next);
    }),
  );
  $("obl-item").addEventListener("change", (e) => {
    obl.selected = +e.target.value;
    renderObl();
  });
  $("obl-preset").addEventListener("change", (e) => {
    obl.key = e.target.value;
    obl.selected = 0;
    fillItemSelect();
    setOblAngles([0, 90]);
  });
  $("obl-truth").addEventListener("change", renderTruth);
  $("obl-reset").addEventListener("click", () => animateObl([0, 90]));
  $("obl-oblimin").addEventListener("click", () =>
    animateObl(matchAxes(R.rotate(dataset(obl.key).A, "oblimin", { starts: ROBUST }).T)),
  );
  $("obl-varimax").addEventListener("click", () =>
    animateObl(matchAxes(R.rotate(dataset(obl.key).A, "varimax", { starts: ROBUST }).T)),
  );
  function animateObl(target) {
    tween([...obl.angles], target, (a, end) => {
      if (!sepOk(a[0], a[1])) return;
      obl.angles = end ? target : a;
      $("obl-a1").value = Math.max(-90, Math.min(90, obl.angles[0]));
      $("obl-a2").value = Math.max(-90, Math.min(180, obl.angles[1]));
      renderObl();
    });
  }
  function fillItemSelect() {
    const d = dataset(obl.key),
      sel = $("obl-item");
    sel.replaceChildren(...d.names.map((n, i) => new Option(n, i)));
    sel.value = obl.selected;
  }
  const HINTS = [
    "Pista 1: la estructura suma la carga de patrón del propio factor y la del otro factor ponderada por φ.",
    (p1, p2, phi) => `Pista 2: s₁ = p₁ + φ·p₂ = ${fmt(p1)} + ${fmt(phi)} × (${fmt(p2)}).`,
    (p1, p2, phi, s1) => `Solución: s₁ = ${fmt(p1)} + ${fmt(phi)} × (${fmt(p2)}) = ${fmt(s1)}.`,
  ];
  $("practice-hint").addEventListener("click", () => {
    const { sol } = oblSolution(),
      j = obl.practiceItem,
      [p1, p2] = sol.pattern[j],
      phi = sol.phi[0][1],
      h = HINTS[Math.min(obl.hint, 2)];
    obl.hint++;
    text("practice-feedback", typeof h === "function" ? h(p1, p2, phi, sol.structure[j][0]) : h);
  });
  $("practice-check").addEventListener("click", () => {
    const { sol } = oblSolution(),
      j = obl.practiceItem,
      raw = $("practice-answer").value.trim().replace(",", "."),
      v = Number(raw),
      want = sol.structure[j][0],
      fb = $("practice-feedback");
    if (!raw || !Number.isFinite(v)) {
      fb.textContent = "Escribe un número, por ejemplo 0,512.";
      fb.className = "hint";
      return;
    }
    const ok = Math.abs(v - want) < 0.006,
      p1 = sol.pattern[j][0];
    fb.className = "feedback " + (ok ? "answer-correct" : "answer-wrong");
    fb.textContent = ok
      ? `Correcto: s₁ = ${fmt(want)}. Es la correlación del ítem con F1′; su contribución única es p₁ = ${fmt(p1)}.`
      : Math.abs(v - p1) < 0.006
        ? "Ese es el patrón p₁, no la estructura: falta sumar la parte que llega a través de la correlación entre factores (φ·p₂)."
        : Math.abs(v - p1 * p1) < 0.006
          ? "Has elevado al cuadrado: s₁ no es una varianza, es una correlación. Usa s₁ = p₁ + φ·p₂."
          : "Todavía no. Revisa los signos y usa s₁ = p₁ + φ·p₂; puedes pedir una pista.";
  });

  // ---------- 04 · Métodos ----------
  const methodsData = () => {
    const key = $("methods-data").value;
    if (key.startsWith("ex:")) {
      const e = EX.entries[key.slice(3)],
        A = e.solutions["3_uls_none"].pattern;
      return { A, names: A.map((_, i) => "I" + (i + 1)), groups: A.map((_, i) => Math.floor(i / 3)) };
    }
    return dataset(key);
  };
  let methodsGuess = null;
  function computeMethods() {
    const d = methodsData(),
      gamma = +$("methods-gamma").value,
      kappa = +$("methods-kappa").value,
      list = [
        { key: "varimax", label: "Varimax", r: R.rotate(d.A, "varimax", { starts: ROBUST }) },
        { key: "quartimax", label: "Quartimax", r: R.rotate(d.A, "quartimax", { starts: ROBUST }) },
        {
          key: "oblimin",
          label: `Oblimin γ = ${fmt(gamma, 1)}`,
          r: R.rotate(d.A, "oblimin", { gamma, starts: ROBUST }),
        },
        { key: "promax", label: `Promax κ = ${kappa}`, r: R.rotate(d.A, "promax", { kappa, starts: ROBUST }) },
        { key: "geominQ", label: "Geomin δ = 0,01", r: R.rotate(d.A, "geominQ", { starts: ROBUST }) },
      ];
    return { d, list };
  }
  function renderMethods() {
    text("methods-gamma-value", fmt(+$("methods-gamma").value, 1));
    text("methods-kappa-value", $("methods-kappa").value);
    if (!methodsGuess) return;
    const { d, list } = computeMethods(),
      offPhi = (phi) => phi.flatMap((r, i) => r.filter((_, j) => j > i)),
      secondary = (M) => M.map((r) => r.map(Math.abs).sort((a, b) => b - a)[1]),
      rows = [
        [
          "Φ fuera de la diagonal",
          ...list.map((m) =>
            m.r.oblique
              ? offPhi(m.r.phi)
                  .map((x) => fmt(x, 2))
                  .join(" · ")
              : "0 (impuesto)",
          ),
        ],
        ["Mayor carga secundaria |λ|", ...list.map((m) => fmt(Math.max(...secondary(m.r.pattern)), 2))],
        [
          "Ítems con secundaria ≥ 0,20",
          ...list.map((m) => String(secondary(m.r.pattern).filter((x) => x >= 0.2).length)),
        ],
        ["Σh² (varianza común)", ...list.map((m) => fmt(m.r.totalCommon))],
        ["Convergencia", ...list.map((m) => (m.r.converged ? `sí (${m.r.iterations} it.)` : "no"))],
      ];
    heatTable("methods-summary", ["", ...list.map((m) => m.label)], rows, {
      caption: "Resumen comparativo de rotaciones",
    });
    const grid = $("methods-grid");
    grid.replaceChildren();
    list.forEach((m) => {
      const box = document.createElement("div"),
        h = document.createElement("h4"),
        t = document.createElement("div");
      h.textContent = m.label;
      t.className = "factor-table rot-heat";
      box.append(h, t);
      grid.append(box);
      heatTable(t, ["Ítem", ...m.r.pattern[0].map((_, j) => "F" + (j + 1))], loadingRows(d.names, m.r.pattern), {
        caption: "Patrón · " + m.label,
      });
    });
    // Retroalimentación de la predicción.
    const maxPhi = list.map((m) => (m.r.oblique ? Math.max(...offPhi(m.r.phi).map(Math.abs)) : 0)),
      bestIdx = maxPhi.indexOf(Math.max(...maxPhi)),
      best = list[bestIdx];
    const guessText = { varimax: "Varimax", oblimin: "Oblimin", promax: "Promax", none: "«Ninguno»" }[methodsGuess];
    text(
      "methods-guess-feedback",
      (methodsGuess === "varimax" || methodsGuess === "none"
        ? `Elegiste ${guessText}: Varimax y Quartimax fijan Φ = I por definición; las oblicuas la estiman.`
        : `Elegiste ${guessText}.`) +
        (maxPhi[bestIdx] < 0.05
          ? " Con estos datos todas las rotaciones dan φ ≈ 0: una rotación oblicua no inventa correlación si no la hay."
          : ` Con estos datos y parámetros, la correlación más alta la da ${best.label} (|φ| máx = ${fmt(maxPhi[bestIdx], 2)}). Mueve γ o κ y observa cómo cambia.`),
    );
  }
  document.querySelectorAll("#methods-predict [data-guess]").forEach((b) =>
    b.addEventListener("click", () => {
      methodsGuess = b.dataset.guess;
      document
        .querySelectorAll("#methods-predict [data-guess]")
        .forEach((x) => x.setAttribute("aria-pressed", x === b));
      $("methods-results").hidden = false;
      renderMethods();
    }),
  );
  ["methods-data", "methods-gamma", "methods-kappa"].forEach((id) => $(id).addEventListener("input", renderMethods));

  // ---------- 05 · Espacio 3D ----------
  const space = { from: null, axes: null, anim: 1 };
  function spaceData() {
    const e = EX.entries[$("space-data").value],
      A = e.solutions["3_uls_none"].pattern,
      rot = $("space-rotation").value,
      r = R.rotate(A, rot, { starts: ROBUST });
    return { A, r, rot, names: A.map((_, i) => "I" + (i + 1)) };
  }
  function drawSpace() {
    const canvas = $("space-canvas"),
      w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const { A, r, names } = spaceData(),
      yaw = (+$("space-yaw").value * Math.PI) / 180,
      pitch = (+$("space-pitch").value * Math.PI) / 180,
      sc = Math.min(w, h) * 0.42;
    // Cámara ortográfica: giro alrededor de F3 (vertical) y elevación.
    const proj = (v) => {
      const x = v[0] * Math.cos(yaw) - v[1] * Math.sin(yaw),
        y = v[0] * Math.sin(yaw) + v[1] * Math.cos(yaw),
        up = v[2] * Math.cos(pitch) + y * Math.sin(pitch),
        depth = y * Math.cos(pitch) - v[2] * Math.sin(pitch);
      return { x: w / 2 + x * sc, y: h / 2 - up * sc, depth };
    };
    const line = (a, b, color, width, dash = []) => {
      const p = proj(a),
        q = proj(b);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const label = (v, s, color, bold) => {
      const p = proj(v);
      ctx.fillStyle = color;
      ctx.font = `${bold ? 700 : 600} 13px Manrope, Arial, sans-serif`;
      ctx.fillText(s, p.x + 5, p.y - 5);
    };
    // Ejes sin rotar y círculo unidad del plano F1–F2.
    ctx.beginPath();
    for (let t = 0; t <= 64; t++) {
      const a = (t / 64) * 2 * Math.PI,
        p = proj([Math.cos(a), Math.sin(a), 0]);
      t ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;
    ctx.stroke();
    ["F1", "F2", "F3"].forEach((n, j) => {
      const e = [0, 0, 0];
      e[j] = 1.05;
      line([0, 0, 0], e, COLORS.gray, 1.2, [5, 4]);
      label(e, n, "#666666");
    });
    // Ítems ordenados por profundidad.
    const order = A.map((v, i) => ({ v, i, d: proj(v).depth })).sort((a, b) => a.d - b.d);
    order.forEach(({ v, i }) => {
      line([v[0], v[1], 0], v, "#cccccc", 1);
      line([0, 0, 0], v, COLORS.series[Math.floor(i / 3)], 1.6);
      const p = proj(v);
      ctx.fillStyle = COLORS.series[Math.floor(i / 3)];
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      label(v, names[i], "#1a1a1a");
    });
    // Ejes rotados (interpolados durante la animación).
    const T = r.T,
      s = space.anim,
      axes = R.transpose(T).map((t, j) => {
        const e = [0, 0, 0];
        e[j] = 1;
        const m = t.map((x, k) => (1 - s) * e[k] + s * x),
          n = Math.hypot(...m);
        return m.map((x) => x / n);
      });
    axes.forEach((t, j) => {
      const tip = t.map((x) => x * 1.15);
      line(
        t.map((x) => -x * 0.25),
        tip,
        COLORS.navy,
        3,
      );
      const p = proj(tip);
      ctx.fillStyle = COLORS.navy;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fill();
      label(tip, "F" + (j + 1) + "′", COLORS.navy, true);
    });
  }
  function renderSpaceTable() {
    const { r, rot } = spaceData(),
      k = 3,
      angles = [];
    for (let i = 0; i < k; i++)
      for (let j = i + 1; j < k; j++) {
        const phi = r.phi[i][j];
        angles.push([
          `F${i + 1}′–F${j + 1}′`,
          { v: phi },
          Math.round((Math.acos(Math.max(-1, Math.min(1, phi))) * 180) / Math.PI) + "°",
        ]);
      }
    heatTable("space-table", ["Par de ejes", "φ", "Ángulo"], angles, { caption: "Correlaciones y ángulos entre ejes" });
    text(
      "space-summary",
      rot === "none"
        ? "Sin rotar: F1 apunta hacia el centro de todos los ítems (factor «general» de la extracción); F2 y F3 son contrastes."
        : rot === "varimax"
          ? "Varimax mantiene los ejes a 90°: cada eje se acerca a su grupo, pero no puede atravesarlo si los grupos están correlacionados."
          : `${rot === "oblimin" ? "Oblimin" : "Promax"}: los ejes se cierran hasta atravesar cada grupo; el ángulo entre ellos refleja Φ (cos 66° ≈ 0,40).`,
    );
  }
  function renderSpace() {
    renderSpaceTable();
    drawSpace();
  }
  ["space-data", "space-rotation"].forEach((id) =>
    $(id).addEventListener("change", () => {
      space.anim = 1;
      renderSpace();
    }),
  );
  ["space-yaw", "space-pitch"].forEach((id) => $(id).addEventListener("input", drawSpace));
  $("space-animate").addEventListener("click", () => {
    if (reduceMotion) {
      space.anim = 1;
      return drawSpace();
    }
    tween(
      [0],
      [1],
      ([u]) => {
        space.anim = u;
        drawSpace();
      },
      1600,
    );
  });
  (function enableDrag() {
    const c = $("space-canvas");
    let drag = null;
    c.addEventListener("pointerdown", (e) => {
      drag = [e.clientX, e.clientY, +$("space-yaw").value, +$("space-pitch").value];
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener("pointermove", (e) => {
      if (!drag) return;
      $("space-yaw").value = Math.max(-180, Math.min(180, drag[2] - (e.clientX - drag[0]) * 0.5));
      $("space-pitch").value = Math.max(-80, Math.min(80, drag[3] + (e.clientY - drag[1]) * 0.4));
      drawSpace();
    });
    ["pointerup", "pointercancel"].forEach((ev) => c.addEventListener(ev, () => (drag = null)));
  })();

  // ---------- 06 · Calculadora ----------
  let calcResult = null;
  function exampleText() {
    const A = EX.entries.continua_pearson.solutions["3_uls_none"].pattern;
    return [
      "Ítem\tF1\tF2\tF3",
      ...A.map((r, i) => ["I" + (i + 1), ...r.map((x) => x.toFixed(3).replace(".", ","))].join("\t")),
    ].join("\n");
  }
  function updateParam() {
    const m = $("calc-method").value,
      cfg = { oblimin: ["γ", 0, 0.1, -2, 1], promax: ["κ", 4, 1, 2, 8], geominQ: ["δ", 0.01, 0.01, 0.001, 0.5] }[m];
    const input = $("calc-param");
    input.disabled = !cfg;
    text("calc-param-name", cfg ? cfg[0] : "—");
    if (cfg) Object.assign(input, { value: cfg[1], step: cfg[2], min: cfg[3], max: cfg[4] });
    $("calc-kaiser").disabled = !["oblimin", "quartimax", "geominQ"].includes(m);
  }
  function runCalc() {
    const parsed = R.parseMatrix($("calc-input").value),
      status = $("calc-status");
    calcResult = null;
    $("calc-download").disabled = true;
    $("calc-to-manual").disabled = true;
    if (parsed.error) {
      status.className = "factor-note error";
      status.textContent = parsed.error;
      $("calc-output").replaceChildren();
      text("calc-code", "");
      return;
    }
    const m = $("calc-method").value,
      param = Number($("calc-param").value),
      opts = {
        // Varimax usa siempre Kaiser (como stats::varimax); la casilla solo afecta a Quartimax, Oblimin y Geomin.
        normalize: m === "varimax" ? true : $("calc-kaiser").checked && !$("calc-kaiser").disabled,
        starts: $("calc-starts").checked ? ROBUST : 1,
      };
    if (m === "oblimin") opts.gamma = Number.isFinite(param) ? param : 0;
    if (m === "promax") opts.kappa = Number.isFinite(param) && param >= 1 ? param : 4;
    if (m === "geominQ") opts.delta = Number.isFinite(param) && param > 0 ? param : 0.01;
    let r;
    try {
      r = R.rotate(parsed.matrix, m, opts);
    } catch (err) {
      status.className = "factor-note error";
      status.textContent = "No se pudo rotar: " + err.message;
      return;
    }
    const k = parsed.matrix[0].length,
      names = parsed.names,
      fn = Array.from({ length: k }, (_, j) => "F" + (j + 1));
    calcResult = { r, names, fn, m, opts };
    status.className = "factor-note" + (r.converged ? "" : " error");
    status.textContent = r.converged
      ? `${R.METHODS[m].label}: ${m === "none" ? "solución sin rotar" : `convergió en ${r.iterations} iteraciones`}. ${parsed.names.length} ítems y ${k} factores. Σh² = ${fmt(r.totalCommon)} (igual que sin rotar).`
      : "La rotación no convergió en 1000 iteraciones: no interpretes la solución; prueba otro método o revisa las cargas.";
    if (r.localOptimum)
      status.textContent +=
        " Atención: con un único inicio (lo que hace R por defecto) el algoritmo se detenía lejos del óptimo; " +
        "esta solución procede del mejor de " +
        r.starts +
        " inicios. En R usa randomStarts en GPArotation.";
    const out = $("calc-output");
    out.replaceChildren();
    const block = (title, headers, rows) => {
      const h = document.createElement("h4"),
        t = document.createElement("div");
      h.textContent = title;
      t.className = "factor-table rot-heat";
      out.append(h, t);
      heatTable(t, headers, rows, { caption: title });
    };
    block(
      r.oblique ? "Patrón" : "Cargas rotadas",
      ["Ítem", ...fn, "h²", "u²"],
      loadingRows(names, r.pattern, [r.h2, r.h2.map((x) => 1 - x)]),
    );
    if (r.oblique) {
      block(
        "Estructura (correlaciones ítem-factor)",
        ["Ítem", ...fn],
        r.structure.map((row, i) => [names[i], ...row.map((v) => ({ v }))]),
      );
      block(
        "Φ · correlaciones entre factores",
        ["", ...fn],
        r.phi.map((row, i) => [fn[i], ...row.map((v) => ({ v }))]),
      );
    }
    block(
      "Varianza común de cada factor",
      ["", ...fn, "Total"],
      [
        ["Σ patrón × estructura", ...r.contribution.map((v) => ({ v })), { v: r.totalCommon }],
        ["% de Σh²", ...r.contribution.map((v) => ({ v: (100 * v) / r.totalCommon, n: 1 })), { v: 100, n: 1 }],
      ],
    );
    const rcall = {
      none: "unrotated",
      varimax:
        opts.starts > 1
          ? "GPArotation::Varimax(A, normalize = TRUE, randomStarts = 12)  # varios inicios; stats::varimax(A) usa uno"
          : "stats::varimax(A)  # Kaiser por defecto, como psych::fa(rotate = 'varimax')",
      quartimax: `GPArotation::quartimax(A${opts.normalize ? ", normalize = TRUE" : ""}${opts.starts > 1 ? ", randomStarts = 12" : ""})`,
      oblimin: `GPArotation::oblimin(A, gam = ${opts.gamma}${opts.normalize ? ", normalize = TRUE" : ""}${opts.starts > 1 ? ", randomStarts = 12" : ""})`,
      geominQ: `GPArotation::geominQ(A, delta = ${opts.delta}${opts.normalize ? ", normalize = TRUE" : ""}${opts.starts > 1 ? ", randomStarts = 12" : ""})`,
      promax: `psych::kaiser(A, rotate = "Promax", m = ${opts.kappa}, pro.m = ${opts.kappa})  # = psych::fa(rotate = 'promax')`,
    }[m];
    text(
      "calc-code",
      `# Cargas sin rotar (p × k)\nA <- matrix(c(${parsed.matrix.map((row) => row.join(", ")).join(",\n  ")}),\n  ncol = ${k}, byrow = TRUE)\n` +
        (m === "none" ? "A\n" : `rot <- ${rcall}\nrot$loadings${r.oblique ? "\nrot$Phi" : ""}\n`) +
        "# psych::fa() refleja y ordena los factores igual que esta página.\n" +
        "# Con datos: psych::fa(datos, nfactors = k, fm = 'uls', rotate = '" +
        (m === "geominQ" ? "geominQ" : m) +
        "')",
    );
    $("calc-download").disabled = false;
    $("calc-to-manual").disabled = k !== 2;
  }
  $("calc-method").addEventListener("change", updateParam);
  $("calc-run").addEventListener("click", runCalc);
  $("calc-example").addEventListener("click", () => {
    $("calc-input").value = exampleText();
    runCalc();
  });
  $("calc-download").addEventListener("click", () => {
    if (!calcResult) return;
    const { r, names, fn } = calcResult,
      q = (x) => (Number.isFinite(x) ? x.toFixed(6) : ""),
      lines = [
        ["item", ...fn.map((f) => "patron_" + f), ...(r.oblique ? fn.map((f) => "estructura_" + f) : []), "h2"].join(
          ",",
        ),
      ];
    r.pattern.forEach((row, i) =>
      lines.push([names[i], ...row.map(q), ...(r.oblique ? r.structure[i].map(q) : []), q(r.h2[i])].join(",")),
    );
    if (r.oblique) {
      lines.push("");
      lines.push(["phi", ...fn].join(","));
      r.phi.forEach((row, i) => lines.push([fn[i], ...row.map(q)].join(",")));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rotacion-${calcResult.m}.csv`;
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  });
  $("calc-to-manual").addEventListener("click", () => {
    const parsed = R.parseMatrix($("calc-input").value);
    if (parsed.error || parsed.matrix[0].length !== 2) return;
    custom = { label: "Tus cargas", A: parsed.matrix, names: parsed.names, groups: parsed.names.map(() => 0) };
    // Colorea por factor dominante tras Oblimin para ayudar a ver los grupos.
    const ob = R.rotate(parsed.matrix, "oblimin", { starts: ROBUST });
    custom.groups = ob.pattern.map((r) => (Math.abs(r[0]) >= Math.abs(r[1]) ? 0 : 1));
    ["orth-preset", "obl-preset"].forEach((id) => fillPresetSelect($(id)));
    $("orth-preset").value = "custom";
    $("obl-preset").value = "custom";
    orth.key = obl.key = "custom";
    orth.selected = obl.selected = 0;
    fillItemSelect();
    setOrthAngle(0);
    setOblAngles([0, 90]);
    goTo("ortogonal");
  });

  // ---------- 07 · Cuestionario con confianza ----------
  // El cuestionario lo genera Didactica (assets/js/core/preguntas.js, clave «rotacion»).
  $("self-explain-show").addEventListener("click", () => {
    // Generar antes de revelar: se pide un intento propio antes de mostrar el modelo.
    if ($("self-explain").value.trim().length < 20) {
      $("self-explain").focus();
      $("self-explain").setAttribute("aria-describedby", "self-explain-hint");
      let hint = $("self-explain-hint");
      if (!hint) {
        hint = document.createElement("p");
        hint.id = "self-explain-hint";
        hint.className = "hint";
        $("self-explain").after(hint);
      }
      hint.textContent = "Escribe primero tu explicación (al menos una frase); después compárala con el modelo.";
      return;
    }
    $("self-explain-model").hidden = false;
  });

  // ---------- Inicio ----------
  fillPresetSelect($("orth-preset"));
  fillPresetSelect($("obl-preset"));
  const md = $("methods-data");
  Object.entries(PRESETS).forEach(([k, p]) => md.append(new Option(p.label, k)));
  md.append(new Option("Módulo 5 · continuos, 3 factores (ULS)", "ex:continua_pearson"));
  md.append(new Option("Módulo 5 · ordinales con policóricas, 3 factores (ULS)", "ex:ordinal_poly"));
  fillItemSelect();
  updateParam();
  $("calc-input").value = exampleText();
  renderPredict();
  renderOrth();
  renderObl();
  renderMethods();
  runCalc();
  renderSpaceTable();
  window.addEventListener("rot-panel", () => {
    if (!$("espacio").hidden) drawSpace();
    if (orthChart) orthChart.resize();
  });
  window.addEventListener("resize", () => {
    if (!$("espacio").hidden) drawSpace();
  });
  // Acceso directo a un apartado: rotacion.html#oblicua
  const fromHash = () => {
    const hash = location.hash.slice(1);
    if (tabs.some((t) => t.dataset.panel === hash)) goTo(hash);
  };
  fromHash();
  window.addEventListener("hashchange", fromHash);
})();
