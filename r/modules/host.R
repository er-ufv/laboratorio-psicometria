# Utilidades comunes de los anfitriones Shiny. Archivo en ASCII: funciona
# aunque la sesion de R use un locale C/POSIX.

# Activa un LC_CTYPE UTF-8 si la sesion no lo tiene. Si no es posible, los
# textos de las apps siguen funcionando porque usan escapes Unicode.
psicometria_utf8 <- function() {
  if (isTRUE(l10n_info()[["UTF-8"]])) return(invisible(TRUE))
  candidates <- if (.Platform$OS.type == "windows") {
    c("English_United States.utf8", "Spanish_Spain.utf8", ".UTF-8")
  } else {
    c("C.UTF-8", "C.utf8", "en_US.UTF-8", "es_ES.UTF-8", "en_US.utf8", "es_ES.utf8")
  }
  for (loc in candidates) {
    ok <- suppressWarnings(tryCatch(Sys.setlocale("LC_CTYPE", loc), error = function(e) ""))
    if (nzchar(ok) && isTRUE(l10n_info()[["UTF-8"]])) return(invisible(TRUE))
  }
  message("Aviso: no se pudo activar un locale UTF-8; los textos de la app usan escapes Unicode.")
  invisible(FALSE)
}

# Carpeta temporal que expone solo la web estatica (paginas .html de la raiz,
# assets/ y data/). Evita publicar r/, tests/, docs/ o .git/ mediante
# addResourcePath. Usa enlaces simbolicos y, si no se permiten, copias.
psicometria_web_root <- function(root) {
  root <- normalizePath(root, mustWork = TRUE)
  target <- tempfile("psicometria-web-")
  dir.create(target)
  entries <- c(list.files(root, pattern = "\\.html$"), intersect(c("assets", "data"), list.files(root)))
  for (entry in entries) {
    from <- file.path(root, entry)
    linked <- suppressWarnings(tryCatch(file.symlink(from, file.path(target, entry)), error = function(e) FALSE))
    if (!isTRUE(linked)) {
      if (dir.exists(from)) file.copy(from, target, recursive = TRUE) else file.copy(from, file.path(target, entry))
    }
  }
  target
}
