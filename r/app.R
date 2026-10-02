# Ejecutar shiny::runApp("r") desde la raiz del proyecto.
source("modules/host.R", local = TRUE)
psicometria_utf8()
library(shiny)
source("modules/diseno.R", local = TRUE)
# Solo se publican las paginas, assets/ y data/; no r/, tests/ ni .git/.
addResourcePath("laboratorio", psicometria_web_root(".."))
ui <- fluidPage(tags$head(tags$style(HTML("html,body,.container-fluid {margin:0;padding:0;height:100%;}"))), disenoUI("diseno"))
server <- function(input, output, session) { disenoServer("diseno") }
shinyApp(ui, server)
