# Modulo anfitrion: comparte contenido e interfaz con la web estatica.
# No duplica logica matematica ni ejecuta estimaciones en esta primera entrega.
disenoUI <- function(id) {
  ns <- NS(id)
  tags$iframe(id = ns("laboratorio"), src = "laboratorio/index.html",
              title = "Dise\u00f1o y construcci\u00f3n de tests",
              style = "width:100%;height:100vh;border:0;display:block;")
}
disenoServer <- function(id) {
  moduleServer(id, function(input, output, session) { invisible(NULL) })
}
