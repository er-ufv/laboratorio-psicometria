/*
 * Componentes didácticos comunes a todos los módulos.
 *
 *   Didactica.predictions(host, clave)   Activación: predicciones con grado de seguridad (sin nota).
 *   Didactica.checkPredictions(host, clave)  Contraste de esas predicciones al cerrar el módulo.
 *   Didactica.quiz(host, clave, opciones) Cuestionario: seguridad antes de responder, explicación por opción,
 *                                        escalera de ayudas (pista → solución), calibración, repetir fallos,
 *                                        exportación CSV sin datos personales y cola de repaso espaciado.
 *   Didactica.gate(config)               Predecir antes de ver un resultado de un simulador (hide: difuminar;
 *                                        conceal: ocultar del todo; onReveal: al mostrar el resultado).
 *   Didactica.wire()                     Autoexplicación ([data-autoexp]) y paginación ([data-pager]).
 *
 * El contenido (preguntas y predicciones) está en preguntas.js. Nada se envía a ningún servidor; el
 * navegador solo recuerda, si lo permite, qué preguntas conviene repasar (localStorage con try/catch).
 */
(function (root) {
  "use strict";
  const doc = root.document;
  const PREFIX = "psicometria.v1.";
  const store = {
    get(key, fallback) {
      try {
        const v = root.localStorage.getItem(PREFIX + key);
        return v ? JSON.parse(v) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        root.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch {
        /* Sin almacenamiento: la página funciona igual, solo no recuerda. */
      }
    },
  };
  const el = (tag, attrs = {}, ...children) => {
    const n = doc.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    children.flat().forEach((c) => c != null && n.append(c));
    return n;
  };
  const CONF = [
    ["seguro", "Seguro"],
    ["dudo", "Dudo"],
    ["adivino", "Adivino"],
  ];
  const TAG = { recuerdo: "Recuerdo", aplicacion: "Aplicación", transferencia: "Transferencia" };
  // Quita el «Correcto:» inicial de la explicación y empieza con mayúscula.
  const stripCorrect = (s) => {
      const t = String(s || "").replace(/^Correcto[.:]\s*/i, "");
      return t.charAt(0).toUpperCase() + t.slice(1);
    },
    // Texto de una opción citado entre comillas, sin el punto final («…».» → «…»).
    quote = (t) => "«" + String(t).replace(/\.$/, "") + "»";
  // Barajado reproducible (mismo orden en cada visita, distinto entre preguntas).
  function order(n, seed) {
    const o = Array.from({ length: n }, (_, i) => i);
    let s = seed >>> 0 || 1;
    for (let i = n - 1; i > 0; i--) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      const j = s % (i + 1);
      [o[i], o[j]] = [o[j], o[i]];
    }
    return o;
  }
  const hash = (str) => [...String(str)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
  const confField = (name, onChange) =>
    el(
      "fieldset",
      { class: "dx-conf" },
      el("legend", { text: "Mi seguridad:" }),
      CONF.map(([v, label]) =>
        el("label", {}, el("input", { type: "radio", name, value: v, onchange: () => onChange(v) }), " " + label),
      ),
    );

  // ---------- Activación: predicciones ----------
  function predictions(host, key) {
    const items = (root.Predicciones || {})[key];
    if (!host || !items) return;
    const saved = store.get("pred." + key, {}),
      form = el("form", { class: "dx-predict" });
    items.forEach((it, i) => {
      const fs = el("fieldset", {}, el("legend", { text: `${i + 1}. ${it.q}` }));
      it.o.forEach(([text], j) =>
        fs.append(
          el(
            "label",
            {},
            el("input", { type: "radio", name: `${key}-p${i}`, value: j, checked: saved.answers?.[i] === j }),
            " " + text,
          ),
        ),
      );
      form.append(fs);
    });
    const conf = confField(`${key}-pconf`, () => {});
    conf.querySelectorAll("input").forEach((r) => (r.checked = r.value === saved.conf));
    const status = el("p", { class: "hint", role: "status" });
    form.append(conf, el("button", { type: "submit", text: "Guardar mis predicciones" }), status);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(form),
        answers = items.map((_, i) => (f.get(`${key}-p${i}`) === null ? null : Number(f.get(`${key}-p${i}`))));
      const data = { answers, conf: f.get(`${key}-pconf`), date: new Date().toISOString() };
      state.pred[key] = data;
      store.set("pred." + key, data);
      const missing = answers.filter((a) => a === null).length;
      status.textContent =
        (missing ? `Has dejado ${missing} sin responder. ` : "Predicciones guardadas. ") +
        "Las comprobarás al final del módulo; no cuentan como nota.";
    });
    host.replaceChildren(form);
  }
  function checkPredictions(host, key) {
    const items = (root.Predicciones || {})[key];
    if (!host || !items) return;
    const btn = el("button", { type: "button", class: "ghost", text: "Comprobar mis predicciones iniciales" }),
      out = el("div", { class: "dx-predcheck", "aria-live": "polite" });
    btn.addEventListener("click", () => {
      const data = state.pred[key] || store.get("pred." + key, null);
      out.replaceChildren();
      if (!data || !data.answers || data.answers.every((a) => a === null)) {
        out.append(
          el("p", {
            class: "hint",
            text: "No guardaste predicciones al empezar. Vuelve arriba, responde y compáralas.",
          }),
        );
        return;
      }
      let hits = 0;
      items.forEach((it, i) => {
        const a = data.answers[i],
          ok = a === it.a;
        hits += ok;
        out.append(
          el("div", {
            class: "dx-item-feedback" + (ok ? "" : " miss"),
            text: `${i + 1}. ${ok ? "Acertaste." : a === null ? "Sin respuesta." : "No era esa."} ${stripCorrect((it.o[a] || it.o[it.a])[1])}${ok ? "" : " La respuesta: " + quote(it.o[it.a][0]) + "."}`,
          }),
        );
      });
      const conf = { seguro: "con seguridad", dudo: "con dudas", adivino: "adivinando" }[data.conf];
      out.append(
        el("p", {
          class: "explanation",
          text:
            `Acertaste ${hits} de ${items.length}${conf ? `, respondiendo ${conf}` : ""}. ` +
            (data.conf === "seguro" && hits < items.length
              ? "Una idea previa firme pero incorrecta es justo la que más conviene revisar."
              : "Compara cómo cambiaron tus ideas desde el principio."),
        }),
      );
    });
    host.replaceChildren(btn, out);
  }

  // ---------- Cuestionario ----------
  const state = { pred: {}, quizzes: {} };
  function quiz(host, key, opts = {}) {
    let items = opts.items || (root.Preguntas || {})[key];
    if (!host || !items) return;
    const module = opts.module || key,
      results = items.map(() => ({ first: null, attempts: 0, solved: false, conf: null }));
    state.quizzes[key] = { items, results, module };
    const list = el("div", { class: "dx-quiz-list" }),
      summary = el("div", { class: "factor-note dx-summary", role: "status", hidden: true }),
      tools = el("div", { class: "dx-tools rot-buttons", hidden: true });
    function render(indices) {
      list.replaceChildren();
      indices.forEach((qi, pos) => list.append(question(qi, pos)));
    }
    function question(qi, pos) {
      const it = items[qi],
        st = results[qi],
        box = el("article", { class: "dx-q", "data-qid": it.id || `${key}-${qi + 1}` }),
        fb = el("p", { class: "feedback", "aria-live": "polite" }),
        optsBox = el("div", { class: "dx-opts", role: "group", "aria-label": `Opciones de la pregunta ${pos + 1}` }),
        hint = it.pista ? el("button", { type: "button", class: "ghost dx-hint", text: "Pista" }) : null,
        solve = el("button", {
          type: "button",
          class: "ghost dx-solve",
          text: "Ver la solución explicada",
          hidden: true,
        });
      box.append(
        el(
          "div",
          { class: "dx-qhead" },
          it.tipo ? el("span", { class: "dx-tag dx-tag-" + it.tipo, text: TAG[it.tipo] || it.tipo }) : null,
          el("h3", { text: `${pos + 1}. ${it.q}` }),
        ),
        confField(`${key}-c${qi}`, (v) => (st.conf = v)),
        optsBox,
        el("div", { class: "dx-help rot-buttons" }, hint, solve),
        fb,
      );
      order(it.o.length, hash(it.id || it.q)).forEach((oi) => {
        const [label, why] = it.o[oi],
          b = el("button", { type: "button", "data-correct": String(oi === it.a), text: label });
        b.addEventListener("click", () => {
          if (st.solved) return;
          st.attempts++;
          const ok = oi === it.a;
          if (st.first === null) {
            st.first = { ok, conf: st.conf, choice: oi };
            remember(it, ok);
          }
          b.className = ok ? "answer-correct" : "answer-wrong";
          b.setAttribute("aria-pressed", "true");
          fb.className = "feedback " + (ok ? "answer-correct" : "answer-wrong");
          if (ok) {
            st.solved = true;
            fb.textContent = "Correcto. " + stripCorrect(why);
            optsBox.querySelectorAll("button").forEach((x) => (x.disabled = x !== b));
            solve.hidden = true;
            if (hint) hint.hidden = true;
          } else {
            fb.textContent =
              "Todavía no. " +
              why +
              (st.attempts === 1 && hint ? " Si quieres, pide una pista." : " Prueba otra opción.");
            b.disabled = true;
            if (st.attempts >= 2) solve.hidden = false;
          }
          update();
        });
        optsBox.append(b);
      });
      if (hint)
        hint.addEventListener("click", () => {
          hint.disabled = true;
          fb.className = "feedback dx-hint-text";
          fb.textContent = "Pista: " + it.pista;
          solve.hidden = false;
        });
      solve.addEventListener("click", () => {
        const right = optsBox.querySelector('[data-correct="true"]');
        if (st.first === null) {
          st.first = { ok: false, conf: st.conf, choice: null };
          remember(it, false);
        }
        st.solved = true;
        right.className = "answer-correct";
        optsBox.querySelectorAll("button").forEach((x) => (x.disabled = x !== right));
        fb.className = "feedback answer-correct";
        fb.textContent = "Solución: " + quote(it.o[it.a][0]) + ". " + stripCorrect(it.o[it.a][1]);
        solve.hidden = true;
        if (hint) hint.hidden = true;
        update();
      });
      return box;
    }
    function update() {
      const done = results.filter((r) => r.first);
      if (!done.length) return;
      summary.hidden = false;
      if (done.length < items.length) {
        summary.textContent = `Has respondido ${done.length} de ${items.length}. Al terminar verás tu calibración.`;
        return;
      }
      const hits = done.filter((r) => r.first.ok).length,
        sure = done.filter((r) => r.first.conf === "seguro"),
        sureWrong = sure.filter((r) => !r.first.ok).length,
        guessRight = done.filter((r) => r.first.conf === "adivino" && r.first.ok).length,
        transfer = items.map((it, i) => [it, results[i]]).filter(([it]) => it.tipo === "transferencia"),
        transferHits = transfer.filter(([, r]) => r.first.ok).length;
      summary.textContent =
        `Primer intento: ${hits} de ${items.length} correctas` +
        (transfer.length ? ` (transferencia: ${transferHits} de ${transfer.length})` : "") +
        ". " +
        (sure.length
          ? `Marcaste «seguro» en ${sure.length} y fallaste ${sureWrong}. `
          : "No marcaste ninguna como «seguro». ") +
        (guessRight ? `Acertaste ${guessRight} adivinando: repásalas. ` : "") +
        (sureWrong
          ? "Los errores con seguridad alta señalan ideas previas que conviene revisar."
          : "Tu seguridad y tus aciertos van bastante de la mano.");
      tools.hidden = false;
      retry.hidden = !results.some((r) => !r.first.ok);
    }
    const retry = el("button", {
      type: "button",
      class: "ghost",
      text: "Repetir las que fallé",
      onclick: () => {
        const failed = results.map((r, i) => (!r.first.ok ? i : -1)).filter((i) => i >= 0);
        failed.forEach((i) => Object.assign(results[i], { first: null, attempts: 0, solved: false, conf: null }));
        render(failed);
        summary.textContent = "Repite las preguntas falladas. Elige otra vez tu seguridad antes de responder.";
        tools.hidden = true;
        list.scrollIntoView({ block: "start" });
      },
    });
    const code = el("input", {
      type: "text",
      maxlength: 24,
      placeholder: "Código opcional (no tu nombre)",
      "aria-label": "Código opcional para el docente",
    });
    tools.append(
      retry,
      code,
      el("button", {
        type: "button",
        class: "ghost",
        text: "Descargar mis resultados (CSV)",
        onclick: () => exportCSV(key, code.value),
      }),
      opts.review === false
        ? null
        : el("a", { href: "repaso.html#" + module, class: "home-link", text: "Repaso espaciado →" }),
    );
    host.replaceChildren(list, summary, tools);
    render(items.map((_, i) => i));
  }
  // Cola de repaso: las preguntas falladas al primer intento se guardan para repasarlas otro día.
  function remember(it, ok) {
    if (!it.id) return;
    const q = store.get("repaso", {});
    if (ok) delete q[it.id];
    else q[it.id] = { date: new Date().toISOString().slice(0, 10) };
    store.set("repaso", q);
  }
  function exportCSV(key, code) {
    const s = state.quizzes[key];
    if (!s) return;
    const clean = String(code || "")
        .replace(/[^\w-]/g, "")
        .slice(0, 24),
      rows = [["codigo", "modulo", "pregunta", "tipo", "acierto_primer_intento", "intentos", "seguridad", "fecha"]];
    s.items.forEach((it, i) => {
      const r = s.results[i];
      if (!r.first) return;
      rows.push([
        clean,
        s.module,
        it.id || i + 1,
        it.tipo || "",
        r.first.ok ? 1 : 0,
        r.attempts,
        r.first.conf || "sin indicar",
        new Date().toISOString().slice(0, 10),
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"),
      a = el("a", {
        href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })),
        download: `resultados-${s.module}.csv`,
      });
    doc.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  // ---------- Predecir antes de ver un resultado ----------
  // config: { id, anchor, hide: [elementos], prompt, kind: "number" | "choice", options, value(), tolerance,
  //           format(x), explain(pred, actual) }
  function gate(cfg) {
    const anchor = cfg.anchor,
      hide = (cfg.hide || []).filter(Boolean),
      // conceal: elementos lejos del recuadro que darían la respuesta; se ocultan del todo (no se difuminan)
      // para no dejar un bloque borroso sin explicación en otra parte de la página.
      conceal = (cfg.conceal || []).filter(Boolean);
    if (!anchor || !hide.length) return;
    const veil = (on) => {
      hide.forEach((h) => {
        h.classList.toggle("dx-veiled", on);
        if (on) h.setAttribute("aria-hidden", "true");
        else h.removeAttribute("aria-hidden");
      });
      conceal.forEach((h) => (h.hidden = on));
    };
    const input =
        cfg.kind === "choice"
          ? el(
              "select",
              { "aria-label": cfg.prompt },
              el("option", { value: "", text: "Elige…" }),
              cfg.options.map((o) => el("option", { value: o, text: o })),
            )
          : el("input", { type: "text", inputmode: "decimal", autocomplete: "off", "aria-label": cfg.prompt }),
      fb = el("p", { class: "hint", role: "status", "aria-live": "polite" }),
      box = el(
        "div",
        { class: "dx-gate" },
        el("p", {}, el("strong", { text: "Predice antes de ver: " }), cfg.prompt),
        el(
          "div",
          { class: "dx-gate-row" },
          input,
          el("button", { type: "button", text: "Comprobar", onclick: check }),
          el("button", { type: "button", class: "ghost", text: "Ver sin predecir", onclick: () => reveal(null) }),
        ),
        fb,
      );
    function parse(v) {
      const t = String(v).trim();
      // Admite coma decimal y el signo menos tipográfico (−) que usan los resultados.
      return cfg.kind === "choice" ? v : t === "" ? NaN : Number(t.replace(",", ".").replace(/^[−–]/, "-"));
    }
    function check() {
      const pred = parse(input.value);
      if (cfg.kind === "choice" ? !pred : !Number.isFinite(pred)) {
        fb.textContent = cfg.kind === "choice" ? "Elige una opción." : "Escribe un número (puedes usar coma decimal).";
        return;
      }
      reveal(pred);
    }
    function reveal(pred) {
      veil(false);
      const actual = cfg.value(),
        fmt =
          cfg.format || ((x) => (typeof x === "number" ? x.toLocaleString("es-ES", { maximumFractionDigits: 3 }) : x));
      if (pred === null) {
        fb.textContent =
          "Resultado visible. La próxima vez intenta predecir primero: equivocarse en la predicción ayuda a fijarse en lo importante.";
      } else {
        const ok = cfg.kind === "choice" ? pred === actual : Math.abs(pred - actual) <= (cfg.tolerance ?? 0);
        fb.className = "feedback " + (ok ? "answer-correct" : "answer-wrong");
        fb.textContent =
          `Predijiste ${fmt(pred)}; el resultado es ${fmt(actual)}. ` +
          (ok ? "¡Bien! " : "") +
          (cfg.explain ? cfg.explain(pred, actual, ok) : "");
      }
      row.querySelectorAll("input,select,button").forEach((x) => (x.disabled = x !== again));
      again.hidden = false;
      if (cfg.onReveal) cfg.onReveal();
    }
    // Volver a predecir: tras cambiar los parámetros, el estudiante puede ocultar otra vez el resultado.
    function retry() {
      veil(true);
      row.querySelectorAll("input,select,button").forEach((x) => (x.disabled = false));
      input.value = "";
      fb.className = "hint";
      fb.textContent = "Resultado oculto. Cambia los parámetros si quieres y predice de nuevo.";
      again.hidden = true;
      input.focus();
    }
    const row = box.querySelector(".dx-gate-row"),
      again = el("button", {
        type: "button",
        class: "ghost dx-again",
        text: "Volver a predecir",
        hidden: true,
        onclick: retry,
      });
    row.append(again);
    veil(true);
    anchor.before(box);
    return { reveal, retry };
  }

  // ---------- Autoexplicación y paginación ----------
  function wire() {
    doc.querySelectorAll("[data-autoexp]").forEach((box) => {
      if (box.dataset.wired) return;
      box.dataset.wired = "1";
      const ta = box.querySelector("textarea"),
        btn = box.querySelector("button"),
        model = box.querySelector(".dx-model"),
        hint = el("p", { class: "hint", role: "status" });
      btn.after(hint);
      btn.addEventListener("click", () => {
        if (ta.value.trim().length < 20) {
          hint.textContent = "Escribe primero tu explicación (al menos una frase); después compárala con el modelo.";
          ta.focus();
          return;
        }
        hint.textContent = "Compara: ¿qué ideas del modelo aparecen en tu respuesta y cuáles faltan?";
        model.hidden = false;
      });
    });
    doc.querySelectorAll("[role=tablist][data-pager]").forEach((list) => {
      if (list.dataset.wired) return;
      list.dataset.wired = "1";
      const tabs = [...list.querySelectorAll("[role=tab]")];
      tabs.forEach((t, i) => {
        const panel = doc.getElementById(t.getAttribute("aria-controls") || t.dataset.panel);
        if (!panel) return;
        const go = (j) => () => {
          tabs[j].click();
          list.scrollIntoView({ block: "start" });
          tabs[j].focus({ preventScroll: true });
        };
        panel.append(
          el(
            "nav",
            { class: "dx-pager", "aria-label": "Avanzar o retroceder" },
            i > 0
              ? el("button", {
                  type: "button",
                  class: "ghost",
                  text: "← " + tabs[i - 1].textContent.trim(),
                  onclick: go(i - 1),
                })
              : el("span"),
            el("span", { class: "dx-pager-pos", text: `Apartado ${i + 1} de ${tabs.length}` }),
            i < tabs.length - 1
              ? el("button", { type: "button", text: tabs[i + 1].textContent.trim() + " →", onclick: go(i + 1) })
              : el("span"),
          ),
        );
      });
    });
  }

  // Inicialización declarativa: [data-predict], [data-predcheck], [data-quiz].
  function init() {
    doc.querySelectorAll("[data-predict]").forEach((h) => predictions(h, h.dataset.predict));
    doc.querySelectorAll("[data-predcheck]").forEach((h) => checkPredictions(h, h.dataset.predcheck));
    doc.querySelectorAll("[data-quiz]").forEach((h) => quiz(h, h.dataset.quiz, { module: h.dataset.module }));
    wire();
  }
  root.Didactica = { predictions, checkPredictions, quiz, gate, wire, init, store, state };
  if (doc) {
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
    else init();
  }
})(globalThis);
