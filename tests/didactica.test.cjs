// Componentes didácticos comunes: objetivo visible, predicciones, «predice antes de ver», paginación,
// autoexplicación, cuestionario con escalera de ayudas, calibración, CSV, cola de repaso y página de repaso.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const url = (n) => "file:///" + path.resolve(__dirname, "..", n).replace(/\\/g, "/");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true }),
      p = await ctx.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url("tct.html"));
    await p.evaluate(() => localStorage.clear());
    await p.reload();

    // A. Objetivo visible y cierre con ideas clave y guía docente.
    assert.ok((await p.locator(".dx-start .dx-goals li").count()) >= 2, "objetivos observables al inicio");
    assert.ok(await p.locator(".dx-closing").count(), "cierre con ideas clave");
    assert.ok(await p.locator(".dx-teacher").count(), "guía para el docente");

    // B. Predicciones iniciales sin nota, guardadas y comprobadas al final.
    const form = p.locator('[data-predict="tct"] form.dx-predict');
    const sets = form.locator("fieldset:not(.dx-conf)");
    for (let i = 0; i < (await sets.count()); i++) await sets.nth(i).locator("input").first().check();
    await form.locator('.dx-conf input[value="seguro"]').check();
    await form.locator('button[type="submit"]').click();
    assert.match(await form.locator('[role="status"]').innerText(), /Predicciones guardadas/);
    await p.locator('[data-predcheck="tct"] button').click();
    assert.match(
      await p.locator('[data-predcheck="tct"] .dx-predcheck').innerText(),
      /Acertaste \d+ de \d+, respondiendo con seguridad/,
    );

    // D. Predecir antes de ver: el resultado está velado hasta que se predice (o se elige verlo sin predecir).
    await p.locator("#tab-longitud").click();
    const veiled = () => p.locator("#length-result").evaluate((e) => !!e.closest(".dx-veiled"));
    assert.equal(await veiled(), true, "Spearman–Brown oculto antes de predecir");
    const gate = p.locator("#longitud .dx-gate");
    await gate.locator("button", { hasText: "Comprobar" }).click();
    assert.match(await gate.locator('[role="status"]').innerText(), /Escribe un número/);
    assert.equal(await veiled(), true);
    const actual = await p.locator("#length-result").textContent();
    await gate.locator("input").fill(actual.trim());
    await gate.locator("button", { hasText: "Comprobar" }).click();
    assert.equal(await veiled(), false);
    assert.match(await gate.locator('[role="status"]').innerText(), /^Predijiste .*¡Bien!/);
    await gate.locator(".dx-again").click();
    assert.equal(await veiled(), true, "se puede volver a predecir tras cambiar parámetros");
    await gate.locator("button", { hasText: "Ver sin predecir" }).click();
    assert.equal(await veiled(), false);

    // C. Paginación: avanzar y retroceder entre apartados sin buscar las pestañas.
    await p.locator("#tab-modelo").click();
    await p.locator("#modelo .dx-pager button").last().click();
    assert.equal(await p.locator("#tab-modelo").getAttribute("aria-selected"), "false");
    assert.match(
      await p.locator('[role="tabpanel"]:not([hidden]) .dx-pager-pos').first().innerText(),
      /Apartado 2 de \d/,
    );

    // H. Autoexplicación: el modelo solo aparece después de escribir un intento.
    const auto = p.locator("[data-autoexp]");
    await auto.locator("button").click();
    assert.equal(await auto.locator(".dx-model").isVisible(), false, "pide un intento antes del modelo");
    await auto
      .locator("textarea")
      .fill("Porque la fiabilidad es una proporción y crece con rendimientos decrecientes.");
    await auto.locator("button").click();
    assert.equal(await auto.locator(".dx-model").isVisible(), true);

    // F–H. Cuestionario: error sin revelar, pista y solución; calibración, CSV y cola de repaso.
    const qs = p.locator("#tct-quiz .dx-q"),
      n = await qs.count(),
      firstId = await qs.first().getAttribute("data-qid");
    assert.ok(n >= 6, "suficientes preguntas");
    assert.ok(await p.locator("#tct-quiz .dx-tag-transferencia").count(), "al menos una de transferencia");
    for (let i = 0; i < n; i++) {
      const q = qs.nth(i);
      await q.locator('.dx-conf input[value="seguro"]').check();
      if (i === 0) {
        const wrong = q.locator('.dx-opts button[data-correct="false"]');
        await wrong.nth(0).click();
        assert.match(await q.locator(".feedback").innerText(), /^Todavía no\./);
        assert.equal(await q.locator("button.answer-correct").count(), 0);
        await wrong.nth(1).click();
        assert.equal(await q.locator(".dx-solve").isVisible(), true, "tras dos errores se ofrece la solución");
        await q.locator(".dx-solve").click();
        assert.match(await q.locator(".feedback").innerText(), /^Solución: «/);
      } else await q.locator('.dx-opts button[data-correct="true"]').click();
    }
    const summary = await p.locator("#tct-quiz .dx-summary").innerText();
    assert.match(summary, new RegExp(`Primer intento: ${n - 1} de ${n} correctas`));
    assert.match(summary, /Marcaste «seguro» en \d+ y fallaste 1/);
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem("psicometria.v1.repaso") || "{}"));
    assert.deepEqual(Object.keys(stored), [firstId], "la fallada queda en la cola de repaso");
    await p.locator("#tct-quiz .dx-tools input").fill("Grupo A-1 <b>");
    const [download] = await Promise.all([
      p.waitForEvent("download"),
      p.locator("#tct-quiz .dx-tools button", { hasText: "CSV" }).click(),
    ]);
    assert.equal(download.suggestedFilename(), "resultados-tct.csv");
    const csv = fs.readFileSync(await download.path(), "utf8").split("\n");
    assert.equal(csv[0], '"codigo","modulo","pregunta","tipo","acierto_primer_intento","intentos","seguridad","fecha"');
    assert.equal(csv.length, n + 1);
    assert.match(csv[1], new RegExp(`^"GrupoA-1b","tct","${firstId}",".*","0","2","seguro"`));
    await p.locator("#tct-quiz .dx-tools button", { hasText: "Repetir" }).click();
    assert.equal(await p.locator("#tct-quiz .dx-q").count(), 1, "repetir solo las falladas");

    // G. Repaso espaciado: prioriza las falladas guardadas y acepta enlaces con módulo (#tct, #analisis).
    await p.goto(url("repaso.html#tct"));
    assert.equal(await p.locator("#review-module").inputValue(), "tct");
    assert.match(await p.locator("#review-status").innerText(), /Tienes 1 pregunta fallada guardada/);
    await p.selectOption("#review-count", "6");
    await p.click("#review-start");
    const rq = p.locator("#review-quiz .dx-q");
    assert.equal(await rq.count(), 6);
    assert.equal(await rq.first().getAttribute("data-qid"), firstId, "la fallada aparece primero");
    assert.equal(await p.locator('#review-quiz a[href="repaso.html"]').count(), 0);
    await rq.first().locator('.dx-opts button[data-correct="true"]').click();
    assert.deepEqual(
      await p.evaluate(() => JSON.parse(localStorage.getItem("psicometria.v1.repaso"))),
      {},
      "acertada en el repaso, sale de la cola",
    );
    await p.goto(url("repaso.html#analisis"));
    assert.equal(await p.locator("#review-module").inputValue(), "analisis_dif");
    assert.ok(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      "repaso sin desbordamiento",
    );

    // D en otros módulos: cada simulador vela su resultado clave.
    for (const [file, target, prepare] of [
      ["tri.html", "#d-maxinfo", null],
      ["afe.html", "#parallel-summary", '[data-panel="numero"]'],
      ["afc.html", "#cfa-df", '[data-panel="cfa-modelos"]'],
    ]) {
      await p.goto(url(file));
      if (prepare) await p.locator(prepare).click();
      const isVeiled = () => p.locator(target).evaluate((e) => !!e.closest(".dx-veiled"));
      assert.equal(await isVeiled(), true, file + ": resultado oculto antes de predecir");
      const g = p.locator(".dx-gate").first();
      if (file === "afc.html") {
        const df = await p.locator(target).evaluate((e) => (e.textContent.match(/= (\d+)\./) || [])[1]);
        await g.locator("input").fill(df);
        await g.locator("button", { hasText: "Comprobar" }).click();
        assert.match(await g.locator('[role="status"]').getAttribute("class"), /answer-correct/);
      } else await g.locator("button", { hasText: "Ver sin predecir" }).click();
      assert.equal(await isVeiled(), false, file + ": se muestra tras predecir");
    }

    // E/D en Diseño: el ejemplo pide un intento antes de abrir la propuesta.
    await p.goto(url("index.html"));
    const ex = p.locator("#example-list .example").first(),
      det = ex.locator("details");
    await det.locator("summary").click();
    assert.equal(await det.evaluate((d) => d.open), false, "no se abre sin intento");
    assert.match(await ex.locator(".example-try .hint").innerText(), /Escribe primero/);
    await det.locator("summary").click();
    assert.equal(await det.evaluate((d) => d.open), true, "segundo clic: se puede ver sin escribir");
    const ex2 = p.locator("#example-list .example").nth(1);
    await ex2.locator("textarea").fill("Pregunta dos cosas a la vez");
    await ex2.locator("summary").click();
    assert.equal(await ex2.locator("details").evaluate((d) => d.open), true);
    await ex2.locator(".example-try .hint", { hasText: "Compara tu versión" }).waitFor({ timeout: 3000 });
    assert.deepEqual(errors, []);
    await ctx.close();

    // Sin almacenamiento (modo privado estricto): todo funciona, solo no se recuerda.
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } }),
      p2 = await ctx2.newPage(),
      errors2 = [];
    await ctx2.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("bloqueado", "SecurityError");
        },
      }),
    );
    p2.on("pageerror", (e) => errors2.push(e.message));
    for (const file of ["tct.html", "repaso.html"]) {
      await p2.goto(url(file));
      if (file === "repaso.html") await p2.click("#review-start");
      const q = p2.locator(".dx-q").first();
      await q.locator('.dx-opts button[data-correct="false"]').first().click();
      assert.match(await q.locator(".feedback").innerText(), /^Todavía no\./, file + " sin almacenamiento");
    }
    assert.deepEqual(errors2, []);
    await ctx2.close();
    console.log(
      "OK: objetivos y cierre, predicciones guardadas y comprobadas, predecir antes de ver (TCT, TRI, AFE, AFC) con reintento, paginación, autoexplicación, escalera pista → solución, calibración, CSV seudónimo, repetir falladas, cola y página de repaso, ejemplo de Diseño con intento previo y funcionamiento sin almacenamiento.",
    );
  } finally {
    await browser.close();
  }
})();
