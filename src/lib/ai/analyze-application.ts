import type { HostApplicationAI } from '@/types'

interface AnalyzePayload {
  businessName:   string
  spaceType:      string
  city:           string
  description:    string
  photoUrls:      string[]
  instagram?:     string
}

const SYSTEM_PROMPT = `Eres un revisor de solicitudes para Espot.do, un marketplace de espacios para eventos en República Dominicana.
Tu trabajo es evaluar si una solicitud de propietario corresponde a un espacio real y legítimo para eventos (salón, restaurante, villa, rooftop, terraza, coworking, etc.).
Responde siempre en formato JSON válido, sin markdown, sin texto adicional.`

const USER_PROMPT = (p: AnalyzePayload) => `Analiza esta solicitud de propietario:

Nombre del negocio: ${p.businessName}
Tipo de espacio: ${p.spaceType}
Ciudad: ${p.city}
Instagram: ${p.instagram || 'No proporcionado'}

Descripción:
"${p.description}"

Fotos proporcionadas: ${p.photoUrls.length} foto(s).

${p.photoUrls.length > 0 ? 'Las imágenes adjuntas son las fotos del espacio.' : 'No se proporcionaron fotos.'}

Evalúa y responde con este JSON exacto:
{
  "photo_score": <0-100, basado en calidad y relevancia de las fotos. 0 si no hay fotos>,
  "description_score": <0-100, basado en claridad, especificidad y coherencia de la descripción>,
  "overall_score": <0-100, promedio ponderado de todos los factores>,
  "photo_notes": "<una oración sobre las fotos>",
  "description_notes": "<una oración sobre la descripción>",
  "overall_summary": "<2-3 oraciones: si parece legítimo, puntos fuertes y débiles>",
  "flags": [<lista de flags si aplica: "sin_fotos", "descripcion_vaga", "descripcion_corta", "posible_spam", "fotos_no_relevantes", "sin_instagram">]
}

Criterios:
- photo_score alto (>70): fotos claras de un espacio real, bien iluminadas, muestran el lugar para eventos
- photo_score bajo (<40): sin fotos, fotos de muy baja calidad, fotos de personas en lugar de espacios, fotos de stock obvias
- description_score alto (>70): describe características específicas del espacio, capacidad, tipo de eventos, ambiente
- description_score bajo (<40): texto genérico, demasiado corto, no describe un venue específico, podría ser copy-paste
- overall_score = (photo_score * 0.6) + (description_score * 0.4)`

export async function analyzeApplication(payload: AnalyzePayload): Promise<HostApplicationAI> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[AI] ANTHROPIC_API_KEY no configurado — usando análisis de fallback')
    return fallbackAnalysis(payload)
  }

  const hasPhotos = payload.photoUrls.length > 0
  // Enviar máximo 3 fotos para controlar costo
  const photosToAnalyze = payload.photoUrls.slice(0, 3)

  const content: unknown[] = []

  // Agregar imágenes si existen
  if (hasPhotos) {
    for (const url of photosToAnalyze) {
      content.push({
        type: 'image',
        source: { type: 'url', url },
      })
    }
  }

  content.push({ type: 'text', text: USER_PROMPT(payload) })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5',
        max_tokens: 512,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      console.error('[AI] Anthropic API error:', response.status, await response.text())
      return fallbackAnalysis(payload)
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> }
    const text = data.content?.find(c => c.type === 'text')?.text ?? ''

    const parsed = JSON.parse(text) as HostApplicationAI
    return {
      photo_score:       clamp(Number(parsed.photo_score)       || 0),
      description_score: clamp(Number(parsed.description_score) || 0),
      overall_score:     clamp(Number(parsed.overall_score)     || 0),
      overall_summary:   parsed.overall_summary   || '',
      photo_notes:       parsed.photo_notes       || '',
      description_notes: parsed.description_notes || '',
      flags:             Array.isArray(parsed.flags) ? parsed.flags : [],
    }
  } catch (err) {
    console.error('[AI] Error analizando solicitud:', err)
    return fallbackAnalysis(payload)
  }
}

function fallbackAnalysis(payload: AnalyzePayload): HostApplicationAI {
  const hasPhotos       = payload.photoUrls.length >= 3
  const descLen         = payload.description.length
  const descScore       = descLen < 80 ? 30 : descLen < 150 ? 55 : descLen < 300 ? 70 : 80
  const photoScore      = !hasPhotos ? 20 : payload.photoUrls.length >= 5 ? 75 : 55
  const overallScore    = Math.round(photoScore * 0.6 + descScore * 0.4)
  const flags: string[] = []
  if (!hasPhotos)       flags.push('sin_fotos')
  if (descLen < 100)    flags.push('descripcion_corta')
  if (!payload.instagram) flags.push('sin_instagram')

  return {
    photo_score:       photoScore,
    description_score: descScore,
    overall_score:     overallScore,
    overall_summary:   'Análisis automático sin IA (ANTHROPIC_API_KEY no configurado). Revisar manualmente.',
    photo_notes:       hasPhotos ? `${payload.photoUrls.length} fotos proporcionadas.` : 'No se proporcionaron fotos.',
    description_notes: `Descripción de ${descLen} caracteres.`,
    flags,
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v))
}
