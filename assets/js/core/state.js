(function (root) {
  "use strict";
  const KEY = "psicometria.diseno.v1";
  const MIN_OPTIONS = 3,
    MAX_OPTIONS = 5,
    MAX_IMPORT_CHARS = 100000;
  const TEXT_FIELDS = ["construct", "population", "item", "notes"];
  const blank = () => ({
    construct: "",
    population: "",
    item: "",
    notes: "",
    scale: "frecuencia",
    categories: 5,
    options: ["", "", ""],
    key: 0,
    checks: [],
  });
  const validOptions = (o) => Array.isArray(o) && o.length >= MIN_OPTIONS && o.length <= MAX_OPTIONS;
  function sanitize(d, count) {
    const result = blank();
    if (!d || typeof d !== "object") return result;
    for (const k of TEXT_FIELDS)
      if (typeof d[k] === "string") result[k] = d[k].slice(0, k === "construct" || k === "population" ? 300 : 4000);
    if (["frecuencia", "acuerdo", "intensidad"].includes(d.scale)) result.scale = d.scale;
    if ([4, 5, 7].includes(d.categories)) result.categories = d.categories;
    if (validOptions(d.options)) result.options = d.options.map((v) => (typeof v === "string" ? v.slice(0, 500) : ""));
    if (Number.isInteger(d.key) && d.key >= 0 && d.key < result.options.length) result.key = d.key;
    result.checks = Array.from({ length: count }, (_, i) => d.checks?.[i] === true);
    return result;
  }
  function initial() {
    return { version: 1, active: "tipico", drafts: { tipico: blank(), optimo: blank() } };
  }
  function normalize(raw) {
    const v = initial();
    if (raw?.version !== 1) return v;
    v.active = raw.active === "optimo" ? "optimo" : "tipico";
    for (const type of ["tipico", "optimo"])
      v.drafts[type] = sanitize(raw.drafts?.[type], root.DesignData.types[type].checks.length);
    return v;
  }
  function load(storage) {
    try {
      return { state: normalize(JSON.parse(storage.getItem(KEY))), error: false };
    } catch {
      return { state: initial(), error: true };
    }
  }
  function save(storage, state) {
    try {
      storage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }
  function review(checks, total) {
    const done = Array.from({ length: total }, (_, i) => checks[i] === true).filter(Boolean).length;
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  }
  /* Lee una ficha exportada por este taller. Devuelve { type, draft, adjusted } o { error }.
     El borrador pasa por el mismo saneamiento que el almacenamiento local: solo se conservan
     campos conocidos, con su tipo y longitud máxima; nunca se interpreta como HTML. */
  function parseReport(text) {
    if (typeof text !== "string" || !text.trim()) return { error: "El archivo está vacío." };
    if (text.length > MAX_IMPORT_CHARS)
      return { error: "El archivo es demasiado grande para ser una ficha exportada." };
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return { error: "El archivo no contiene JSON válido." };
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.module !== "diseno" || raw.version !== 1)
      return { error: "No es una ficha exportada desde este taller (se espera módulo «diseno», versión 1)." };
    if (!["tipico", "optimo"].includes(raw.type))
      return { error: "La ficha indica un tipo de rendimiento desconocido." };
    const d = raw.draft;
    if (!d || typeof d !== "object" || Array.isArray(d)) return { error: "La ficha no contiene un borrador." };
    const count = root.DesignData.types[raw.type].checks.length,
      draft = sanitize(d, count);
    const adjusted =
      TEXT_FIELDS.some((k) => d[k] !== undefined && d[k] !== draft[k]) ||
      (raw.type === "tipico" && (d.scale !== draft.scale || d.categories !== draft.categories)) ||
      (raw.type === "optimo" && (JSON.stringify(d.options) !== JSON.stringify(draft.options) || d.key !== draft.key)) ||
      (Array.isArray(d.checks) && (d.checks.length !== count || d.checks.some((x) => x !== true && x !== false)));
    return { type: raw.type, draft, adjusted };
  }
  root.DesignState = {
    KEY,
    MIN_OPTIONS,
    MAX_OPTIONS,
    MAX_IMPORT_CHARS,
    blank,
    sanitize,
    normalize,
    load,
    save,
    review,
    parseReport,
  };
  if (typeof module !== "undefined") module.exports = root.DesignState;
})(globalThis);
