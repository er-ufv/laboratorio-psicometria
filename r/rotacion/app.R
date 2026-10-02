# Laboratorio de rotacion factorial en Shiny. Desde la raiz: shiny::runApp("r/rotacion")
# Archivo en ASCII: los textos usan escapes Unicode y funcionan con cualquier locale.
source("../modules/host.R", local = TRUE)
psicometria_utf8()
library(shiny)
source("../modules/rotation_math.R", local = TRUE)
project_root <- normalizePath("../..", mustWork = TRUE)
addResourcePath("laboratorio", psicometria_web_root(project_root))

presets <- rotation_presets()
preset_names <- list(
  relacionados = c(paste0("O", 1:4), paste0("M", 1:4)),
  independientes = c(paste0("O", 1:4), paste0("M", 1:4)),
  general = c(paste0("O", 1:4), paste0("M", 1:4)),
  complejo = c(paste0("O", 1:3), paste0("M", 1:3), "C1", "C2"))
navy <- "#070e46"; blue <- "#001391"; series <- c("#2a49d4", "#b98409", "#1c8fcc"); ochre <- "#7a5600"

css <- paste0(
  "@font-face{font-family:Manrope;font-style:normal;font-display:swap;font-weight:200 800;src:url(laboratorio/assets/fonts/manrope-latin-wght-normal.woff2) format('woff2')}",
  "body{font-family:Manrope,Arial,sans-serif;background:#f7f8f8;color:#1a1a1a}.container-fluid{max-width:1250px;padding:25px}",
  ".well{background:#fff;border-color:#e5e5e5;box-shadow:none}.btn-primary{background:#001391;border-color:#001391}",
  "h2,h3,h4{color:#001391}a{color:#001391}.home{display:inline-block;padding:10px;border:1px solid #d9edff;border-radius:5px;margin-bottom:15px}",
  ".note{font-size:12px;color:#4d4d4d}.stat{display:inline-block;background:#edf5ff;border-radius:6px;padding:8px 12px;margin:0 8px 8px 0}",
  ".stat b{display:block;font-size:20px;color:#001391}.shiny-table td,.shiny-table th{padding:4px 8px!important;text-align:right}")

parse_loadings <- function(text) {
  lines <- trimws(strsplit(gsub("\r", "", text), "\n")[[1]])
  lines <- lines[nzchar(lines) & !startsWith(lines, "#")]
  rows <- lapply(lines, function(l) strsplit(l, if (grepl("\t", l)) "\t" else if (grepl(";", l)) ";" else "[[:space:]]+")[[1]])
  num <- function(v) suppressWarnings(as.numeric(sub(",", ".", v, fixed = TRUE)))
  if (length(rows) && any(is.na(num(rows[[1]][-1])))) rows <- rows[-1]
  if (length(rows) < 3) stop("Pega al menos tres filas de cargas sin rotar con dos columnas.")
  names <- vapply(seq_along(rows), function(i) if (is.na(num(rows[[i]][1]))) rows[[i]][1] else paste0("I", i), character(1))
  vals <- lapply(rows, function(r) { v <- num(r); v[!is.na(v)] })
  if (any(lengths(vals) != 2)) stop("Este laboratorio manual usa exactamente dos factores; para m\u00e1s, usa la calculadora de la web.")
  A <- do.call(rbind, vals)
  if (any(rowSums(A^2) >= 1)) stop("Alguna fila tiene h\u00b2 \u2265 1: revisa las cargas.")
  list(A = A, names = names, groups = ifelse(abs(A[, 1]) >= abs(A[, 2]), 1, 2), pattern = NULL)
}

