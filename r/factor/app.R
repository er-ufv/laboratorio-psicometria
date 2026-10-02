# Desde la raiz: shiny::runApp("r/factor")
# Archivo en ASCII: los textos usan escapes Unicode y funcionan con cualquier locale.
# Las etiquetas no ASCII se asignan con setNames(): un nombre escrito como
# c("etiqueta" = valor) se convertiria al locale nativo al analizar el archivo.
source("../modules/host.R", local = TRUE)
psicometria_utf8()
library(shiny)
source("../modules/factor_math.R", encoding = "UTF-8", local = TRUE)
project_root <- normalizePath("../..", mustWork = TRUE)
# Solo se publican las paginas, assets/ y data/; no r/, tests/ ni .git/.
addResourcePath("laboratorio", psicometria_web_root(project_root))
css <- paste0(
  "@font-face{font-family:Manrope;font-style:normal;font-display:swap;font-weight:200 800;src:url(laboratorio/assets/fonts/manrope-latin-wght-normal.woff2) format('woff2')}",
  "body{font-family:Manrope,Arial,sans-serif;background:#f7f8f8;color:#1a1a1a}.container-fluid{max-width:1200px;padding:25px}",
  ".well{background:#fff;border-color:#e5e5e5;box-shadow:none}.btn-primary{background:#001391;border-color:#001391}",
  ".btn-primary:hover,.btn-primary:focus{background:#070e46;border-color:#070e46}h2,h3,h4{color:#001391}a{color:#001391}",
  ".home{display:inline-block;padding:10px;border:1px solid #d9edff;border-radius:5px;margin-bottom:15px}table{font-size:13px}",
  "#status>div{background:#edf5ff;border:1px solid #d9edff;border-radius:4px;padding:10px 12px;margin-bottom:15px;color:#070e46;font-size:13px}#status p{margin:0 0 4px}",
  ".shiny-table{width:auto;margin-bottom:15px}.shiny-table td,.shiny-table th{padding:4px 8px!important;text-align:right}.shiny-table th[scope=row],.shiny-table td.text,.shiny-table thead th:first-child{text-align:left}",
  ".note{font-size:12px;color:#4d4d4d}.table-wrap{overflow-x:auto}")
