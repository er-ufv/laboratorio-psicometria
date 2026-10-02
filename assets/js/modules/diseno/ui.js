/* Todos los textos del usuario se asignan a value/textContent, nunca a HTML. */
(function () {
  "use strict";
  const D = DesignData,
    S = DesignState,
    $ = (id) => document.getElementById(id);
  let storage;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  const loaded = S.load(storage);
  let state = loaded.state,
    timer,
    toastTimer,
    rebuilding = false; // al retirar un campo con foco, el navegador emite «change» a mitad de reconstrucción
  function rebuild(fn) {
    rebuilding = true;
    try {
      fn();
    } finally {
      rebuilding = false;
    }
  }
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  const active = () => state.drafts[state.active];
  const letter = (i) => String.fromCharCode(65 + i);
  const optionInputs = () => Array.from($("response-editor").querySelectorAll('input[id^="option-"]'));
  /* Copias de solo lectura para imprimir el texto completo (los campos de formulario lo recortan). */
  function mirror(node) {
    const m = el("div", undefined, "print-mirror");
    m.dataset.for = node.id;
    m.setAttribute("aria-hidden", "true");
    m.textContent = node.value;
    return m;
  }
  function syncMirrors() {
    document.querySelectorAll("#draft .print-mirror").forEach((m) => {
      const source = $(m.dataset.for);
      m.textContent = source ? source.value : "";
    });
    $("print-meta").textContent =
      "Ficha de ítem · " +
      { tipico: "Rendimiento típico", optimo: "Rendimiento óptimo (elección múltiple)" }[state.active] +
      " · " +
      new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  }
  function toast(text) {
    $("toast").textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($("toast").textContent = ""), 5500);
  }
  function persist() {
    const ok = S.save(storage, state);
    $("save-status").textContent = ok
      ? "Ficha guardada en este navegador. Puedes exportar una copia."
      : "No se pudo guardar localmente. Exporta la ficha para conservarla.";
    return ok;
  }
  function capture() {
    const d = active();
    for (const k of ["construct", "population", "item", "notes"]) d[k] = $(k).value;
    if (state.active === "tipico") {
      d.scale = $("scale").value;
      d.categories = Number($("categories").value);
    } else {
      d.options = optionInputs().map((x) => x.value);
      d.key = Number($("key").value);
    }
    d.checks = Array.from($("checklist").querySelectorAll("input"), (x) => x.checked);
  }
  function updateReview() {
    const r = S.review(active().checks, D.types[state.active].checks.length);
    $("progress").max = r.total;
    $("progress").value = r.done;
    $("progress-text").textContent = `${r.done} / ${r.total} · ${r.percent} %`;
    $("review-result").textContent =
      r.done === r.total
        ? "Has registrado todos los criterios. Documenta las evidencias de revisión y planifica el pilotaje. Completar la lista no valida el ítem."
        : "Revisa los criterios pendientes antes de planificar el pilotaje.";
  }
  function field(id, label, tag = "input") {
    const l = el("label", label);
    l.htmlFor = id;
    const n = el(tag);
    n.id = id;
    return [l, n];
  }
  function responses() {
    const d = active(),
      box = $("response-editor");
    box.replaceChildren();
    if (state.active === "tipico") {
      const grid = el("div", undefined, "response-options");
      for (const [id, label, options] of [
        [
          "scale",
          "Formato",
          [
            ["frecuencia", "Frecuencia"],
            ["acuerdo", "Acuerdo"],
            ["intensidad", "Intensidad"],
          ],
        ],
        [
          "categories",
          "Categorías",
          [
            [4, "4"],
            [5, "5"],
            [7, "7"],
          ],
        ],
      ]) {
        const wrap = el("div"),
          [l, n] = field(id, label, "select");
        for (const [value, text] of options) {
          const o = el("option", text);
          o.value = value;
          n.append(o);
        }
        n.value = d[id];
        wrap.append(l, n);
        grid.append(wrap);
      }
      box.append(grid);
      const p = el("p", undefined, "hint");
      p.id = "scale-help";
      box.append(p);
      scaleHelp();
    } else {
      const count = d.options.length;
      for (let i = 0; i < count; i++) {
        const [l, n] = field("option-" + i, "Opción " + letter(i));
        n.maxLength = 500;
        n.value = d.options[i];
        box.append(l, n, mirror(n));
      }
      const grid = el("div", undefined, "response-options option-settings");
      const countWrap = el("div", undefined, "option-count-field"),
        [lc, nc] = field("option-count", "Número de opciones", "select");
      for (let v = S.MIN_OPTIONS; v <= S.MAX_OPTIONS; v++) {
        const o = el("option", String(v));
        o.value = v;
        nc.append(o);
      }
      nc.value = count;
      nc.addEventListener("change", () => setOptionCount(Number(nc.value), count));
      countWrap.append(lc, nc);
      const keyWrap = el("div"),
        [l, n] = field("key", "Clave propuesta", "select");
      for (let i = 0; i < count; i++) {
        const o = el("option", letter(i));
        o.value = i;
        n.append(o);
      }
      n.value = d.key;
      keyWrap.append(l, n);
      grid.append(countWrap, keyWrap);
      box.append(
        grid,
        el(
          "p",
          "Entre 3 y 5 opciones. Tres pueden bastar si todas son plausibles; no añadas distractores para completar un número. La clave debe justificarse y revisarse por expertos: el editor no evalúa su corrección.",
          "hint",
        ),
      );
    }
  }
  function setOptionCount(next, previous) {
    capture();
    const d = active(),
      dropped = d.options.slice(next).filter((x) => x.trim());
    if (
      dropped.length &&
      !window.confirm(
        `Al pasar a ${next} opciones se borrará el texto de ${dropped.length === 1 ? "una opción" : dropped.length + " opciones"} (desde la ${letter(next)}). ¿Continuar?`,
      )
    ) {
      $("option-count").value = previous;
      return;
    }
    const lostKey = d.key >= next;
    d.options = Array.from({ length: next }, (_, i) => d.options[i] ?? "");
    if (lostKey) d.key = 0;
    rebuild(responses);
    syncMirrors();
    $("option-count").focus();
    persist();
    if (lostKey) toast("La clave señalaba una opción eliminada; ahora es A. Revísala.");
  }
  function scaleHelp() {
    if (state.active !== "tipico") return;
    const n = Number($("categories").value),
      kind = $("scale").value;
    const labels = {
      frecuencia: {
        4: ["Nunca", "Pocas veces", "Muchas veces", "Siempre"],
        5: ["Nunca", "Rara vez", "A veces", "A menudo", "Siempre"],
        7: ["Nunca", "Casi nunca", "Rara vez", "A veces", "A menudo", "Casi siempre", "Siempre"],
      },
      acuerdo: {
        4: ["Totalmente en desacuerdo", "En desacuerdo", "De acuerdo", "Totalmente de acuerdo"],
        5: [
          "Totalmente en desacuerdo",
          "En desacuerdo",
          "Ni de acuerdo ni en desacuerdo",
          "De acuerdo",
          "Totalmente de acuerdo",
        ],
        7: [
          "Totalmente en desacuerdo",
          "Bastante en desacuerdo",
          "Algo en desacuerdo",
          "Ni de acuerdo ni en desacuerdo",
          "Algo de acuerdo",
          "Bastante de acuerdo",
          "Totalmente de acuerdo",
        ],
      },
      intensidad: {
        4: ["Nada", "Poco", "Bastante", "Mucho"],
        5: ["Nada", "Poco", "Moderadamente", "Bastante", "Mucho"],
        7: ["Nada", "Muy poco", "Poco", "Moderadamente", "Bastante", "Mucho", "Muchísimo"],
      },
    };
    $("scale-help").textContent =
      "Etiquetas sugeridas: " +
      labels[kind][n].join(" · ") +
      ". Deben comprobarse en entrevistas cognitivas; no existe un número universal de categorías.";
  }
  function examples() {
    const examples = D.types[state.active].examples.filter(
      (x) => $("filter").value === "all" || x.tag === $("filter").value,
    );
    $("example-list").replaceChildren();
    for (const e of examples) {
      const card = el("article", undefined, "example");
      card.append(el("span", e.tag, "tag"), el("h3", e.prompt));
      const bad = el("div", undefined, "bad");
      bad.append(el("span", "REDACTADO PROBLEMÁTICO", "item-label"), el("span", e.bad));
      const details = el("details"),
        summary = el("summary", "Ver explicación y propuesta");
      const good = el("div", undefined, "good");
      good.append(el("span", "PROPUESTA DE MEJORA", "item-label"), el("span", e.good));
      details.append(
        summary,
        el("p", e.why),
        good,
        el("p", "Fundamento: " + D.sources.find((x) => x.id === e.source).label, "source-label"),
      );
      // Generar antes de ver: el estudiante diagnostica y reescribe el ítem antes de abrir la propuesta.
      const tryId = "try-" + Math.random().toString(36).slice(2, 9),
        attempt = el("div", undefined, "example-try"),
        label = el("label", "Antes de mirar: ¿qué falla y cómo lo reescribirías?"),
        ta = el("textarea"),
        hint = el("p", "", "hint");
      label.setAttribute("for", tryId);
      ta.id = tryId;
      ta.rows = 2;
      ta.maxLength = 600;
      attempt.append(label, ta, hint);
      summary.addEventListener("click", (ev) => {
        if (details.open || ta.value.trim().length >= 8 || card.dataset.skip) return;
        ev.preventDefault();
        hint.textContent =
          "Escribe primero tu diagnóstico o tu versión. Si no se te ocurre nada, pulsa otra vez para verla.";
        card.dataset.skip = "1";
      });
      details.addEventListener("toggle", () => {
        if (details.open && ta.value.trim())
          hint.textContent = "Compara tu versión con la propuesta: ¿resuelve el mismo problema?";
      });
      card.append(bad, attempt, details);
      $("example-list").append(card);
    }
  }
  function render() {
    const type = D.types[state.active],
      d = active();
    document.querySelectorAll("[data-type]").forEach((b) => {
      const selected = b.dataset.type === state.active;
      b.setAttribute("aria-selected", selected);
      b.tabIndex = selected ? 0 : -1;
    });
    $("workspace").setAttribute("aria-labelledby", "tab-" + state.active);
    $("type-title").textContent = type.title;
    $("type-description").textContent = type.description;
    $("steps").replaceChildren();
    [...D.commonSteps, ...type.steps].forEach(([title, body, help], i) => {
      const det = el("details"),
        sum = el("summary", title);
      sum.dataset.number = String(i + 1).padStart(2, "0");
      const content = el("div");
      content.append(el("p", body), el("p", help, "hint"));
      det.append(sum, content);
      if (i === 0) det.open = true;
      $("steps").append(det);
    });
    $("filter").replaceChildren();
    for (const value of ["all", ...new Set(type.examples.map((x) => x.tag))]) {
      const option = el("option", value === "all" ? "Todos los errores" : value);
      option.value = value;
      $("filter").append(option);
    }
    examples();
    for (const k of ["construct", "population", "item", "notes"]) $(k).value = d[k];
    responses();
    $("checklist").replaceChildren();
    type.checks.forEach((text, i) => {
      const label = el("label", undefined, "check"),
        input = el("input");
      input.type = "checkbox";
      input.checked = d.checks[i] === true;
      label.append(input, el("span", text));
      $("checklist").append(label);
    });
    updateReview();
    syncMirrors();
    $("save-status").textContent = loaded.error
      ? "Almacenamiento no disponible o ilegible. Puedes seguir trabajando y exportar la ficha."
      : "Tus fichas de ambos formatos se guardan por separado en este navegador.";
  }
  document.querySelectorAll("[data-type]").forEach((b) => {
    b.addEventListener("click", () => {
      capture();
      clearTimeout(timer);
      state.active = b.dataset.type;
      rebuild(render);
      persist();
    });
    b.addEventListener("keydown", (e) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const next =
          e.key === "Home" ? "tipico" : e.key === "End" ? "optimo" : state.active === "tipico" ? "optimo" : "tipico";
        $("tab-" + next).click();
        $("tab-" + next).focus();
      }
    });
  });
  $("draft").addEventListener("input", () => {
    if (rebuilding) return;
    capture();
    syncMirrors();
    scaleHelp();
    updateReview();
    clearTimeout(timer);
    timer = setTimeout(persist, 450);
  });
  $("draft").addEventListener("change", (e) => {
    if (rebuilding || e.target.id === "import-file") return;
    capture();
    syncMirrors();
    scaleHelp();
    updateReview();
    persist();
  });
  $("filter").addEventListener("change", examples);
  $("save").addEventListener("click", () => {
    capture();
    toast(persist() ? "Ficha guardada." : "Exporta la ficha: el navegador no permite guardarla localmente.");
  });
  $("reset").addEventListener("click", () => {
    if (!window.confirm("¿Vaciar el borrador y las marcas de este formato? El otro formato se conserva.")) return;
    clearTimeout(timer);
    state.drafts[state.active] = S.blank();
    rebuild(render);
    persist();
    toast("Ficha vaciada.");
  });
  $("export").addEventListener("click", () => {
    capture();
    const d = active();
    if (!d.construct.trim() || !d.population.trim() || !d.item.trim()) {
      toast("Completa constructo, población y enunciado antes de exportar.");
      return;
    }
    if (state.active === "optimo" && d.options.some((x) => !x.trim())) {
      toast("Completa todas las opciones antes de exportar o reduce su número.");
      return;
    }
    const report = {
      version: 1,
      module: "diseno",
      type: state.active,
      exportedAt: new Date().toISOString(),
      draft: d,
      review: S.review(d.checks, D.types[state.active].checks.length),
      notice: "Borrador didáctico. No acredita validez ni fiabilidad.",
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" }),
    );
    const a = el("a");
    a.href = url;
    a.download = "ficha-item-" + state.active + ".json";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Ficha exportada con sus criterios de revisión.");
  });
  const hasContent = (d) =>
    ["construct", "population", "item", "notes"].some((k) => d[k].trim()) ||
    d.options.some((x) => x.trim()) ||
    d.checks.some(Boolean);
  $("import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async () => {
    const input = $("import-file"),
      file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > S.MAX_IMPORT_CHARS * 4) {
      toast("No se importó: el archivo es demasiado grande para ser una ficha exportada.");
      return;
    }
    let text;
    try {
      text = await file.text();
    } catch {
      toast("No se pudo leer el archivo.");
      return;
    }
    const result = S.parseReport(text);
    if (result.error) {
      toast("No se importó: " + result.error);
      return;
    }
    capture();
    const label = D.types[result.type].title;
    if (
      hasContent(state.drafts[result.type]) &&
      !window.confirm(`¿Sustituir la ficha de «${label}» guardada en este navegador por la importada?`)
    )
      return;
    clearTimeout(timer);
    state.drafts[result.type] = result.draft;
    state.active = result.type;
    rebuild(render);
    persist();
    toast(
      `Ficha de «${label}» importada.` +
        (result.adjusted ? " Algunos campos no válidos o demasiado largos se han descartado o recortado." : ""),
    );
  });
  $("print").addEventListener("click", () => {
    capture();
    syncMirrors();
    window.print();
  });
  window.addEventListener("beforeprint", () => {
    capture();
    syncMirrors();
  });
  for (const id of ["construct", "population", "item", "notes"]) $(id).after(mirror($(id)));
  const list = el("ul");
  for (const source of D.sources) {
    const li = el("li");
    li.append(el("strong", source.label), el("p", source.note));
    list.append(li);
  }
  $("sources").append(list);
  render();
})();
