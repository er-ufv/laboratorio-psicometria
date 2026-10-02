/* Repaso espaciado: reúne preguntas de todos los módulos y prioriza las falladas. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    P = globalThis.Preguntas,
    N = globalThis.ModulosPreguntas,
    D = globalThis.Didactica;
  const all = Object.entries(P).flatMap(([mod, list]) => list.map((q) => Object.assign({ mod }, q)));
  const sel = $("review-module");
  sel.append(new Option("Todos", "all"), ...Object.entries(N).map(([k, label]) => new Option(label, k)));
  // Enlaces desde un módulo: repaso.html#tct preselecciona ese módulo.
  function fromHash() {
    const hash = location.hash.slice(1),
      key = N[hash] ? hash : Object.keys(N).find((k) => hash && k.startsWith(hash));
    if (key) sel.value = key;
  }
  fromHash();
  addEventListener("hashchange", fromHash);
  function pending() {
    return D.store.get("repaso", {});
  }
  function status() {
    const q = pending(),
      ids = Object.keys(q),
      days = ids.map((id) => q[id].date).sort();
    $("review-status").textContent = ids.length
      ? `Tienes ${ids.length} ${ids.length === 1 ? "pregunta fallada guardada" : "preguntas falladas guardadas"} (la más antigua, del ${days[0]}).`
      : "No hay preguntas falladas guardadas en este navegador: se repasará una mezcla.";
  }
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }
  $("review-start").addEventListener("click", () => {
    const mod = sel.value,
      count = +$("review-count").value,
      pool = all.filter((q) => mod === "all" || q.mod === mod),
      failed = pending();
    let items = $("review-mode").value === "failed" ? shuffle(pool.filter((q) => failed[q.id])) : [];
    // Completa con preguntas nuevas, priorizando aplicación y transferencia.
    const rest = shuffle(pool.filter((q) => !items.includes(q))).sort(
      (a, b) => (b.tipo === "recuerdo" ? 0 : 1) - (a.tipo === "recuerdo" ? 0 : 1),
    );
    items = items.concat(rest).slice(0, count);
    D.quiz($("review-quiz"), "repaso", { items, module: "repaso", review: false });
    status();
    $("review-quiz").scrollIntoView({ block: "start" });
  });
  status();
})();