ui <- fluidPage(
  tags$head(tags$style(HTML(css))),
  tags$a(class = "home", href = "laboratorio/rotacion.html", "\u2190 Laboratorio de rotaci\u00f3n (web)"),
  titlePanel("Laboratorio de rotaci\u00f3n factorial", windowTitle = "Rotaci\u00f3n factorial"),
  tags$p("Dise\u00f1o, contenidos y direcci\u00f3n: Eduar Ram\u00edrez. Gira los ejes y compara con Varimax y Oblimin (stats y GPArotation)."),
  sidebarLayout(
    sidebarPanel(
      selectInput("data", "Datos", setNames(c(names(presets), "own"), c(vapply(presets, `[[`, "", "label"), "Mis cargas (2 factores)"))),
      conditionalPanel("input.data == 'own'",
        textAreaInput("own", "Cargas sin rotar: una fila por \u00edtem (nombre opcional y dos columnas)", rows = 8,
          value = "I1 0.65 -0.37\nI2 0.61 -0.34\nI3 0.57 -0.32\nI4 0.51 0.48\nI5 0.48 0.44\nI6 0.44 0.41")),
      radioButtons("mode", "Ejes", setNames(c("orth", "obl"), c("Ortogonales", "Oblicuos")), inline = TRUE),
      sliderInput("a1", "Eje F1\u2032 (grados)", min = -180, max = 180, value = 0, step = 1),
      conditionalPanel("input.mode == 'obl'", sliderInput("a2", "Eje F2\u2032 (grados)", min = -180, max = 180, value = 90, step = 1)),
      uiOutput("itemSelect"),
      actionButton("varimax", "Poner Varimax", class = "btn-primary"),
      actionButton("oblimin", "Poner Oblimin"),
      actionButton("reset", "Sin rotar"),
      tags$p(class = "note", "Varimax usa la normalizaci\u00f3n de Kaiser y Oblimin \u03b3 = 0 (quartimin), como psych::fa. Se prueban varios inicios para no quedarse en un \u00f3ptimo local.")
    ),
    mainPanel(
      uiOutput("stats"),
      fluidRow(column(6, plotOutput("plane", height = "460px")), column(6, plotOutput("curve", height = "300px"), uiOutput("curveNote"))),
      h4("Patr\u00f3n, estructura y comunalidad"),
      uiOutput("table"),
      tags$p(class = "note", "Patr\u00f3n = coordenadas paralelas a los ejes (contribuci\u00f3n \u00fanica). Estructura = proyecciones perpendiculares (correlaci\u00f3n \u00edtem-factor). En ejes ortogonales coinciden. h\u00b2 no cambia con ning\u00fan giro.")
    )
  )
)

html_table <- function(df, digits = 3) {
  tags$table(class = "table table-condensed shiny-table",
    tags$thead(tags$tr(lapply(names(df), function(h) tags$th(h)))),
    tags$tbody(lapply(seq_len(nrow(df)), function(i) tags$tr(lapply(df, function(col) tags$td(if (is.numeric(col)) formatC(col[i], format = "f", digits = digits) else col[i]))))))
}

best_angles <- function(A, method) {
  # Varios inicios ortogonales: se conserva el mejor criterio (R parte solo de la identidad).
  starts <- lapply(seq(0, 75, by = 15), function(a) rotation_axes(c(a, a + 90)))
  sols <- lapply(starts, function(T0) {
    B <- A %*% T0
    # GPArotation con tolerancia estricta: stats::varimax (eps = 1e-5) se detiene antes en superficies planas.
    if (method == "varimax") {
      g <- suppressWarnings(GPArotation::Varimax(B, normalize = TRUE, eps = 1e-6, maxit = 3000))
      list(T = T0 %*% g$Th, crit = -rotation_varimax_value(unclass(g$loadings)))
    } else {
      g <- suppressWarnings(GPArotation::oblimin(B, eps = 1e-6, maxit = 3000))
      list(T = T0 %*% g$Th, crit = utils::tail(g$Table[, 2], 1))
    }
  })
  best <- sols[[which.min(vapply(sols, `[[`, 0, "crit"))]]
  T <- best$T
  # Reflexion como psych: cada factor con suma de cargas de patron positiva.
  P <- A %*% t(solve(T))
  T <- T %*% diag(ifelse(colSums(P) < 0, -1, 1))
  atan2(T[2, ], T[1, ]) * 180 / pi
}

