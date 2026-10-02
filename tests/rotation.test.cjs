// node tests/rotation.test.cjs — contraste del motor de rotación con R (stats, GPArotation, psych).
const assert = require("node:assert/strict"),
  path = require("node:path"),
  R = require("../assets/js/modules/factor/rotation.js"),
  ref = require("./fixtures/rotation-r.json");
require("../assets/js/modules/factor/examples.js");
const D = globalThis.FactorExamples;
const maxDiff = (A, B) =>
  Math.max(...A.flatMap((r, i) => (Array.isArray(r) ? r.map((x, j) => Math.abs(x - B[i][j])) : [Math.abs(r - B[i])])));
let worst = 0,
  count = 0;
const check = (a, b, tol, label) => {
  const d = maxDiff(a, b);
  worst = Math.max(worst, d);
  count += Array.isArray(a[0]) ? a.length * a[0].length : a.length;
  assert.ok(d < tol, label + " diferencia " + d);
};
// 1. Las 72 rotaciones de psych::fa del bundle (Varimax, Oblimin, Promax) desde la solución sin rotar.
let fromBundle = 0;
for (const [key, e] of Object.entries(D.entries))
  for (const k of [2, 3])
    for (const m of ["uls", "pa", "ml"]) {
      const base = e.solutions[`${k}_${m}_none`];
      for (const rot of ["varimax", "oblimin", "promax"]) {
        const want = e.solutions[`${k}_${m}_${rot}`],
          got = R.rotate(base.pattern, rot);
        check(got.pattern, want.pattern, 1e-9, `${key} ${k} ${m} ${rot} patrón`);
        check(got.phi, want.phi, 1e-9, `${key} ${k} ${m} ${rot} Φ`);
        check(got.structure, want.structure, 1e-9, `${key} ${k} ${m} ${rot} estructura`);
        check(got.h2, want.h2, 1e-9, `${key} ${k} ${m} ${rot} h²`);
        fromBundle++;
      }
    }
// 2. Ocho rotaciones × siete matrices contra GPArotation/psych (incluye quartimax, oblimin γ, geomin, promax κ).
//    Tolerancia 1e-6: GPA se detiene con ‖gradiente proyectado‖ < 1e-5, así que el redondeo puede mover el punto final.
let fromFixture = 0;
for (const [name, c] of Object.entries(ref.cases))
  for (const r of c.results) {
    const got = R.rotate(c.unrotated, r.method, { gamma: r.gamma, kappa: r.kappa, delta: r.delta });
    check(got.pattern, r.pattern, 1e-6, `${name} ${r.method} patrón`);
    check(got.phi, r.phi, 1e-6, `${name} ${r.method} Φ`);
    check(got.h2, r.h2, 1e-9, `${name} ${r.method} h²`);
    check(got.T, r.axes, 1e-6, `${name} ${r.method} ejes`);
    check(got.contribution, r.contribution, 1e-6, `${name} ${r.method} contribución`);
    // Invariancias: comunalidades y matriz común reproducida.
    const A = c.unrotated,
      hA = A.map((row) => row.reduce((s, x) => s + x * x, 0));
    assert.ok(maxDiff(got.h2, hA) < 1e-10, `${name} ${r.method} h² invariante`);
    assert.ok(Math.abs(got.contribution.reduce((s, x) => s + x, 0) - hA.reduce((s, x) => s + x, 0)) < 1e-10);
    fromFixture++;
  }
// 3. Rotación manual y criterios.
const A = ref.cases.preset_relacionados.unrotated;
for (const m of ref.manual) {
  const got = R.manual(A, m.angles);
  check(got.pattern, m.pattern, 1e-12, "manual patrón");
  check(got.structure, m.structure, 1e-12, "manual estructura");
  check(got.phi, m.phi, 1e-12, "manual Φ");
  assert.ok(Math.abs(R.varimaxValue(got.pattern) - m.varimax) < 1e-12, "criterio varimax");
  assert.ok(Math.abs(R.quartiminValue(got.pattern) - m.quartimin) < 1e-12, "criterio quartimin");
}
// 4. Población con estructura simple: Oblimin recupera Λ y Φ; Varimax introduce cargas cruzadas.
for (const [name, pr] of Object.entries(ref.presets)) {
  const U = R.principalAxes(pr.pattern, pr.phi);
  check(
    U,
    ref.cases["preset_" + name].unrotated.map((r) => r.map((x, j) => x)),
    1e-9,
    name + " ejes principales",
  );
}
const pr = ref.presets.relacionados,
  U = R.principalAxes(pr.pattern, pr.phi),
  ob = R.rotate(U, "oblimin"),
  vm = R.rotate(U, "varimax");
