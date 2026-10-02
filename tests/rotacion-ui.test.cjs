// node tests/rotacion-ui.test.cjs — laboratorio de rotación en el navegador (escritorio y móvil).
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const num = (s) => Number(String(s).replace(/\./g, "").replace(",", ".").replace("°", ""));
(async () => {
  const b = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  for (const width of [1440, 390]) {
    const p = await b.newPage({ viewport: { width, height: 950 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await p.goto("file:///" + path.resolve(__dirname, "..", "rotacion.html").replace(/\\/g, "/"));
    await p.waitForTimeout(300);
    assert.ok(await p.locator('a.home-link[href="index.html"]').count(), "botón de portada");
    // 01 · Predicciones
    await p.check("input[name=p1][value=a]");
    await p.check("input[name=p2][value=c]");
    await p.check("input[name=pconf][value=seguro]");
    await p.click("#predict-form button[type=submit]");
    assert.equal(await p.locator("#ortogonal").isVisible(), true, "pasa al apartado 02");
    // 02 · h² invariante al girar
    const h2 = async () => (await p.locator("#orth-table tbody tr:first-child td:last-child").innerText()).trim();
    const h0 = await h2();
    await p.fill("#orth-angle", "-25");
    await p.dispatchEvent("#orth-angle", "input");
    assert.equal(await h2(), h0, "h² no cambia con el giro");
    assert.equal(await p.locator("#orth-angle-value").innerText(), "-25°");
    // Teclado sobre el asa del eje
    await p.locator("#orth-plane .handle").first().focus();
    await p.keyboard.press("ArrowUp");
    assert.equal(await p.locator("#orth-angle-value").innerText(), "-24°");
    await p.click("#orth-done");
    assert.equal(await p.locator("#orth-reveal").isVisible(), true);
    assert.match(await p.locator("#orth-feedback").innerText(), /Varimax: -38°/);
    assert.equal(await p.locator("#predict-check .item-feedback").count(), 3, "comprueba las predicciones");
    await p.click("#orth-animate");
    await p.waitForTimeout(1500);
    assert.equal(await p.locator("#orth-angle-value").innerText(), "-38°", "anima hasta Varimax");
    assert.equal(await p.locator("#orth-simple").innerText(), "8 de 8");
    // 03 · Oblicua: Oblimin recupera Φ = 0,30
    await p.click("#tab-oblicua");
    await p.click("#obl-oblimin");
    await p.waitForTimeout(1500);
    assert.equal(await p.locator("#obl-phi").innerText(), "0,300");
    await p.check("#obl-truth");
    assert.match(await p.locator("#obl-truth-box").innerText(), /φ = 0,30/);
    // Práctica con escalera de ayudas y error diagnóstico (dar el patrón en vez de la estructura)
    const prompt = await p.locator("#practice-prompt").innerText(),
      p1 = num(prompt.match(/p₁ = (-?\d+,\d+)/)[1]),
      p2 = num(prompt.match(/p₂ = (-?\d+,\d+)/)[1]),
      phi = num(prompt.match(/φ = (-?\d+,\d+)/)[1]);
    await p.fill("#practice-answer", String(p1).replace(".", ","));
    await p.click("#practice-check");
    assert.match(await p.locator("#practice-feedback").innerText(), /patrón p₁, no la estructura/);
    await p.click("#practice-hint");
    await p.click("#practice-hint");
    assert.match(await p.locator("#practice-feedback").innerText(), /Pista 2/);
    if (![p1, p2, phi].every(Number.isFinite)) throw new Error("No se pudo leer el enunciado: " + prompt);
    await p.fill("#practice-answer", (p1 + phi * p2).toFixed(3).replace(".", ","));
    await p.click("#practice-check");
    assert.match(await p.locator("#practice-feedback").innerText(), /^Correcto/);
    // Ejes casi paralelos: se bloquea el movimiento
    await p.click("#obl-reset");
    await p.waitForTimeout(1500);
    await p.fill("#obl-a2", "5");
    await p.dispatchEvent("#obl-a2", "input");
    assert.match(await p.locator("#obl-status").innerText(), /no pueden acercarse/);
    // 04 · Métodos: resultados tras la predicción
    await p.click("#tab-metodos");
    assert.equal(await p.locator("#methods-results").isVisible(), false, "oculto antes de predecir");
    await p.click('[data-guess="promax"]');
    assert.equal(await p.locator("#methods-grid .factor-table").count(), 5);
    await p.selectOption("#methods-data", "ex:continua_pearson");
    assert.match(await p.locator("#methods-summary").innerText(), /5,221/);
    // 05 · 3D
    await p.click("#tab-espacio");
    await p.selectOption("#space-rotation", "varimax");
    assert.match(await p.locator("#space-table").innerText(), /90°/);
    await p.selectOption("#space-rotation", "oblimin");
    assert.match(await p.locator("#space-summary").innerText(), /Oblimin/);
    // 06 · Calculadora: error, ejemplo, CSV y paso al plano con 2 factores
    await p.click("#tab-calculadora");
    await p.fill("#calc-input", "0,9 0,6\n0,1 0,2\n0,3 0,3");
    await p.click("#calc-run");
    assert.match(await p.locator("#calc-status").innerText(), /h² ≥ 1/);
    await p.click("#calc-example");
    assert.match(await p.locator("#calc-status").innerText(), /Oblimin: convergió/);
    // Varimax de la calculadora = psych::fa(rotate = "varimax"), con normalización de Kaiser.
    await p.selectOption("#calc-method", "varimax");
    await p.click("#calc-run");
    const want = await p.evaluate(
        () => FactorExamples.entries.continua_pearson.solutions["3_uls_varimax"].pattern[0][0],
      ),
      got = num(await p.locator("#calc-output tbody tr:first-child td:nth-child(2)").first().innerText());
    assert.ok(Math.abs(got - want) < 0.002, `Varimax de la calculadora ${got} frente a psych ${want}`);
    await p.selectOption("#calc-method", "oblimin");
    await p.click("#calc-run");
    const [download] = await Promise.all([p.waitForEvent("download"), p.click("#calc-download")]);
    assert.match(download.suggestedFilename(), /rotacion-oblimin\.csv/);
    await p.fill(
      "#calc-input",
      "I1\t0,65\t-0,37\nI2\t0,61\t-0,34\nI3\t0,57\t-0,32\nI4\t0,51\t0,48\nI5\t0,48\t0,44\nI6\t0,44\t0,41",
    );
    await p.selectOption("#calc-method", "varimax");
    await p.click("#calc-run");
    assert.match(await p.locator("#calc-code").textContent(), /Varimax/);
    await p.click("#calc-to-manual");
    assert.equal(await p.locator("#orth-preset").inputValue(), "custom");
    // 07 · Cuestionario con confianza y calibración
    await p.click("#tab-cierre");
    const qs = p.locator("#rot-quiz .dx-q");
    assert.equal(await qs.count(), 7);
    for (let i = 0; i < 7; i++) {
      await qs.nth(i).locator('.dx-conf input[value="seguro"]').check();
      await qs.nth(i).locator('.dx-opts button[data-correct="true"]').click();
    }
    assert.match(await p.locator("#rot-quiz .dx-summary").innerText(), /Primer intento: 7 de 7 correctas/);
    assert.equal(await p.locator("#rot-quiz .dx-tools").isVisible(), true);
    await p.click("#self-explain-show");
    assert.equal(await p.locator("#self-explain-model").isVisible(), false, "pide un intento antes del modelo");
    await p.fill("#self-explain", "Porque la longitud del vector del ítem no cambia al girar los ejes.");
    await p.click("#self-explain-show");
    assert.equal(await p.locator("#self-explain-model").isVisible(), true);
    // Navegación por teclado entre pestañas
    await p.locator("#tab-cierre").focus();
    await p.keyboard.press("Home");
    assert.equal(await p.locator("#predice").isVisible(), true);
    assert.ok(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      "sin desbordamiento a " + width,
    );
    assert.deepEqual(errors, []);
    await p.close();
  }
  await b.close();
  console.log(
    "OK: laboratorio de rotación en escritorio y móvil: predicciones, giro ortogonal y teclado, Varimax, Oblimin y población, práctica con ayudas, métodos, 3D, calculadora con CSV y paso al plano, cuestionario con calibración y autoexplicación.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
