'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Check } from 'lucide-react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { addQuestion, removeQuestion } from '@/lib/actions/activities'
import type { ActivityQuestion, QuestionFieldType } from '@/lib/activities/types'

const TYPE_LABEL: Record<QuestionFieldType, string> = {
  text: 'Texto libre', number: 'Número', boolean: 'Sí / No', choice: 'Selección',
}

const field: React.CSSProperties = {
  fontSize: 16, width: '100%', padding: '10px 12px', borderRadius: 12,
  background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)',
  color: 'var(--text-primary)', outline: 'none',
}

export function QuestionsManager({ activityId, questions }: { activityId: string; questions: ActivityQuestion[] }) {
  const router = useRouter()
  const { confirm, dialog } = useConfirm()
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<QuestionFieldType>('text')
  const [optionsRaw, setOptionsRaw] = useState('')
  const [required, setRequired] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setLabel(''); setType('text'); setOptionsRaw(''); setRequired(false); setError(null); setAdding(false)
  }

  async function add() {
    setError(null)
    setBusy(true)
    const options = type === 'choice'
      ? optionsRaw.split(',').map(o => o.trim()).filter(Boolean)
      : null
    const res = await addQuestion(activityId, { label, field_type: type, options, required })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    reset()
    router.refresh()
  }

  async function remove(q: ActivityQuestion) {
    const ok = await confirm({ title: '¿Quitar esta pregunta?', message: q.label, confirmText: 'Quitar', tone: 'danger' })
    if (!ok) return
    const res = await removeQuestion(q.id, activityId)
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Datos que pides al confirmar.</p>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
            <Plus size={13} /> Agregar pregunta
          </button>
        )}
      </div>

      {/* Form de alta */}
      {adding && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej: ¿Alergias? · Empresa · Talla" style={field} />
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={e => setType(e.target.value as QuestionFieldType)} style={field} aria-label="Tipo">
              {(Object.keys(TYPE_LABEL) as QuestionFieldType[]).map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
            <button type="button" onClick={() => setRequired(r => !r)}
              className="flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium"
              style={{
                background: required ? 'var(--brand-dim)' : 'var(--bg-elevated)',
                border: `1px solid ${required ? 'var(--brand)' : 'var(--border-medium)'}`,
                color: required ? 'var(--brand)' : 'var(--text-secondary)',
              }}>
              {required && <Check size={14} />} Obligatoria
            </button>
          </div>
          {type === 'choice' && (
            <input type="text" value={optionsRaw} onChange={e => setOptionsRaw(e.target.value)}
              placeholder="Opciones separadas por coma. Ej: Sí, No, Tal vez" style={field} />
          )}
          {error && <p className="text-xs" style={{ color: '#B91C1C' }}>{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="flex-1 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Cancelar</button>
            <button type="button" onClick={add} disabled={busy}
              className="flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5"
              style={{ background: 'var(--brand)', color: '#fff', opacity: busy ? 0.7 : 1 }}>
              {busy && <Loader2 size={13} className="animate-spin" />} Guardar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {questions.length === 0 && !adding ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-medium)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sin preguntas extra</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Agrega preguntas para pedir datos al confirmar (alergias, empresa, talla…).</p>
        </div>
      ) : questions.map(q => (
        <div key={q.id} className="rounded-xl p-3.5 flex items-start justify-between gap-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q.label}</span>
              {q.required && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>Obligatoria</span>
              )}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {q.field_type === 'choice' && q.options?.length ? `Opciones: ${q.options.join(' · ')}` : TYPE_LABEL[q.field_type]}
            </div>
          </div>
          <button type="button" onClick={() => remove(q)} aria-label="Quitar pregunta"
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ color: 'var(--text-muted)' }}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      {dialog}
    </div>
  )
}
