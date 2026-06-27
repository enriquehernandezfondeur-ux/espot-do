import { validateUpload, IMAGE_MIME, DOC_MIME } from '@/lib/upload-validate'

// Stub mínimo de File (jsdom) — solo necesitamos type y size.
const fileOf = (type: string, sizeBytes: number): File =>
  ({ type, size: sizeBytes, name: 'x' } as unknown as File)

describe('validateUpload', () => {
  it('acepta imagen permitida y deriva la extensión del MIME (no del nombre)', () => {
    expect(validateUpload(fileOf('image/png', 1000), IMAGE_MIME)).toEqual({ ok: true, ext: 'png' })
    expect(validateUpload(fileOf('image/jpeg', 1000), IMAGE_MIME)).toEqual({ ok: true, ext: 'jpg' })
  })

  it('acepta PDF solo con DOC_MIME', () => {
    expect(validateUpload(fileOf('application/pdf', 1000), DOC_MIME)).toEqual({ ok: true, ext: 'pdf' })
    expect(validateUpload(fileOf('application/pdf', 1000), IMAGE_MIME).ok).toBe(false)
  })

  it('rechaza tipos peligrosos (SVG, HTML, ejecutables)', () => {
    expect(validateUpload(fileOf('image/svg+xml', 100), IMAGE_MIME).ok).toBe(false)
    expect(validateUpload(fileOf('text/html', 100), DOC_MIME).ok).toBe(false)
    expect(validateUpload(fileOf('application/octet-stream', 100), DOC_MIME).ok).toBe(false)
  })

  it('rechaza archivos por encima del tope de tamaño', () => {
    expect(validateUpload(fileOf('image/png', 6 * 1024 * 1024), IMAGE_MIME, 5).ok).toBe(false)
    expect(validateUpload(fileOf('image/png', 4 * 1024 * 1024), IMAGE_MIME, 5).ok).toBe(true)
  })
})
