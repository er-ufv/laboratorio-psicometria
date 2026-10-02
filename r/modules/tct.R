# Anfitrion Shiny del modulo web TCT. Los calculos nativos estan en tct_math.R.
tctUI <- function(id) {
  ns <- shiny::NS(id)
  shiny::tags$iframe(id=ns("tct"), src="laboratorio/tct.html",
                     title="Teor\u00eda cl\u00e1sica de los tests",
                     style="width:100%;height:100vh;border:0;display:block;")
}
tctServer <- function(id) {
  shiny::moduleServer(id, function(input, output, session) { invisible(NULL) })
}
