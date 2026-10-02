(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    fmt = (x, n = 3) =>
      Number.isFinite(x)
        ? x.toLocaleString("es-ES", { minimumFractionDigits: n, maximumFractionDigits: n })
        : "No disponible",
    pv = (x) => (x < 0.001 ? " < 0,001" : fmt(x)),
    text = (id, s) => {
      $(id).textContent = s;
    };
  function table(id, headers, rows) {
    const t = document.createElement("table"),
      caption = document.createElement("caption");
    caption.textContent = headers.join(" · ");
    caption.className = "sr-only";
    t.append(caption);
    const head = t.createTHead().insertRow();
    headers.forEach((h) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = h;
      head.append(th);
    });
    const b = t.createTBody();
    rows.forEach((row) => {
      const tr = b.insertRow();
      row.forEach((x) => {
        const c = tr.insertCell();
        c.textContent = typeof x === "number" ? fmt(x) : x;
      });
    });
    $(id).replaceChildren(t);
  }
  function matrix(id, A, prefix = "I") {
    table(
      id,
      ["", ...A[0].map((_, j) => prefix + (j + 1))],
      A.map((r, i) => [prefix + (i + 1), ...r]),
    );
    if (id === "afe-correlation")
      $(id)
        .querySelectorAll("tbody tr")
        .forEach((r, i) =>
          Array.from(r.cells)
            .slice(1)
            .forEach((c, j) => {
              const x = A[i][j];
              c.style.background =
                x >= 0 ? "rgba(0,92,151," + Math.abs(x) * 0.2 + ")" : "rgba(180,70,50," + Math.abs(x) * 0.2 + ")";
            }),
        );
  }
  const charts = {};
  function chart(id, type, labels, datasets, scales = {}) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id), {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (c) =>
                c.raw?.item
                  ? c.raw.item +
                    " · " +
                    (c.raw.xl || "F1") +
                    " " +
                    fmt(c.raw.x) +
                    " · " +
                    (c.raw.yl || "F2") +
                    " " +
                    fmt(c.raw.y)
                  : c.dataset.label + ": " + fmt(typeof c.raw === "number" ? c.raw : c.parsed.y),
            },
          },
        },
      },
    });
  }
  document.querySelectorAll("[role=tab][data-panel]").forEach((b, i, all) => {
    const activate = () => {
      all.forEach((t) => {
        const on = t === b;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        $(t.dataset.panel).hidden = !on;
      });
      Object.values(charts).forEach((c) => c.resize());
      window.dispatchEvent(new Event("factor-panel"));
    };
    b.addEventListener("click", activate);
    b.addEventListener("keydown", (e) => {
      let n;
      if (e.key === "ArrowRight") n = (i + 1) % all.length;
      if (e.key === "ArrowLeft") n = (i + all.length - 1) % all.length;
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = all.length - 1;
      if (n !== undefined) {
        e.preventDefault();
        all[n].click();
        all[n].focus();
      }
    });
  });
  function quiz(questions) {
    const host = $("factor-quiz");
    questions.forEach((q) => {
      const box = document.createElement("article");
      box.className = "factor-quiz";
      const p = document.createElement("h3");
      p.textContent = q[0];
      box.append(p);
      const feedback = document.createElement("p");
      feedback.className = "feedback";
      feedback.setAttribute("aria-live", "polite");
      q[1].forEach((s, i) => {
        const b = document.createElement("button");
        b.textContent = s;
        b.type = "button";
        b.addEventListener("click", () => {
          box.querySelectorAll("button").forEach((x, j) => {
            x.className = j === q[2] ? "answer-correct" : j === i ? "answer-wrong" : "";
          });
          feedback.className = "feedback " + (i === q[2] ? "answer-correct" : "answer-wrong");
          feedback.textContent = (i === q[2] ? "Correcto. " : "Revisa tu respuesta. ") + q[3];
        });
        box.append(b);
      });
      box.append(feedback);
      host.append(box);
    });
  }
  window.FactorUI = { $, fmt, pv, text, table, matrix, chart, quiz };
})();
