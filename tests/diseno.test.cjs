const assert = require("node:assert/strict");
require("../assets/js/modules/diseno/data.js");
const S = require("../assets/js/core/state.js");
const D = globalThis.DesignData;
assert.deepEqual(S.review([], 9), { done: 0, total: 9, percent: 0 });
assert.deepEqual(S.review(Array(9).fill(true), 9), { done: 9, total: 9, percent: 100 });
assert.deepEqual(S.review([true, true], 9), { done: 2, total: 9, percent: 22 });
assert.equal(S.review([true, true, true], 2).done, 2);
assert.equal(S.review([], 0).percent, 0);
assert.equal(S.load({ getItem: () => "{invalido" }).error, true);
assert.equal(
  S.save(
    {
      setItem: () => {
        throw Error("sin espacio");
      },
    },
    {},
  ),
  false,
);
assert.equal(S.load(null).error, true);
const state = S.normalize({
  version: 1,
  active: "optimo",
  drafts: {
    tipico: { construct: "A", checks: [true, 1] },
    optimo: { item: "B", categories: 8, options: ["A", "B", "C"], key: 7 },
  },
});
assert.equal(state.drafts.tipico.construct, "A");
assert.equal(state.drafts.optimo.item, "B");
assert.equal(state.drafts.tipico.checks[1], false);
assert.equal(state.drafts.optimo.categories, 5);
assert.equal(state.drafts.optimo.key, 0);
assert.equal(state.drafts.optimo.checks.length, D.types.optimo.checks.length);
let stored;
assert.equal(S.save({ setItem: (_, v) => (stored = v) }, state), true);
assert.deepEqual(S.load({ getItem: () => stored }).state, state);
for (const type of Object.values(D.types)) {
  assert.equal(type.examples.length, 6);
  assert.equal(type.steps.length, 3);
  for (const e of type.examples) assert.ok(D.sources.some((s) => s.id === e.source));
}
// Opciones: de 3 a 5; la clave debe señalar una opción existente.
const five = S.sanitize({ options: ["a", "b", "c", "d", "e"], key: 4 }, 10);
assert.equal(five.options.length, 5);
assert.equal(five.key, 4);
assert.deepEqual(S.sanitize({ options: Array(6).fill("x"), key: 5 }, 10).options, ["", "", ""]);
assert.equal(S.sanitize({ options: ["a", "b", "c"], key: 3 }, 10).key, 0);
assert.equal(S.sanitize({ options: ["a", 7, "c", "d"], key: 1 }, 10).options[1], "");
// Importación: mismo saneamiento que el almacenamiento local.
const report = (draft, extra = {}) => JSON.stringify({ version: 1, module: "diseno", type: "optimo", draft, ...extra });
const ok = S.parseReport(
  report({ construct: "<b>X</b>", item: "Y", options: ["1", "2", "3", "4"], key: 3, checks: [true, false] }),
);
assert.equal(ok.type, "optimo");
assert.equal(ok.draft.construct, "<b>X</b>");
assert.equal(ok.draft.key, 3);
assert.equal(ok.draft.checks.length, D.types.optimo.checks.length);
assert.equal(ok.adjusted, true);
const exact = S.parseReport(
  report({
    ...S.blank(),
    item: "Z",
    options: ["1", "2", "3"],
    checks: Array(D.types.optimo.checks.length).fill(false),
  }),
);
assert.equal(exact.adjusted, false);
assert.equal(S.parseReport(report({ construct: "x".repeat(400) })).draft.construct.length, 300);
assert.equal(S.parseReport(report({ construct: "x".repeat(400) })).adjusted, true);
assert.match(S.parseReport("{roto").error, /JSON/);
assert.match(S.parseReport("").error, /vacío/);
assert.match(S.parseReport("[]").error, /diseno/);
assert.match(S.parseReport(report({}, { module: "tri" })).error, /diseno/);
assert.match(S.parseReport(report({}, { type: "mixto" })).error, /tipo/);
assert.match(S.parseReport(report(null)).error, /borrador/);
assert.match(S.parseReport(" ".repeat(S.MAX_IMPORT_CHARS + 1) + "{}").error, /grande/);
console.log(
  "OK: progreso, bordes, almacenamiento fallido, saneamiento, 3–5 opciones, importación validada, independencia de borradores, persistencia y referencias.",
);
