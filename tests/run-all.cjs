// Ejecuta todas las pruebas: node tests/run-all.cjs [--math]
//   --math     solo pruebas matemáticas (sin navegador).
//   Las de navegador necesitan Playwright (npm install && npx playwright install chromium).
//   Las de Shiny se ejecutan con SHINY=1 y los servidores iniciados (puertos 3875 y 3877).
const { spawnSync } = require("node:child_process"),
  path = require("node:path"),
  fs = require("node:fs");
const dir = __dirname,
  files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".test.cjs"))
    .sort(),
  math = [
    "analisis.test.cjs",
    "analisis-discriminacion.test.cjs",
    "diseno.test.cjs",
    "tct.test.cjs",
    "tri.test.cjs",
    "factor.test.cjs",
    "rotation.test.cjs",
    "preguntas.test.cjs",
  ],
  shiny = ["factor-shiny.test.cjs", "rotacion-shiny.test.cjs"],
  onlyMath = process.argv.includes("--math");
let hasPlaywright = true;
try {
  require.resolve(process.env.PLAYWRIGHT_MODULE || "playwright");
} catch {
  hasPlaywright = false;
}
let failed = 0;
for (const f of files) {
  const isMath = math.includes(f),
    isShiny = shiny.includes(f);
  if (onlyMath && !isMath) continue;
  if (!isMath && !hasPlaywright) {
    console.log(`·  ${f}: omitida (instala Playwright para las pruebas de navegador)`);
    continue;
  }
  if (isShiny && !process.env.SHINY) {
    console.log(`·  ${f}: omitida (SHINY=1 con los servidores Shiny en marcha)`);
    continue;
  }
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: "utf8" }),
    last = (r.stdout || "").trim().split("\n").pop();
  if (r.status === 0) console.log(`✓  ${f}: ${last}`);
  else {
    failed++;
    console.log(`✗  ${f}\n${r.stdout}\n${r.stderr}`);
  }
}
process.exit(failed ? 1 : 0);
