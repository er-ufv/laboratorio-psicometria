// Requiere el servidor en 127.0.0.1:3875, iniciado desde la raíz del proyecto:
// LANG=C.UTF-8 Rscript -e 'shiny::runApp("r/factor", port=3875, launch.browser=FALSE)'
// También debe superarse con LANG=C LC_ALL=C.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const base = process.env.SHINY_URL || "http://127.0.0.1:3875/";
(async () => {
  const b = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
    }),
    p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base);
  await p.waitForFunction(() => window.Shiny && Shiny.shinyapp?.$socket?.readyState === 1);
  const html = await (await p.request.get(base)).text();
  assert.ok(!/<U\+|<c3>|&lt;U\+/i.test(html), "Etiquetas con caracteres mal codificados");
  assert.match(html, /Sin rotación/);
  assert.match(html, /Policóricas/);
  assert.equal(await p.locator("a.home").getAttribute("href"), "laboratorio/index.html");
  assert.equal((await p.request.get(base + "laboratorio/tri.html")).status(), 200);
  assert.equal((await p.request.get(base + "laboratorio/assets/css/styles.css")).status(), 200);
  assert.equal((await p.request.get(base + "laboratorio/data/continua.csv")).status(), 200);
  for (const hidden of [
    "laboratorio/r/factor/app.R",
    "laboratorio/tests/factor-edge.R",
    "laboratorio/.git/HEAD",
    "laboratorio/docs/AUDITORIA.md",
  ])
    assert.notEqual((await p.request.get(base + hidden)).status(), 200, hidden + " no debe publicarse");
  const choose = async (id, value) => {
    await p.evaluate(([id, value]) => document.querySelector(id).selectize.setValue(value), [id, value]);
    await p.waitForTimeout(250);
  };
  const status = () => p.locator("#status").innerText();
  const run = async (selector, expected) => {
    await p.click("#run");
    await p.waitForFunction(
      ([selector, expected]) =>
        document.querySelector(selector).textContent.includes(expected) &&
        !document.documentElement.classList.contains("shiny-busy"),
      [selector, expected],
      { timeout: 120000 },
    );
  };
  // AFE con el ejemplo continuo y análisis paralelo.
  await p.check("#parallel");
  await run("#status", "600 personas");
  assert.match(await p.locator("#diagnostics").innerText(), /0.80207/);
  await p.waitForFunction(() => document.querySelector("#parallelTable").textContent.includes("Percentil 95"));
  assert.match(await p.locator("#parallelNote").innerText(), /media 3; percentil 95 3/);
  assert.match(await p.locator("#parallelNote").innerText(), /reposición/);
  await p.uncheck("#parallel");
  await p.getByRole("tab", { name: "Cargas y factores" }).click();
  await p.waitForFunction(() => document.querySelector("#loadings").textContent.includes("F1"));
  assert.match(await p.locator("#loadings").innerText(), /F1\s+F2\s+F3\s+h²\s+u²/);
  assert.doesNotMatch(await p.locator("#loadings").innerText(), /ULS1/);
  // Factores vacío: mensaje en castellano.
  await p.fill("#count", "");
  await p.waitForTimeout(400);
  await run("#status", "número entero");
  await p.fill("#count", "2");
  // Heywood en datos independientes.
  await choose("#example", "independiente");
  await run("#status", "Heywood");
  assert.match(await status(), /I6/);
  assert.match(await status(), /Solución impropia/);
  // AFC continuo: gl explícitos, AIC/BIC y orientación de cortes.
  await choose("#example", "continua");
  await choose("#analysis", "afc");
  await p.getByRole("tab", { name: "Ajuste y residuos" }).click();
  await run("#indices", "28.25283");
  assert.match(await status(), /45 − 21 = 24/);
  assert.match(await p.locator("#indices").innerText(), /AIC\s+13535\.41985/);
  assert.match(await p.locator("#indicesNote").innerText(), /Hu y Bentler/);
  // AFC ordinal: χ² escalado y desplazado; índices robustos.
  await choose("#example", "ordinal");
  await p.check("#ordinal");
  await p.waitForTimeout(250);
  await run("#indices", "31.23914");
  assert.match(await p.locator("#indices").innerText(), /RMSEA \(robusto\)\s+0\.04503/);
  assert.match(await p.locator("#indices").innerText(), /CFI \(robusto\)\s+0\.98551/);
  assert.match(await status(), /Savalei, 2021/);
  assert.match(await status(), /72 − 48 = 24/);
  // Modelos no identificados y saturados.
  await p.fill("#model", "F1 =~ I1 + I2");
  await run("#status", "no está identificado");
  await p.uncheck("#ordinal");
  await p.fill("#model", "F1 =~ I1 + I2 + I3");
  await run("#status", "saturado");
  await p.fill("#model", "F1 =~ no_existe");
  await run("#status", "lavaan no pudo ajustar");
  await p.fill("#model", "F1 =~ I1 + I2 + I3\nF2 =~ I4 + I5 + I6\nF3 =~ I7 + I8 + I9");
  // CSV propio con punto y coma y coma decimal (formato habitual de Excel en español).
  const rows = fs.readFileSync(path.resolve(__dirname, "../data/continua.csv"), "utf8").trim().split(/\r?\n/),
    spanish = path.join(os.tmpdir(), "psicometria-excel-es.csv");
  fs.writeFileSync(
    spanish,
    rows
      .map((r, i) =>
        i
          ? r
              .split(",")
              .map((x) => x.replace(".", ","))
              .join(";")
          : r.replaceAll('"', "").replaceAll(",", ";"),
      )
      .join("\r\n"),
  );
  await p.check('input[name="source"][value="csv"]');
  await p.setInputFiles("#csv", spanish);
  await p.waitForTimeout(800);
  await run("#status", "Revisa separador y decimal");
  await choose("#separator", ";");
  await run("#status", "coma decimal");
  await choose("#decimal", ",");
  await run("#indices", "28.25283");
  assert.match(await status(), /psicometria-excel-es\.csv/);
  await choose("#separator", ",");
  await run("#status", "mismo carácter");
  await choose("#separator", ";");
  // Volver a los ejemplos tras cargar un CSV.
  await p.check('input[name="source"][value="example"]');
  await choose("#example", "ordinal");
  await p.check("#ordinal");
  await p.waitForTimeout(300);
  await run("#status", "ejemplo «ordinal»");
  assert.match(await p.locator("#indices").innerText(), /31\.23914/);
  await p.setViewportSize({ width: 390, height: 900 });
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  if (process.env.SHOT_DIR) {
    await p.screenshot({ path: path.join(process.env.SHOT_DIR, "shiny-390.png"), fullPage: true });
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.screenshot({ path: path.join(process.env.SHOT_DIR, "shiny-1440.png"), fullPage: true });
  }
  assert.deepEqual(errors, []);
  await b.close();
  console.log(
    "Native Shiny: UTF-8 labels, restricted static files, AFE + parallel, Heywood, empty factors, ML/WLSMV CFA (robust), non-identified/saturated models, CSV separator/decimal errors and return to examples passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