assert.ok(
  maxDiff(
    ob.pattern.map((r) => r.map(Math.abs)),
    pr.pattern,
  ) < 1e-4 && Math.abs(ob.phi[0][1] - 0.3) < 1e-4,
  "Oblimin recupera la población",
);
assert.ok(
  Math.min(...vm.pattern.map((r) => Math.min(...r.map(Math.abs)))) > 0.05,
  "Varimax deja cargas cruzadas con Φ = 0,30",
);
// 4b. Inicios múltiples: en la población simétrica, stats::varimax (un inicio) se queda en el punto de
//     partida; con varios inicios se alcanza el máximo de V(θ) de una búsqueda densa.
{
  const single = R.rotate(U, "varimax", { order: false }),
    multi = R.rotate(U, "varimax", { order: false, starts: 12 });
  let best = -Infinity;
  for (let a = -90; a <= 90; a += 0.01) best = Math.max(best, R.varimaxValue(R.manual(U, [a, a + 90]).pattern));
  assert.ok(Math.abs(R.varimaxValue(multi.pattern) - best) < 1e-6, "varios inicios alcanzan el máximo de Varimax");
  assert.ok(R.varimaxValue(single.pattern) < best - 0.1 && multi.localOptimum, "el inicio único se detiene y se avisa");
  // En datos reales no hay óptimos locales y la solución coincide con psych (diferencia ≤ 0,02).
  const base = D.entries.continua_pearson.solutions["3_uls_none"].pattern,
    ref3 = D.entries.continua_pearson.solutions["3_uls_oblimin"].pattern,
    rob = R.rotate(base, "oblimin", { starts: 12 });
  assert.ok(!rob.localOptimum && maxDiff(rob.pattern, ref3) < 0.02, "Oblimin robusto = psych en datos reales");
}
// 5. Ángulos de ejes, ejes ortogonales y Φ = cos(ángulo).
const man = R.manual(A, [-20, 50]);
assert.ok(Math.abs(man.phi[0][1] - Math.cos((70 * Math.PI) / 180)) < 1e-12);
assert.deepEqual(
  R.axisAngles(R.axesFromAngles([-20, 50])).map((x) => Math.round(x * 1e9) / 1e9),
  [-20, 50],
);
assert.equal(R.manual(A, [10, 10]), null, "ejes paralelos sin solución");
// 6. Lectura de matrices pegadas.
const pasted = R.parseMatrix("ítem\tF1\tF2\nI1\t0,61\t0,20\nI2\t0,55\t-0,12\nI3\t0,30\t0,50");
assert.deepEqual(pasted.names, ["I1", "I2", "I3"]);
assert.deepEqual(pasted.matrix[1], [0.55, -0.12]);
assert.match(R.parseMatrix("0.9 0.6\n0.2 0.1\n0.3 0.3").error, /h²/);
assert.match(R.parseMatrix("0.5\n0.4\n0.3").error, /entre 2 y 8/);
assert.match(R.parseMatrix("").error, /Pega/);
assert.equal(R.parseMatrix("0.5;0.1\n0.4;0.2\n0.3;0.6").matrix.length, 3);
assert.equal(R.parseMatrix("0,5 0,1\n0,4 0,2\n0,3 0,6").matrix[2][1], 0.6);
console.log(
  `OK: ${fromBundle} rotaciones de psych::fa y ${fromFixture} de GPArotation/psych reproducidas; rotación manual, criterios, invariancias, recuperación poblacional y lectura de matrices. Error máximo ${worst.toExponential(2)} en ${count} valores.`,
);
