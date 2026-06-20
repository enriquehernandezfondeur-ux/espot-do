'use server'

import { createClient } from '@/lib/supabase/server'

export interface MessageTemplate {
  id: string
  body: string
  position: number
}

// Plantillas iniciales con las que arranca un host (luego las edita libremente).
const DEFAULT_TEMPLATES = [
  '¡Hola! Gracias por tu interés. Con gusto les atendemos para su evento.',
  '¿Para cuántas personas sería el evento aproximadamente?',
  '¡Excelente! Tenemos disponibilidad para esa fecha. ¿Deseas proceder con la reserva?',
  'El espacio incluye: sillas, mesas, estacionamiento y acceso desde las 8am. ¿Necesitas algo adicional?',
  'Lamentablemente no tenemos disponibilidad para esa fecha. ¿Tienes alguna fecha alternativa?',
  'El anticipo del 30% confirma tu fecha. El resto se paga según el plan de cuotas.',
]

/** Plantillas del host. Si no tiene ninguna, las siembra con las predeterminadas. */
export async function getMessageTemplates(): Promise<MessageTemplate[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('host_message_templates')
    .select('id, body, position')
    .eq('host_id', user.id)
    .order('position', { ascending: true })

  if (data && data.length > 0) return data as MessageTemplate[]

  // Sembrar predeterminadas la primera vez
  const rows = DEFAULT_TEMPLATES.map((body, i) => ({ host_id: user.id, body, position: i }))
  const { data: seeded } = await supabase
    .from('host_message_templates')
    .insert(rows)
    .select('id, body, position')
  return (seeded ?? []) as MessageTemplate[]
}

export async function addMessageTemplate(body: string): Promise<{ template?: MessageTemplate; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!body.trim()) return { error: 'El mensaje está vacío' }
  const { data, error } = await supabase
    .from('host_message_templates')
    .insert({ host_id: user.id, body: body.trim(), position: 999 })
    .select('id, body, position')
    .single()
  if (error) return { error: error.message }
  return { template: data as MessageTemplate }
}

export async function updateMessageTemplate(id: string, body: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!body.trim()) return { error: 'El mensaje está vacío' }
  const { error } = await supabase
    .from('host_message_templates')
    .update({ body: body.trim() })
    .eq('id', id).eq('host_id', user.id)
  return error ? { error: error.message } : {}
}

export async function deleteMessageTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { error } = await supabase
    .from('host_message_templates')
    .delete()
    .eq('id', id).eq('host_id', user.id)
  return error ? { error: error.message } : {}
}