server <- function(input, output, session) {
  dataset <- reactive({
    if (input$data == "own") {
      d <- tryCatch(parse_loadings(input$own), error = function(e) e)
      validate(need(!inherits(d, "error"), if (inherits(d, "error")) conditionMessage(d) else ""))
      d
    } else {
      p <- presets[[input$data]]
      A <- rotation_population(p$pattern, p$phi)
      list(A = A, names = preset_names[[input$data]], groups = ifelse(p$pattern[, 1] > 0 & p$pattern[, 2] > 0, 3, ifelse(p$pattern[, 1] > 0, 1, 2)), pattern = p$pattern, phi = p$phi)
    }
  })
  output$itemSelect <- renderUI(selectInput("item", "\u00cdtem para ver sus proyecciones", setNames(seq_along(dataset()$names), dataset()$names)))
  angles <- reactive(if (input$mode == "orth") c(input$a1, input$a1 + 90) else c(input$a1, input$a2))
  solution <- reactive({
    a <- angles()
    validate(need(abs(sin((a[2] - a[1]) * pi / 180)) > sin(15 * pi / 180), "Los ejes est\u00e1n casi paralelos: sep\u00e1ralos al menos 15\u00b0."))
    rotation_manual(dataset()$A, a)
  })
  wrap <- function(x) ((x + 180) %% 360) - 180
  set_angles <- function(a) {
    a <- wrap(a)
    updateSliderInput(session, "a1", value = round(a[1]))
    updateSliderInput(session, "a2", value = round(a[2]))
  }
  observeEvent(input$reset, set_angles(c(0, 90)))
  observeEvent(input$varimax, set_angles(best_angles(dataset()$A, "varimax")))
  observeEvent(input$oblimin, {
    if (input$mode == "orth") updateRadioButtons(session, "mode", selected = "obl")
    set_angles(best_angles(dataset()$A, "oblimin"))
  })
  output$stats <- renderUI({
    s <- solution()
    phi <- s$phi[1, 2]
    tags$div(
      tags$span(class = "stat", tags$b(formatC(phi, format = "f", digits = 3)), "\u03c6 entre ejes"),
      tags$span(class = "stat", tags$b(paste0(round(acos(max(-1, min(1, phi))) * 180 / pi), "\u00b0")), "\u00e1ngulo entre ejes"),
      tags$span(class = "stat", tags$b(formatC(s$criterion["varimax"], format = "f", digits = 3)), "criterio Varimax"),
      tags$span(class = "stat", tags$b(formatC(s$criterion["quartimin"], format = "f", digits = 4)), "criterio Quartimin"),
      tags$span(class = "stat", tags$b(formatC(sum(s$h2), format = "f", digits = 3)), "\u03a3h\u00b2"))
  })
  output$plane <- renderPlot({
    d <- dataset(); s <- solution(); a <- angles() * pi / 180
    T <- rbind(cos(a), sin(a))
    par(mar = c(1, 1, 1, 1), family = "sans")
    plot(NA, xlim = c(-1.15, 1.15), ylim = c(-1.15, 1.15), asp = 1, axes = FALSE, xlab = "", ylab = "")
    t <- seq(0, 2 * pi, length.out = 200)
    lines(cos(t), sin(t), col = "#b3b3b3")
    abline(h = 0, v = 0, lty = 2, col = "#999999")
    i <- as.integer(if (is.null(input$item)) 1 else input$item)
    v <- d$A[i, ]
    for (j in 1:2) {
      foot <- s$structure[i, j] * T[, j]
      segments(v[1], v[2], foot[1], foot[2], col = ochre, lty = 3, lwd = 2)
      if (input$mode == "obl") {
        pt <- s$pattern[i, j] * T[, j]
        segments(v[1], v[2], pt[1], pt[2], col = blue, lty = 2, lwd = 2)
      }
    }
    for (j in 1:2) {
      arrows(-1.05 * T[1, j], -1.05 * T[2, j], 1.05 * T[1, j], 1.05 * T[2, j], col = navy, lwd = 3, length = 0.1)
      text(1.12 * T[1, j], 1.12 * T[2, j], paste0("F", j, "\u2032"), col = navy, font = 2)
    }
    points(d$A[, 1], d$A[, 2], pch = 21, bg = series[d$groups], col = "white", cex = 2)
    text(d$A[, 1], d$A[, 2], d$names, pos = 4, cex = 0.85)
    points(v[1], v[2], cex = 3, col = navy, lwd = 2)
  })
  output$curve <- renderPlot({
    A <- dataset()$A
    g <- seq(-90, 90, by = 1)
    V <- vapply(g, function(x) rotation_varimax_value(rotation_manual(A, c(x, x + 90))$pattern), 0)
    par(mar = c(4, 4, 2, 1), family = "sans")
    plot(g, V, type = "l", lwd = 2, col = series[1], xlab = "Giro de ejes ortogonales (grados)", ylab = "Criterio Varimax", main = "Varimax seg\u00fan el giro", xaxt = "n")
    axis(1, at = seq(-90, 90, 30))
    x <- wrap(input$a1)
    if (input$mode == "orth" && abs(x) <= 90) points(x, rotation_varimax_value(solution()$pattern), pch = 23, bg = series[2], cex = 2)
  })
  output$curveNote <- renderUI(tags$p(class = "note", "La curva se repite cada 90\u00b0: girar 90\u00b0 intercambia o refleja los factores. El rombo marca tu giro (ejes ortogonales)."))
  output$table <- renderUI({
    d <- dataset(); s <- solution()
    df <- setNames(data.frame(d$names, s$pattern[, 1], s$pattern[, 2], s$structure[, 1], s$structure[, 2], s$h2),
      c("\u00cdtem", "Patr\u00f3n F1\u2032", "Patr\u00f3n F2\u2032", "Estructura F1\u2032", "Estructura F2\u2032", "h\u00b2"))
    html_table(df)
  })
}
shinyApp(ui, server)
