const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const path = require("path");
const fs = require("fs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("file:///" + path.resolve(__dirname, "../index.html").replaceAll("\\", "/"));
  await page.waitForSelector(".example");
  assert.equal(await page.locator(".example").count(), 6);
  await page.locator("#construct").fill("Planificación");
  await page.locator("#population").fill("Estudiantes");
  await page.locator("#item").fill("<img src=x onerror=alert(1)>");
  await page.locator(".check input").first().check();
  await page.waitForTimeout(600);
  assert.match(await page.locator("#progress-text").innerText(), /1 \/ 9/);
  await page.locator("#tab-optimo").click();
  assert.equal(await page.locator("#item").inputValue(), "");
  assert.equal(await page.locator("#option-0").count(), 1);
  await page.locator("#tab-tipico").click();
  assert.equal(await page.locator("#item").inputValue(), "<img src=x onerror=alert(1)>");
  assert.equal(await page.locator("#draft img").count(), 0);
  await page.locator("#filter").selectOption("Absolutos");
  assert.equal(await page.locator(".example").count(), 1);
  await page.locator("#filter").selectOption("all");
  await page.reload();
  assert.equal(await page.locator("#construct").inputValue(), "Planificación");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  const report = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
  assert.equal(report.type, "tipico");
  assert.equal(report.draft.construct, "Planificación");
  assert.equal(report.review.done, 1);
  // Importación: la ficha exportada vuelve a cargarse; los textos con HTML siguen siendo texto.
  const imported = {
    ...report,
    draft: { ...report.draft, construct: "<img src=x onerror=alert(2)>", notes: "Nota importada" },
  };
  await page.locator("#construct").fill("");
  page.once("dialog", (d) => d.accept());
  await page.locator("#import-file").setInputFiles({
    name: "ficha.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await page.waitForFunction(() => document.getElementById("notes").value === "Nota importada");
  assert.equal(await page.locator("#construct").inputValue(), "<img src=x onerror=alert(2)>");
  assert.equal(await page.locator("img").count(), 0);
  await page.locator("#import-file").setInputFiles({
    name: "otra.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"module":"tri"}'),
  });
  await page.waitForFunction(() => /No se importó/.test(document.getElementById("toast").textContent));
  assert.equal(await page.locator("#notes").inputValue(), "Nota importada");
  await page.locator("#import-file").setInputFiles({
    name: "rota.json",
    mimeType: "application/json",
    buffer: Buffer.from("{rota"),
  });
  await page.waitForFunction(() => /JSON válido/.test(document.getElementById("toast").textContent));
  // Rendimiento óptimo: de 3 a 5 opciones, clave coherente y confirmación antes de borrar texto.
  await page.locator("#tab-optimo").click();
  assert.equal(await page.locator('#response-editor input[id^="option-"]').count(), 3);
  await page.locator("#option-count").selectOption("5");
  assert.equal(await page.locator('#response-editor input[id^="option-"]').count(), 5);
  assert.equal(await page.locator("#key option").count(), 5);
  await page.locator("#option-4").fill("Quinta");
  await page.locator("#key").selectOption("4");
  page.once("dialog", (d) => d.dismiss());
  await page.locator("#option-count").selectOption("4");
  assert.equal(await page.locator("#option-count").inputValue(), "5");
  assert.equal(await page.locator("#option-4").inputValue(), "Quinta");
  page.once("dialog", (d) => d.accept());
  await page.locator("#option-count").selectOption("3");
  assert.equal(await page.locator('#response-editor input[id^="option-"]').count(), 3);
  assert.equal(await page.locator("#key").inputValue(), "0");
  await page.reload();
  assert.equal(await page.locator('#response-editor input[id^="option-"]').count(), 3);
  // Impresión: texto completo en copias de solo lectura, sin controles de archivo ni estados.
  const long = "Enunciado largo ".repeat(60);
  await page.locator("#item").fill(long);
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator("#item").isVisible(), false);
  assert.equal((await page.locator('.print-mirror[data-for="item"]').innerText()).trim(), long.trim());
  assert.equal(await page.locator("#import").isVisible(), false);
  assert.equal(await page.locator("#save-status").isVisible(), false);
  assert.match(await page.locator("#print-meta").innerText(), /Rendimiento óptimo/);
  await page.emulateMedia({ media: "screen" });
  await page.locator("#item").fill("");
  await page.locator("#tab-tipico").click();
  await page.locator("#tab-tipico").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("#tab-optimo").getAttribute("aria-selected"), "true");
  await page.keyboard.press("Home");
  assert.equal(await page.locator("#tab-tipico").getAttribute("aria-selected"), "true");
  await page.waitForTimeout(5500);
  await page.evaluate(() => {
    document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  if (process.env.SHOT_DIR)
    await page.screenshot({ path: path.join(process.env.SHOT_DIR, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.SHOT_DIR)
    await page.screenshot({ path: path.join(process.env.SHOT_DIR, "mobile.png"), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log(
    "UI OK: pestañas, filtros, fichas independientes, persistencia tras recarga, escape de texto, importación validada, 3–5 opciones, impresión, revisión y anchura móvil.",
  );
  await browser.close();
})();
