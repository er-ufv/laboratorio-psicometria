const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const path = require("path"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("file:///" + path.resolve(__dirname, "../analisis.html").replaceAll("\\", "/"));
    await page.waitForSelector("#pr_analysis tr", { state: "attached" });
    assert.equal(await page.evaluate(() => Object.keys(Chart.instances).length), 11);
    // Notación: p para dificultad (D queda reservado a discriminación).
    assert.doesNotMatch(await page.locator("#quiz_dif_container").innerText(), /\bD = 0/);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const section of ["intro", "dificultad", "homogeneidad", "validez", "azar", "practica"]) {
        await page.evaluate((s) => showSection(s), section);
        const tabs = page.locator("#" + section + " .tab-btn");
        for (let i = 0; i < (await tabs.count()); i++) {
          await tabs.nth(i).click();
          assert.equal(await page.locator("#" + section + " .tab-btn.active").count(), 1);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
    }
    await page.evaluate(() => {
      showSection("dificultad");
      showTab("dif", "politomico");
    });
    await page.locator("#pol_A").fill("21");
    await page.locator("#pol_N").fill("20");
    assert.equal(await page.locator("#pol_Dj").innerText(), "—");
    await page.locator("#pol_A").fill("0");
    assert.equal(await page.locator("#pol_Dc").innerText(), "-0.333");
    assert.equal(await page.evaluate(() => Chart.getChart("pol_chart").data.datasets[0].data[1]), -1 / 3);
    await page.evaluate(() => {
      showTab("dif", "quiz_dif");
    });
    const q0 = page.locator("#quiz_dif_container .dx-q").first();
    await q0.locator('.dx-opts button[data-correct="false"]').first().click();
    assert.match(await q0.locator(".feedback").innerText(), /^Todavía no\./);
    assert.equal(await q0.locator("button.answer-correct").count(), 0, "un error no revela la respuesta");
    await page.evaluate(() => {
      showSection("homogeneidad");
      showTab("hom", "hom_calc");
    });
    for (let i = 0; i < 8; i++) {
      await page.locator("#px_" + i + "_x").fill(i < 3 ? "1" : "");
      await page.locator("#px_" + i + "_y").fill(i < 3 ? String(i + 1) : "");
    }
    assert.equal(await page.locator("#pearson_r").innerText(), "—");
    assert.match(await page.locator("#pearson_interp").innerText(), /variabilidad/);
    await page.evaluate(() => showTab("hom", "hom_corregido"));
    await page.locator("#cv_11").fill("");
    assert.equal(await page.locator("#hc_r1_bot").innerText(), "—");
    assert.equal(await page.locator("#calculation-notice").isVisible(), true);
    for (let s = 1; s <= 4; s++) for (let j = 1; j <= 3; j++) await page.locator("#cv_" + s + j).fill("1");
    assert.equal(await page.locator("#hc_r1_bot").innerText(), "—");
    await page.evaluate(() => showTab("hom", "hom_alpha"));
    assert.equal(await page.locator("#elim_new_alpha").innerText(), "—");
    await page.evaluate(() => {
      showSection("azar");
    });
    await page.locator("#az_total").fill("13");
    await page.locator("#az_conoce").fill("7");
    assert.equal(await page.locator("#az_Xc").innerText(), "7.00");
    await page.locator("#az_total").fill("100");
    await page.locator("#az_conoce").fill("60");
    assert.doesNotMatch(await page.locator("#az_interp").innerText(), /\d\.\d{5,}/);

    // Pie de la tabla comparativa alineado bajo cada ítem y textos con contraste suficiente.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      showSection("homogeneidad");
      showTab("hom", "hom_corregido");
    });
    for (let s = 1; s <= 4; s++)
      for (let j = 1; j <= 3; j++)
        await page.locator("#cv_" + s + j).fill(String([3, 2, 3, 2, 3, 4, 5, 5, 5, 1, 1, 3][(s - 1) * 3 + j - 1]));
    for (let j = 1; j <= 3; j++) {
      const [head, value] = await Promise.all(
        [`#cv_1${j}`, `#hc_r${j}_bot`].map((sel) =>
          page.locator(sel).evaluate((e) => {
            const r = e.closest("td").getBoundingClientRect();
            return Math.round(r.left + r.width / 2);
          }),
        ),
      );
      assert.ok(Math.abs(head - value) < 2, `r del ítem ${j} no está bajo su columna`);
    }
    assert.equal(await page.locator("#hc_diff1").innerText(), "+0.094");
    assert.notEqual(await page.locator("#cv_rest1_1").evaluate((e) => getComputedStyle(e).color), "rgb(133, 200, 255)");
    await page.locator("#cv_13").fill("3");
    await page.locator("#cv_23").fill("3");
    await page.locator("#cv_33").fill("3");
    await page.locator("#cv_43").fill("3");
    assert.equal(await page.locator("#hc_diff3").innerText(), "—");
    assert.doesNotMatch(await page.locator("#hom_hom_corregido tfoot").innerText(), /NaN|\+-/);
    await page.locator("#cv_13").fill("3");
    await page.locator("#cv_23").fill("4");
    await page.locator("#cv_33").fill("5");
    await page.locator("#cv_43").fill("3");

    // Elección múltiple: predicción antes de revelar, índices y distractores (verificados contra R en Node).
    await page.evaluate(() => showTab("hom", "hom_mc"));
    assert.equal(await page.locator("#mc_results").isVisible(), false);
    assert.equal(await page.locator("#mc_tbody tr").count(), 24);
    assert.equal(await page.locator("#mc_grp_0").innerText(), "S");
    await page.locator("#mc_guess").selectOption("0");
    await page.locator("#mc_check").click();
    assert.equal(await page.locator("#mc_results").isVisible(), true);
    assert.match(await page.locator("#mc_feedback").innerText(), /ítem 3/);
    assert.equal(await page.locator("#mc_item").inputValue(), "2");
    const row3 = await page.locator("#mc_items_body tr").nth(2).locator("td").allInnerTexts();
    assert.deepEqual(row3.slice(0, 8), ["Ítem 3", "A", "0.54", "0.33", "0.33", "0.00", "0.08", "-0.17"]);
    assert.match(await page.locator("#mc_dist_body").innerText(), /grupo superior: revisar/);
    assert.match(await page.locator("#mc_dist_comment").innerText(), /distractor C atrae al 67 %/);
    assert.equal(await page.locator("#mc_alpha").innerText(), "0.605");
    await page.locator("#mc_item").selectOption("3");
    assert.match(await page.locator("#mc_dist_body").innerText(), /Nadie la elige/);
    await page.locator("#mc_0_0").fill("x");
    assert.equal(await page.locator("#mc_0_0").getAttribute("aria-invalid"), "true");
    assert.match(await page.locator("#mc_status").innerText(), /no válida/);
    assert.equal(await page.locator("#mc_alpha").innerText(), "—");
    await page.locator("#mc_0_0").fill("b");
    assert.equal(await page.locator("#mc_0_0").inputValue(), "B");
    await page.locator("#mc_key_2").selectOption("C");
    assert.match(await page.locator("#mc_items_body tr").nth(2).innerText(), /\bC\b/);
    await page.locator("#mc_reset").click();
    assert.equal(await page.locator("#mc_key_2").inputValue(), "A");
    assert.equal(await page.locator("#mc_alpha").innerText(), "0.605");
    assert.equal(await page.locator("#mc_tbody img, #mc_tbody script").count(), 0);

    // Práctica global: incluye α y lo comenta.
    await page.evaluate(() => showSection("practica"));
    assert.equal(await page.locator("#pr_alpha").innerText(), "0.062");
    assert.equal(await page.locator("#pr_min_rest").innerText(), "-0.418");
    assert.match(await page.locator("#pr_comment").innerText(), /ítem 3/i);
    await page.locator("#pr_0_0").fill("");
    assert.equal(await page.locator("#pr_alpha").innerText(), "—");
    assert.equal(await page.locator("#pr_comment").innerText(), "—");
    await page.locator("#pr_0_0").fill("2");
    assert.equal(await page.locator("#pr_alpha").innerText(), "0.062");

    // Gráfico de alfa: el punto elegido es visible (no blanco) y se dibuja la curva del k elegido.
    await page.evaluate(() => {
      showSection("homogeneidad");
      showTab("hom", "hom_alpha");
      document.getElementById("alpha_k").value = 14;
      calcAlpha();
    });
    const alphaSets = await page.evaluate(() =>
      Chart.getChart("alpha_chart").data.datasets.map((d) => [d.label, d.backgroundColor]),
    );
    assert.ok(alphaSets.some(([l]) => /k = 14/.test(l)));
    assert.ok(alphaSets.every(([, c]) => c !== "#ffffff"));

    // Pasar el ratón por todos los gráficos no debe lanzar errores (antes fallaban los tooltips).
    const ids = await page.evaluate(() => Object.values(Chart.instances).map((c) => c.canvas.id));
    let hovered = 0,
      withTooltip = 0;
    for (const id of ids) {
      await page.evaluate((id) => {
        const canvas = document.getElementById(id),
          tab = canvas.closest(".tab-content");
        showSection(canvas.closest(".section").id);
        if (tab) showTab(tab.id.split("_")[0], tab.id.split("_").slice(1).join("_"));
      }, id);
      await page.waitForTimeout(150);
      await page.evaluate(
        (id) => document.getElementById(id).scrollIntoView({ block: "center", behavior: "instant" }),
        id,
      );
      // Espera a que Chart.js termine de redimensionar el lienzo tras mostrar la pestaña.
      await page.waitForTimeout(250);
      const points = await page.evaluate((id) => {
        const c = Chart.getChart(id),
          rect = c.canvas.getBoundingClientRect(),
          out = [];
        c.data.datasets.forEach((_, i) =>
          c.getDatasetMeta(i).data.forEach((el) => {
            if (Number.isFinite(el.x) && Number.isFinite(el.y)) out.push([rect.left + el.x, rect.top + el.y]);
          }),
        );
        return out.filter(([x, y], i, a) => i % Math.ceil(a.length / 12) === 0 && y > 0 && y < innerHeight && x > 0);
      }, id);
      let active = false;
      for (const [x, y] of points) {
        await page.mouse.move(x, y + 3);
        await page.waitForTimeout(20);
        active ||= await page.evaluate((id) => Chart.getChart(id).tooltip.getActiveElements().length > 0, id);
      }
      if (points.length) hovered++;
      if (active) withTooltip++;
    }
    assert.ok(hovered >= 11, "gráficos recorridos: " + hovered);
    assert.ok(withTooltip >= 9, "tooltips activados: " + withTooltip);
    // En escritorio se ve la lista de módulos; en móvil se oculta, como en el resto de páginas.
    assert.equal(await page.locator(".sidebar nav").isVisible(), true);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.equal(await page.locator(".sidebar nav").isVisible(), false);
    assert.ok((await page.locator("#main").boundingBox()).y < 300);
    await page.locator(".topbar .home-link").click();
    await page.waitForSelector(".example");
    assert.equal(await page.locator(".example").count(), 6);
    await page.locator('.next-card a[href="analisis.html"]').click();
    await page.waitForSelector("#pr_analysis tr", { state: "attached" });
    assert.deepEqual(errors, []);
    console.log(
      "OK: todas las secciones/pestañas en escritorio y móvil, once gráficos sin errores al pasar el ratón, pie alineado, contraste, panel de grupos extremos y distractores, α en práctica, entradas inválidas, varianza cero, quiz, azar en esperanza y navegación entre módulos.",
    );
  } finally {
    await browser.close();
  }
})();