model_default <- "F1 =~ I1 + I2 + I3\nF2 =~ I4 + I5 + I6\nF3 =~ I7 + I8 + I9"
ui <- fluidPage(
  tags$head(tags$style(HTML(css))),
  tags$a(class = "home", href = "laboratorio/index.html", "\u2190 P\u00e1gina principal"),
  titlePanel("Laboratorio factorial \u00b7 AFE y AFC", windowTitle = "Laboratorio factorial"),
  tags$p("Dise\u00f1o, contenidos y direcci\u00f3n: Eduar Ram\u00edrez. An\u00e1lisis local con psych y lavaan."),
  sidebarLayout(
    sidebarPanel(
      radioButtons("source", "Datos", c("Ejemplo incluido" = "example", "CSV propio" = "csv"), inline = TRUE),
      conditionalPanel("input.source == 'example'",
        selectInput("example", "Ejemplo", setNames(c("continua", "ordinal", "independiente"), c("Continuo", "Ordinal \u00b7 cinco categor\u00edas", "Independiente")))),
      conditionalPanel("input.source == 'csv'",
        fileInput("csv", "CSV: filas = personas, columnas = indicadores num\u00e9ricos", accept = c(".csv", ".txt", "text/csv"), buttonLabel = "Elegir\u2026", placeholder = "Ning\u00fan archivo"),
        selectInput("separator", "Separador de columnas", c("Coma" = ",", "Punto y coma" = ";", "Tabulador" = "\t")),
        selectInput("decimal", "Separador decimal", c("Punto" = ".", "Coma" = ",")),
        tags$p(class = "note", "Un CSV exportado por Excel en espa\u00f1ol suele usar punto y coma entre columnas y coma decimal.")),
      checkboxInput("ordinal", "Indicadores ordinales (AFE con polic\u00f3ricas; AFC con WLSMV)", FALSE),
      selectInput("analysis", "An\u00e1lisis", c("AFE" = "afe", "AFC" = "afc")),
      conditionalPanel("input.analysis == 'afe'",
        selectInput("correlation", "Correlaciones", setNames(c("pearson", "poly"), c("Pearson", "Polic\u00f3ricas"))),
        selectInput("method", "Extracci\u00f3n", c("ULS" = "uls", "Ejes principales" = "pa", "ML normal" = "ml")),
        numericInput("count", "Factores", 3, min = 1, max = 10, step = 1),
        selectInput("rotation", "Rotaci\u00f3n", setNames(c("oblimin", "promax", "varimax", "none"), c("Oblimin", "Promax", "Varimax", "Sin rotaci\u00f3n"))),
        checkboxInput("parallel", "Calcular an\u00e1lisis paralelo (100 r\u00e9plicas; puede tardar)", FALSE)),
      conditionalPanel("input.analysis == 'afc'",
        textAreaInput("model", "Estructura lavaan", value = model_default, rows = 6),
        tags$p(class = "note", "Identificaci\u00f3n: varianza de cada factor fijada a 1 (std.lv). Con indicadores ordinales: \u03c7\u00b2 escalado y desplazado; RMSEA/CFI/TLI robustos (Savalei, 2021).")),
      actionButton("run", "Analizar", class = "btn-primary"),
      tags$p(class = "note", "No se eliminan filas con ausentes ni se suavizan matrices autom\u00e1ticamente. Recodifica \u00edtems inversos y revisa categor\u00edas antes de analizar. El m\u00ednimo t\u00e9cnico de 30 filas no garantiza una muestra adecuada."),
      tags$a(href = "laboratorio/afe.html", "Gu\u00eda AFE"), tags$br(), tags$a(href = "laboratorio/afc.html", "Gu\u00eda AFC")
    ),
    mainPanel(
      uiOutput("status"),
      tabsetPanel(
        tabPanel("Diagn\u00f3sticos", tags$h4("KMO y Bartlett"), uiOutput("diagnostics"), tags$h4("An\u00e1lisis paralelo"), uiOutput("parallelNote"), uiOutput("parallelTable"),
          tags$h4("Correlaciones"), div(class = "table-wrap", uiOutput("correlations"))),
        tabPanel("Cargas y factores", div(class = "table-wrap", uiOutput("loadings")), tags$h4("Correlaciones entre factores"), uiOutput("phi")),
        tabPanel("Ajuste y residuos", uiOutput("indices"), uiOutput("indicesNote"), tags$h4("Residuos"), div(class = "table-wrap", uiOutput("residuals"))),
        tabPanel("Rotaci\u00f3n",
          tags$p(class = "note", "Misma extracci\u00f3n y n\u00famero de factores con cuatro rotaciones de psych::fa. Para girar los ejes a mano, abre ", tags$a(href = "laboratorio/rotacion.html", "el laboratorio de rotaci\u00f3n"), " o ejecuta shiny::runApp(\"r/rotacion\")."),
          uiOutput("rotCompare"), uiOutput("rotNote"),
          fluidRow(column(4, uiOutput("rotPairUI")), column(8, checkboxInput("rotUnrotated", "Comparar con la soluci\u00f3n sin rotar", TRUE))),
          plotOutput("rotPlane", height = "420px"),
          tags$h4("Estructura (correlaciones \u00edtem-factor) de la rotaci\u00f3n elegida"), div(class = "table-wrap", uiOutput("structure")),
          tags$h4("Congruencia de Tucker con las otras rotaciones"), uiOutput("congruence"))
      ),
      downloadButton("report", "Descargar informe RDS")
    )
  )
)
# Tablas y textos se generan con htmltools, sin capture.output(): asi conservan
# los caracteres no ASCII aunque la sesion de R no tenga un locale UTF-8.
format_value <- function(v, digits = 4, integers = FALSE, small = FALSE) {
  vapply(v, function(x) {
    if (is.na(x) || !is.finite(x)) "No disponible"
    else if (small && x > 0 && x < 10^-digits) paste0("< ", formatC(10^-digits, format = "f", digits = digits))
    else if (integers && abs(x - round(x)) < 1e-12) formatC(x, format = "d", big.mark = "")
    else formatC(x, format = "f", digits = digits)
  }, character(1))
}
html_table <- function(x, digits = 4, rownames = FALSE, integers = FALSE, small = FALSE) {
  x <- as.data.frame(x, check.names = FALSE, stringsAsFactors = FALSE)
  rows <- lapply(seq_len(nrow(x)), function(i) tags$tr(
    if (rownames) tags$th(scope = "row", rownames(x)[i]),
    lapply(x, function(column) if (is.numeric(column)) tags$td(format_value(column[i], digits, integers, small)) else tags$td(class = "text", as.character(column[i])))))
  tags$table(class = "table table-condensed table-hover shiny-table",
    tags$thead(tags$tr(if (rownames) tags$th(scope = "col", ""), lapply(names(x), function(h) tags$th(scope = "col", h)))),
    tags$tbody(rows))
}
server <- function(input, output, session) {
  observeEvent(input$csv, updateRadioButtons(session, "source", selected = "csv"), ignoreInit = TRUE)
  result <- eventReactive(input$run, {
    tryCatch({
      csv <- identical(input$source, "csv")
      if (csv && is.null(input$csv)) factor_stop("Carga un CSV o elige \u00abEjemplo incluido\u00bb.")
      x <- if (csv) factor_read_table(input$csv$datapath, input$separator, input$decimal) else utils::read.csv(file.path(project_root, "data", paste0(input$example, ".csv")))
      label <- if (csv) input$csv$name else paste0("ejemplo \u00ab", input$example, "\u00bb")
      x <- factor_validate_data(x, input$ordinal)
      if (any(!grepl("^[A-Za-z][A-Za-z0-9_]*$", colnames(x)))) factor_stop("Usa nombres de columnas simples: letras sin tilde, n\u00fameros y guion bajo, comenzando por una letra.")
      afe <- input$analysis == "afe"
      if (afe && input$correlation == "poly" && !input$ordinal) factor_stop("Marca \u00abIndicadores ordinales\u00bb para usar polic\u00f3ricas.")
      R <- factor_correlation(x, if (afe) input$correlation else if (input$ordinal) "poly" else "pearson")
      d <- factor_diagnostics(R, nrow(x))
      if (afe) {
        k <- input$count
        if (is.null(k) || length(k) != 1 || !is.finite(k) || k != round(k) || k < 1) factor_stop("Indica en \u00abFactores\u00bb un n\u00famero entero, 1 o m\u00e1s.")
        s <- factor_efa(R, nrow(x), k, input$method, input$rotation)
        # Mismas cargas con las cuatro rotaciones, para la pestana Rotacion.
        rotations <- if (k > 1) lapply(setNames(c("none", "varimax", "oblimin", "promax"), c("none", "varimax", "oblimin", "promax")),
          function(r) tryCatch(factor_efa(R, nrow(x), k, input$method, r), error = function(e) NULL)) else NULL
        pa <- if (isTRUE(input$parallel)) {
          set.seed(5041)
          factor_parallel(x, input$correlation, 100)
        } else NULL
        list(type = "afe", label = label, n = nrow(x), p = ncol(x), R = R, diagnostics = d, solution = s, parallel = pa, ordinal = input$ordinal, rotations = rotations, rotation = input$rotation)
      } else list(type = "afc", label = label, n = nrow(x), p = ncol(x), R = R, diagnostics = d, solution = factor_cfa(x, input$model, input$ordinal), ordinal = input$ordinal)
    }, error = function(e) list(error = conditionMessage(e)))
  })
  good <- reactive({
    r <- result()
    req(r)
    validate(need(is.null(r$error), "Corrige los datos o la especificaci\u00f3n y vuelve a analizar."))
    r
  })
  output$status <- renderUI({
    r <- result()
    req(r)
    lines <- if (!is.null(r$error)) paste("No se pudo completar el an\u00e1lisis:", r$error) else {
      s <- r$solution
      m <- s$measures
      c(
        paste0("Datos: ", r$label, " \u00b7 ", r$n, " personas \u00b7 ", r$p, " indicadores."),
        if (s$admissible) "Par\u00e1metros admisibles." else "Soluci\u00f3n impropia: no interpretes sus resultados como v\u00e1lidos.",
        if (r$type == "afe" && length(s$heywood)) paste0("Caso Heywood o cuasi-Heywood (h\u00b2 > 0,99) en: ", paste(colnames(r$R)[s$heywood], collapse = ", "), ". psych acota la unicidad cerca de 0,005, de modo que no aparece como varianza negativa."),
        if (!isTRUE(s$converged) && r$type == "afe") "No convergi\u00f3.",
        if (r$type == "afc") paste0("gl = momentos \u2212 par\u00e1metros libres = ", m$moments, " \u2212 ", m$npar, " = ", m$df, "."),
        if (r$type == "afc" && r$ordinal) "WLSMV: \u03c7\u00b2 escalado y desplazado; RMSEA/CFI/TLI robustos (Savalei, 2021); SRMR est\u00e1ndar.",
        if (r$type == "afc") s$notes,
        if (r$ordinal && r$type == "afe") "Bartlett sobre polic\u00f3ricas es orientativo. Polic\u00f3ricas: correcci\u00f3n de continuidad 0,5, sin suavizado.",
        if (length(s$warnings)) paste0("Advertencias del paquete (texto original en ingl\u00e9s): ", paste(s$warnings, collapse = "; "))
      )
    }
    tags$div(role = "status", lapply(lines, tags$p))
  })
  output$diagnostics <- renderUI({
    d <- good()$diagnostics
    html_table(setNames(data.frame(d$kmo, d$bartlett$chisq, d$bartlett$df, d$bartlett$p.value), c("KMO", "\u03c7\u00b2 de Bartlett", "gl", "p")), digits = 5, integers = TRUE, small = TRUE)
  })
  output$correlations <- renderUI(html_table(good()$R, digits = 3, rownames = TRUE))
  output$parallelNote <- renderUI({
    p <- good()$parallel
    if (is.null(p)) return(tags$p(class = "note", "Marca \u00abCalcular an\u00e1lisis paralelo\u00bb en AFE para obtener la referencia."))
    tags$p(class = "note", paste0("Factores consecutivos por encima de la referencia: media ", p$suggestedMean, "; percentil 95 ", p$suggested95, ". Es una orientaci\u00f3n, no una decisi\u00f3n autom\u00e1tica. ", p$reference))
  })
  output$parallelTable <- renderUI({
    p <- good()$parallel
    req(p)
    html_table(data.frame(Orden = seq_along(p$observed), Observado = p$observed, Media = p$referenceMean, `Percentil 95` = p$reference95, check.names = FALSE), digits = 4, integers = TRUE)
  })
  output$loadings <- renderUI({
    r <- good()
    s <- r$solution
    if (r$type == "afe") html_table(setNames(data.frame(s$pattern, s$h2, s$u2), c(colnames(s$pattern), "h\u00b2", "u\u00b2")), digits = 4, rownames = TRUE)
    else {
      z <- s$standardized[s$standardized$op == "=~", c("lhs", "rhs", "est.std", "se")]
      html_table(setNames(z, c("Factor", "Indicador", "Carga estandarizada", "EE")), digits = 4)
    }
  })
  output$phi <- renderUI({
    r <- good()
    html_table(if (r$type == "afe") r$solution$phi else lavaan::lavInspect(r$solution$fit, "cor.lv"), digits = 4, rownames = TRUE)
  })
  output$indices <- renderUI({
    r <- good()
    s <- r$solution
    if (r$type == "afe") return(html_table(data.frame(RMSR = s$rmsr, gl = s$df), digits = 5, integers = TRUE))
    m <- s$measures
    chi <- if (r$ordinal) " (escalado y desplazado)" else " (ML)"
    fit <- if (identical(m$fitIndices, "robust")) " (robusto)" else if (identical(m$fitIndices, "scaled")) " (escalado)" else ""
    labels <- c(paste0("\u03c7\u00b2", chi), "gl", "p", paste0("RMSEA", fit), paste0("RMSEA", fit, " \u00b7 IC 90 % inferior"), paste0("RMSEA", fit, " \u00b7 IC 90 % superior"),
      paste0("CFI", fit), paste0("TLI", fit), "SRMR", "Momentos", "Par\u00e1metros libres", if (!r$ordinal) c("AIC", "BIC"))
    values <- c(m$chisq, m$df, m$pvalue, m$rmsea, m$rmseaLower, m$rmseaUpper, m$cfi, m$tli, m$srmr, m$moments, m$npar, if (!r$ordinal) c(m$aic, m$bic))
    html_table(setNames(data.frame(labels, values, stringsAsFactors = FALSE), c("\u00cdndice", "Valor")), digits = 5, integers = TRUE, small = TRUE)
  })
  output$indicesNote <- renderUI({
    r <- good()
    if (r$type == "afe") return(tags$p(class = "note", "RMSR: ra\u00edz media de los residuos de correlaci\u00f3n fuera de la diagonal."))
    tags$p(class = "note", "Orientaci\u00f3n convencional (Hu y Bentler, 1999, con ML y datos continuos): CFI y TLI cercanos a 0,95 o m\u00e1s, RMSEA cercano a 0,06 o menos y SRMR cercano a 0,08 o menos. No son reglas de decisi\u00f3n; dependen del estimador, gl, n y del modelo. AIC/BIC solo comparan modelos ajustados a los mismos datos.")
  })
  output$residuals <- renderUI({
    r <- good()
    html_table(if (r$type == "afe") r$solution$residual else lavaan::lavResiduals(r$solution$fit, type = "cor.bentler")$cov, digits = 4, rownames = TRUE)
  })
  rot_ok <- reactive({
    r <- good()
    validate(need(r$type == "afe" && !is.null(r$rotations) && all(!vapply(r$rotations, is.null, logical(1))), "La comparaci\u00f3n de rotaciones necesita un AFE con dos o m\u00e1s factores."))
    r
  })
  output$rotCompare <- renderUI({
    r <- rot_ok()
    rs <- r$rotations
    secondary <- function(P) max(apply(abs(P), 1, function(z) sort(z, decreasing = TRUE)[2]))
    maxphi <- function(Phi) if (ncol(Phi) < 2) 0 else max(abs(Phi[upper.tri(Phi)]))
    contrib <- function(s) paste(formatC(colSums(s$pattern * s$structure), format = "f", digits = 2), collapse = " \u00b7 ")
    tab <- data.frame(check.names = FALSE, stringsAsFactors = FALSE,
      Medida = c("\u03a3h\u00b2 (varianza com\u00fan total)", "RMSR de los residuos", "Varianza com\u00fan de cada factor", "Mayor |\u03c6| entre factores", "Mayor carga secundaria |\u03bb|"),
      `Sin rotar` = c(formatC(sum(rs$none$h2), format = "f", digits = 3), formatC(rs$none$rmsr, format = "f", digits = 4), contrib(rs$none), "0 (impuesto)", formatC(secondary(rs$none$pattern), format = "f", digits = 2)),
      Varimax = c(formatC(sum(rs$varimax$h2), format = "f", digits = 3), formatC(rs$varimax$rmsr, format = "f", digits = 4), contrib(rs$varimax), "0 (impuesto)", formatC(secondary(rs$varimax$pattern), format = "f", digits = 2)),
      Oblimin = c(formatC(sum(rs$oblimin$h2), format = "f", digits = 3), formatC(rs$oblimin$rmsr, format = "f", digits = 4), contrib(rs$oblimin), formatC(maxphi(rs$oblimin$phi), format = "f", digits = 2), formatC(secondary(rs$oblimin$pattern), format = "f", digits = 2)),
      Promax = c(formatC(sum(rs$promax$h2), format = "f", digits = 3), formatC(rs$promax$rmsr, format = "f", digits = 4), contrib(rs$promax), formatC(maxphi(rs$promax$phi), format = "f", digits = 2), formatC(secondary(rs$promax$pattern), format = "f", digits = 2)))
    html_table(tab)
  })
  output$rotNote <- renderUI({
    rs <- rot_ok()$rotations
    d <- max(vapply(rs, function(s) max(abs(s$h2 - rs$none$h2)), 0))
    tags$p(class = "note", paste0("Las dos primeras filas no cambian (diferencia m\u00e1xima en h\u00b2: ", formatC(d, format = "e", digits = 1), "): rotar no cambia el ajuste ni las comunalidades. Las dem\u00e1s s\u00ed: la rotaci\u00f3n reparte de otra forma la misma varianza com\u00fan. stats::varimax usa una tolerancia relativa de 1e-5; si dudas de un \u00f3ptimo local, prueba GPArotation con randomStarts."))
  })
  output$rotPairUI <- renderUI({
    k <- ncol(rot_ok()$solution$pattern)
    pairs <- utils::combn(k, 2)
    selectInput("rotPair", "Factores del plano", setNames(apply(pairs, 2, paste, collapse = ","), apply(pairs, 2, function(z) paste0("F", z[1], " y F", z[2]))))
  })
  output$rotPlane <- renderPlot({
    r <- rot_ok()
    req(input$rotPair)
    ij <- as.integer(strsplit(input$rotPair, ",")[[1]])
    P <- r$solution$pattern
    U <- r$rotations$none$pattern
    par(mar = c(4.5, 4.5, 1, 1), family = "sans")
    plot(NA, xlim = c(-1, 1), ylim = c(-1, 1), asp = 1, xlab = paste0("F", ij[1]), ylab = paste0("F", ij[2]))
    abline(h = 0, v = 0, col = "#cccccc")
    t <- seq(0, 2 * pi, length.out = 200)
    lines(cos(t), sin(t), col = "#e5e5e5")
    if (isTRUE(input$rotUnrotated) && r$rotation != "none") points(U[, ij[1]], U[, ij[2]], pch = 23, bg = "#cccccc", col = "#999999")
    points(P[, ij[1]], P[, ij[2]], pch = 21, bg = "#2a49d4", col = "white", cex = 1.8)
    text(P[, ij[1]], P[, ij[2]], rownames(P), pos = 4, cex = 0.8)
    legend("bottomleft", bty = "n", pch = c(21, 23), pt.bg = c("#2a49d4", "#cccccc"), col = c("white", "#999999"),
      legend = c(paste0("Patr\u00f3n \u00b7 ", r$rotation), "Sin rotar"))
  })
  output$structure <- renderUI({
    s <- rot_ok()$solution
    html_table(s$structure, digits = 3, rownames = TRUE)
  })
  output$congruence <- renderUI({
    r <- rot_ok()
    cur <- r$solution$pattern
    others <- setdiff(names(r$rotations), r$rotation)
    tab <- do.call(rbind, lapply(others, function(o) {
      cg <- psych::factor.congruence(cur, r$rotations[[o]]$pattern)
      setNames(data.frame(o, paste(formatC(apply(abs(cg), 1, max), format = "f", digits = 3), collapse = " \u00b7 "), stringsAsFactors = FALSE),
        c("Comparada con", "Congruencia m\u00e1xima por factor"))
    }))
    tagList(html_table(tab), tags$p(class = "note", "Valores \u2265 0,95 suelen leerse como factores pr\u00e1cticamente iguales (Lorenzo-Seva y ten Berge, 2006); es una orientaci\u00f3n."))
  })
  output$report <- downloadHandler(filename = function() "analisis-factorial.rds", content = function(file) saveRDS(good(), file))
}
shinyApp(ui, server)
