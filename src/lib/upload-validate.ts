// Validación de archivos antes de subir a Supabase Storage. Allowlist de MIME +
// tope de tamaño + extensión DERIVADA del MIME (nunca del nombre del archivo, que
// es controlado por el cliente y puede engañar el Content-Type / forzar XSS si el
// bucket es público). Complementar con `allowed_mime_types` en el bucket de Supabase.

/** MIME de imagen permitidos → extensión segura. */
export const IMAGE_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}

/** Imágenes + PDF (comprobantes, adjuntos de cotización). */
export const DOC_MIME: Record<string, string> = {
  ...IMAGE_MIME,
  'application/pdf': 'pdf',
}

export interface UploadCheck {
  ok:     boolean
  error?: string
  /** Extensión segura derivada del MIME (solo si ok). */
  ext?:   string
}

/**
 * Valida tipo y tamaño de un archivo contra un allowlist de MIME.
 * Devuelve la extensión segura derivada del MIME (no del nombre del archivo).
 */
export function validateUpload(
  file: File,
  allowed: Record<string, string> = IMAGE_MIME,
  maxMB = 5,
): UploadCheck {
  const ext = allowed[file.type]
  if (!ext) return { ok: false, error: 'Tipo de archivo no permitido' }
  if (file.size > maxMB * 1024 * 1024) return { ok: false, error: `El archivo supera ${maxMB} MB` }
  return { ok: true, ext }
}
