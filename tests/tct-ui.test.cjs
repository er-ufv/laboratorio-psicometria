const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  path = require("path"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("file:///" + path.resolve(__dirname, "../tct.html").replaceAll("\\", "/"));
    await p.waitForSelector("#observed");
    assert.equal(await p.locator("#observed").textContent(), "55");
    for (const width of [1440, 390]) {
      await p.setViewportSize({ width, height: 900 });
      for (const panel of ["modelo", "fiabilidad", "error", "longitud", "alfa", "mitades"]) {
        await p.locator("#tab-" + panel).click();
        assert.equal(await p.locator(".tct-panel:visible").count(), 1);
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
    }
    await p.locator("#tab-fiabilidad").click();
    await p.locator("#sd-t").fill("0");
    await p.locator("#sd-e").fill("0");
    assert.equal(await p.locator("#rho").textContent(), "—");
    assert.match(await p.locator("#reliability-status").textContent(), /0\/0/);
    await p.locator("#sd-t").fill("10");
    assert.equal(await p.locator("#rho").textContent(), "1.000");
    await p.locator("#scatter-mode").selectOption("parallel");
    // Ejes fijos y diagonal; «Nueva muestra» cambia la realización sin cambiar ρ.
    const axes = () =>
      p.evaluate(() => {
        const c = Chart.getChart("reliability-chart");
        return [c.scales.x.min, c.scales.x.max, c.scales.y.min, c.scales.y.max, c.data.datasets[1].label];
      });
    await p.locator("#sd-t").fill("10");
    await p.locator("#sd-e").fill("5");
    assert.equal(await p.locator("#parallel-r").textContent(), "0.826");
    assert.match(await p.locator("#sample-info").textContent(), /\+0\.149/);
    const before = await axes();
    assert.deepEqual(before, [-25, 125, -25, 125, "y = x"]);
    await p.locator("#sd-e").fill("20");
    assert.deepEqual(await axes(), before);
    await p.locator("#sd-e").fill("5");
    await p.locator("#new-sample").click();
    assert.notEqual(await p.locator("#parallel-r").textContent(), "0.826");
    assert.equal(await p.locator("#rho").textContent(), "0.800");
    assert.match(await p.locator("#sample-info").textContent(), /Muestra 2/);
    await p.locator("#tab-error").click();
    assert.equal(await p.locator("#eem").textContent(), "6.71");
    assert.equal(await p.locator("#ci-low").textContent(), "36.85");
    await p.locator("#eem-r").fill("100");
    assert.equal(await p.locator("#eem").textContent(), "0.00");
    assert.equal(await p.locator("#ci-low").textContent(), "50.00");
    await p.locator("#eem-sd").fill("0");
    assert.equal(await p.locator("#eem").textContent(), "—");
    await p.locator("#eem-sd").fill("");
    assert.equal(await p.locator("#ci-high").textContent(), "—");
    await p.locator("#eem-sd").fill("15");
    const intervalAxis = () =>
      p.evaluate(() => [Chart.getChart("interval-chart").scales.x.min, Chart.getChart("interval-chart").scales.x.max]);
    const axis95 = await intervalAxis();
    await p.locator("#confidence").selectOption("99");
    await p.locator("#eem-r").fill("50");
    assert.deepEqual(await intervalAxis(), axis95);
    await p.locator("#eem-r").fill("80");
    await p.locator("#tab-longitud").click();
    assert.equal(await p.locator("#target-n").textContent(), "78");
    await p.locator("#target-r").selectOption("1");
    assert.equal(await p.locator("#target-n").textContent(), "No finita");
    await p.locator("#old-n").fill("0");
    assert.equal(await p.locator("#length-result").textContent(), "—");
    await p.locator("#old-n").fill("20");
    await p.locator("#new-n").fill("10");
    assert.equal(await p.locator("#length-result").textContent(), "0.538");
    await p.locator("#tab-alfa").click();
    assert.equal(await p.locator("#alpha-raw").textContent(), "0.953");
    await p.locator("#a-0-0").fill("");
    assert.equal(await p.locator("#alpha-raw").textContent(), "—");
    const neg = [
      [1, 3, 2],
      [2, 2, 2],
      [3, 1, 3],
      [4, 0, 1],
      [0, 4, 3],
      [2, 2, 4],
    ];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) await p.locator(`#a-${i}-${j}`).fill(String(neg[i][j]));
    assert.ok(Number(await p.locator("#alpha-raw").textContent()) < 0);
    assert.match(await p.locator("#alpha-status").textContent(), /negativo/);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) await p.locator(`#a-${i}-${j}`).fill("1");
    assert.equal(await p.locator("#alpha-raw").textContent(), "—");
    assert.match(await p.locator("#alpha-status").textContent(), /cero/);
    // Panel 06: dos mitades, KR-20/21, Kelley y error de la diferencia (valores verificados con R/psych).
    await p.locator("#tab-mitades").click();
    assert.equal(await p.locator("#half-r").textContent(), "0.549");
    assert.equal(await p.locator("#half-sb").textContent(), "0.708");
    assert.equal(await p.locator("#kr20").textContent(), "0.775");
    assert.equal(await p.locator("#kr21").textContent(), "0.697");
    assert.match(await p.locator("#half-explanation").textContent(), /0\.708 a 0\.888 en las 10 divisiones/);
    await p.locator("#half-split").selectOption("first-second");
    assert.equal(await p.locator("#half-sb").textContent(), "0.890");
    await p.locator("#h-0-0").fill("2");
    assert.equal(await p.locator("#kr20").textContent(), "—");
    assert.match(await p.locator("#half-status").textContent(), /0 o 1/);
    await p.locator("#h-0-0").fill("");
    assert.equal(await p.locator("#h-0-0").getAttribute("aria-invalid"), "true");
    await p.locator("#h-0-0").fill("1");
    assert.equal(await p.locator("#kr20").textContent(), "0.775");
    assert.equal(await p.locator("#est-index").textContent(), "0.894");
    assert.equal(await p.locator("#est-kelley").textContent(), "124.00");
    assert.equal(await p.locator("#est-se").textContent(), "6.00");
    assert.equal(await p.locator("#diff-se").textContent(), "9.49");
    assert.equal(await p.locator("#diff-critical").textContent(), "18.59");
    assert.match(await p.locator("#diff-explanation").textContent(), /no supera/);
    await p.locator("#diff-score").fill("95");
    assert.match(await p.locator("#diff-explanation").textContent(), /supera 18\.59/);
    await p.locator("#est-r").fill("100");
    assert.equal(await p.locator("#est-kelley").textContent(), "130.00");
    assert.equal(await p.locator("#est-se").textContent(), "0.00");
    await p.locator("#est-sd").fill("0");
    assert.equal(await p.locator("#est-kelley").textContent(), "—");
    assert.match(await p.locator("#est-status").textContent(), /mayor que cero/);
    await p.locator("#est-sd").fill("15");
    await p.locator("#diff-r").fill("1.5");
    assert.equal(await p.locator("#diff-se").textContent(), "—");
    await p.locator("#diff-r").fill("0.8");
    // Pasar el ratón por los gráficos no debe lanzar errores.
    for (const panel of ["fiabilidad", "error", "longitud", "alfa", "mitades"]) {
      await p.locator("#tab-" + panel).click();
      for (const id of await p.locator(`#${panel} canvas`).evaluateAll((cs) => cs.map((c) => c.id))) {
        await p.evaluate(
          (id) => document.getElementById(id).scrollIntoView({ block: "center", behavior: "instant" }),
          id,
        );
        const pts = await p.evaluate((id) => {
          const c = Chart.getChart(id),
            rect = c.canvas.getBoundingClientRect(),
            out = [];
          c.data.datasets.forEach((_, i) =>
            c
              .getDatasetMeta(i)
              .data.forEach((el) => Number.isFinite(el.x) && out.push([rect.left + el.x, rect.top + el.y])),
          );
          return out.filter((_, i, a) => i % Math.ceil(a.length / 8) === 0);
        }, id);
        for (const [x, y] of pts) await p.mouse.move(x, y + 2);
      }
    }
    await p.locator("#tab-alfa").focus();
    await p.keyboard.press("Home");
    assert.equal(await p.locator("#tab-modelo").getAttribute("aria-selected"), "true");
    const tq = p.locator("#tct-quiz .dx-q").first();
    await tq.locator('.dx-conf input[value="dudo"]').check();
    await tq.locator('.dx-opts button[data-correct="true"]').click();
    assert.match(await tq.locator(".feedback").textContent(), /^Correcto\./);
    await p.locator('.topbar a[href="analisis.html"]').click();
    await p.waitForSelector("#pr_analysis tr", { state: "attached" });
    await p.locator('.module-footer a[href="tct.html"]').click();
    await p.waitForSelector("#observed");
    assert.deepEqual(errors, []);
    console.log(
      "OK: seis paneles, teclado, gráficos con ejes fijos y sin errores al pasar el ratón, nueva muestra, dos mitades, KR-20/21, Kelley, error de la diferencia, escritorio/móvil, r=1, varianzas nulas, alfa negativo, datos incompletos, metas imposibles, quiz y enlaces entre módulos.",
    );
  } finally {
    await b.close();
  }
})();
