// Discriminación en elección múltiple: JS frente a R/psych (fixture de tests/analisis-discriminacion-reference.R).
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const M = require("../assets/js/modules/analisis/math.js");
const near = (a, b, tol = 1e-12) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
const ex = M.MC_EXAMPLE,
  res = M.analyzeMultipleChoice(
    ex.responses.map((r) => [...r]),
    [...ex.key],
  );
const values = { alpha: res.alpha, upper_n: res.groups.upper.length, lower_n: res.groups.lower.length };
res.items.forEach((it, i) => {
  const j = i + 1;
  Object.assign(values, { ["p_" + j]: it.p, ["D_" + j]: it.D, ["rbp_" + j]: it.rbp, ["rrest_" + j]: it.rRest });
  for (const o of it.options) {
    values[`opt_${j}_${o.option}`] = o.total;
    values[`up_${j}_${o.option}`] = o.upper;
    values[`lo_${j}_${o.option}`] = o.lower;
  }
  // r_bp con la fórmula clásica coincide con Pearson ítem 0/1–total.
  near(
    it.rbp,
    M.pearson(
      res.scored.map((r) => r[i]),
      res.totals,
    ),
  );
});
let count = 0,
  max = 0;
const fixture = fs.readFileSync(path.join(__dirname, "fixtures/analisis-discriminacion-r.csv"), "utf8");
for (const line of fixture.trim().split(/\r?\n/).slice(1)) {
  const [key, expected] = line.replaceAll('"', "").split(",");
  assert.ok(key in values, "Falta " + key);
  near(values[key], Number(expected));
  max = Math.max(max, Math.abs(values[key] - Number(expected)));
  count++;
}
// Casos didácticos que el panel debe mostrar.
assert.equal(M.optionDiagnosis(res.items[2].options.find((o) => o.option === "C")), "upper");
assert.equal(M.optionDiagnosis(res.items[2].options.find((o) => o.isKey)), "key-review");
assert.equal(M.optionDiagnosis(res.items[3].options.find((o) => o.option === "D")), "never");
assert.equal(M.optionDiagnosis(res.items[0].options.find((o) => o.isKey)), "key-ok");
// Bordes: empates en el corte, grupos inseparables, ítem constante, omisiones y datos no válidos.
const tied = M.extremeGroups([5, 5, 5, 4, 3, 2, 1, 1, 1, 0]);
assert.equal(tied.size, 3);
assert.deepEqual(tied.upper, [0, 1, 2]);
assert.deepEqual(M.extremeGroups([4, 4, 4, 3, 3, 2, 1, 0]).upper, [0, 1, 2]);
assert.equal(M.extremeGroups([2, 2, 2, 2, 2]), null);
assert.equal(M.extremeGroups([1, 2, 3]), null);
assert.ok(Number.isNaN(M.pointBiserial([1, 1, 1, 1], [1, 2, 3, 4])));
assert.ok(Number.isNaN(M.pointBiserial([0, 1, 2, 1], [1, 2, 3, 4])));
const omit = M.analyzeMultipleChoice(
  [
    ["A", ""],
    ["A", "B"],
    ["B", "B"],
    ["C", "A"],
    ["A", "B"],
  ],
  ["A", "B"],
);
assert.equal(omit.scored[0][1], 0);
assert.ok(omit.items[1].options.some((o) => o.option === "" && o.count === 1));
assert.equal(M.optionDiagnosis(omit.items[1].options.find((o) => o.option === "")), "omission");
assert.equal(M.analyzeMultipleChoice([["E"], ["A"], ["B"], ["C"]], ["A"]), null);
assert.equal(M.analyzeMultipleChoice([["A"], ["A"], ["B"], ["C"]], ["Z"]), null);
assert.equal(M.analyzeMultipleChoice([["A"], ["B"]], ["A"]), null);
console.log(
  `OK: discriminación en elección múltiple (p, D 27 %, r_bp, ítem-resto, distractores, alfa); ${count} valores JS = R/psych. Error máximo ${max}.`,
);
