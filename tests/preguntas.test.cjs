// Calidad de las preguntas (assets/js/core/preguntas.js) con las pautas que enseña el Módulo 1.
const assert = require("node:assert/strict");
require("../assets/js/core/preguntas.js");
const P = globalThis.Preguntas,
  PR = globalThis.Predicciones,
  N = globalThis.ModulosPreguntas,
  TIPOS = ["recuerdo", "aplicacion", "transferencia"],
  ids = new Set();
let n = 0;
for (const [mod, list] of Object.entries(P)) {
  assert.ok(N[mod], "etiqueta de módulo para " + mod);
  assert.ok(list.length >= 4, mod + ": al menos cuatro preguntas");
  assert.ok(
    list.some((q) => q.tipo === "transferencia"),
    mod + ": al menos una de transferencia",
  );
  for (const q of list) {
    n++;
    assert.ok(q.id && !ids.has(q.id), "identificador único: " + q.id);
    ids.add(q.id);
    assert.ok(TIPOS.includes(q.tipo), q.id + ": tipo válido");
    assert.ok(q.o.length >= 3, q.id + ": al menos tres opciones (con dos, el azar acierta la mitad)");
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.o.length, q.id + ": respuesta válida");
    q.o.forEach(([text, why], i) => {
      assert.ok(text && why, q.id + ": cada opción tiene texto y explicación");
      assert.equal(/^Correcto/.test(why), i === q.a, q.id + ": solo la correcta empieza por «Correcto»");
      assert.ok(!/^(todas|ninguna) las anteriores/i.test(text), q.id + ": sin «todas/ninguna de las anteriores»");
    });
    const len = q.o.map(([t]) => t.length),
      best = Math.max(...len.filter((_, i) => i !== q.a));
    assert.ok(len[q.a] / best <= 1.3, q.id + ": la correcta no destaca por su longitud");
    if (q.pista) assert.ok(q.pista.length > 10, q.id + ": pista informativa");
  }
}
for (const [mod, list] of Object.entries(PR)) {
  assert.ok(list.length >= 2, mod + ": predicciones iniciales");
  for (const q of list) assert.ok(q.o[q.a] && q.o.every(([t, w]) => t && w), mod + ": predicción completa");
}
const longest = Object.values(P)
  .flat()
  .filter((q) => {
    const len = q.o.map(([t]) => t.length);
    return len[q.a] === Math.max(...len) && len.filter((l) => l === len[q.a]).length === 1;
  }).length;
assert.ok(longest / n < 0.5, "la correcta no es la más larga en la mayoría");
console.log(
  `OK: ${n} preguntas en ${Object.keys(P).length} cuestionarios; identificadores únicos, tipos, ≥ 3 opciones con explicación, transferencia en todos, correcta más larga en ${longest} de ${n}; predicciones completas.`,
);
