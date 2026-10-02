triUI <- function(id) {
  ns <- shiny::NS(id)
  shiny::tags$iframe(id=ns("tri"),src="laboratorio/tri.html",
    title="Teor\u00eda de respuesta al \u00edtem",style="width:100%;height:100vh;border:0;display:block;")
}
triServer <- function(id) {
  shiny::moduleServer(id,function(input,output,session) { invisible(NULL) })
}
