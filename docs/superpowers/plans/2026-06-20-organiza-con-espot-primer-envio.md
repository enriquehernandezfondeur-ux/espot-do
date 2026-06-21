# Organiza con Espot — Plan de implementación (primer envío)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el loop core de Organiza con Espot — crear una actividad, vincularla a una reserva/espacio o ubicación externa, compartir una página pública, y recibir confirmaciones sin que el invitado cree cuenta — con la página pública instrumentada como canal de adquisición.

**Architecture:** Entidad nueva del cliente (`activities` + `activity_questions` + `activity_participants`) con RLS por `organizer_id`. Server actions del organizador con `createClient()` + `auth.getUser()`; lectura/alta pública vía service-role gateada por `public_enabled` (patrón `t/[slug]`). UI dentro de `dashboard/(client)` reutilizando el sistema visual del CRM; página pública `/a/[code]` con tema público limpio. Plantillas por tipo en código, no en BD.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (Postgres + RLS + service-role), Tailwind v4 (variables de tema), Jest. Migración SQL aplicada a mano en Supabase (el push no corre SQL).

**Alcance de este plan (primer envío):** F0 datos · F1 crear/listar · F2 mínimo (preguntas por defecto del tipo, sin editor) · F3 página pública + RSVP · compartir (link + QR) · instrumentación de adquisición.
**Fuera de este plan (fase 2, ya especificada):** editor de preguntas personalizado, recordatorios Twilio, check-in móvil, panel de preparación del host, afinado de recomendación de espacios.

**Reglas del repo:** fechas con `new Date(d + 'T12:00')`; inputs `font-size:16px`; solo variables CSS de tema; no push/SQL/deploy automático; verde marca `var(--brand)` solo en estado activo y CTA primario.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `supabase/migrations/20260620_activities.sql` | 3 tablas + RLS + índices |
| `src/lib/activities/public-code.ts` | Generador base62 de `public_code` (lógica pura, testeable) |
| `src/lib/activities/types.ts` | Tipos TS de la feature |
| `src/lib/activities/templates.ts` | Mapa `tipo → {label, icon, preguntas[]}` (lógica pura, testeable) |
| `src/lib/activities/validate.ts` | Validación de payloads (lógica pura, testeable) |
| `src/lib/actions/activities.ts` | CRUD del organizador (auth) |
| `src/lib/actions/activity-public.ts` | Lectura pública + alta de participante (service-role) |
| `src/app/dashboard/(client)/actividades/page.tsx` | Lista "Mis actividades" |
| `src/app/dashboard/(client)/actividades/nueva/NuevaActividadClient.tsx` | Wizard 3 pasos |
| `src/app/dashboard/(client)/actividades/[id]/page.tsx` | Detalle/gestión |
| `src/components/activities/ActivityCard.tsx` | Card de actividad (lista) |
| `src/components/activities/ActivityTypePicker.tsx` | Grid de tipos |
| `src/components/activities/ShareSheet.tsx` | Link + QR + compartir |
| `src/app/a/[code]/page.tsx` | Página pública (server, force-dynamic) |
| `src/app/a/[code]/RsvpClient.tsx` | Formulario RSVP del invitado |
| Sidebar del cliente | Item "Actividades" |

---

## Task 1: Lógica de `public_code` (base62, anti-colisión)

**Files:**
- Create: `src/lib/activities/public-code.ts`
- Test: `src/lib/__tests__/activities-public-code.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/activities-public-code.test.ts
import { generatePublicCode, isValidPublicCode } from '@/lib/activities/public-code'

describe('public-code', () => {
  it('generates an 8-char base62 code', () => {
    const code = generatePublicCode()
    expect(code).toHaveLength(8)
    expect(/^[0-9A-Za-z]{8}$/.test(code)).toBe(true)
  })
  it('is statistically unique across 5000 generations', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 5000; i++) seen.add(generatePublicCode())
    expect(seen.size).toBe(5000)
  })
  it('validates format', () => {
    expect(isValidPublicCode('aB3xZ9q1')).toBe(true)
    expect(isValidPublicCode('short')).toBe(false)
    expect(isValidPublicCode('has space')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest activities-public-code -i`
Expected: FAIL with "Cannot find module '@/lib/activities/public-code'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/activities/public-code.ts
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const LEN = 8

/** Código público corto para /a/[code]. Usa crypto para evitar colisiones. */
export function generatePublicCode(): string {
  const bytes = new Uint8Array(LEN)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < LEN; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

export function isValidPublicCode(code: string): boolean {
  return /^[0-9A-Za-z]{8}$/.test(code)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest activities-public-code -i`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/activities/public-code.ts src/lib/__tests__/activities-public-code.test.ts
git commit -m "feat(actividades): generador de public_code base62"
```

---

## Task 2: Tipos y plantillas por tipo de actividad

**Files:**
- Create: `src/lib/activities/types.ts`
- Create: `src/lib/activities/templates.ts`
- Test: `src/lib/__tests__/activities-templates.test.ts`

- [ ] **Step 1: Write the types (no test — pure declarations)**

```ts
// src/lib/activities/types.ts
export type ActivityType =
  | 'podcast' | 'sesion_foto' | 'taller' | 'reunion'
  | 'casting' | 'cena' | 'cumpleanos' | 'networking' | 'otro'

export type ActivityStatus =
  | 'borrador' | 'publicada' | 'en_curso' | 'finalizada' | 'cancelada'

export type LocationMode = 'booking' | 'space' | 'external'

export type QuestionFieldType = 'text' | 'choice' | 'boolean' | 'number'

export interface ActivityQuestion {
  id: string
  activity_id: string
  label: string
  field_type: QuestionFieldType
  options: string[] | null
  required: boolean
  sort_order: number
}

export type ParticipantStatus = 'invitado' | 'confirmado' | 'rechazado' | 'registrado'

export interface ActivityParticipant {
  id: string
  activity_id: string
  name: string
  contact: string | null
  status: ParticipantStatus
  companions: number
  answers: Record<string, string> | null
  rsvp_token: string
  checked_in_at: string | null
  created_at: string
}

export interface Activity {
  id: string
  organizer_id: string
  type: ActivityType
  title: string
  description: string | null
  status: ActivityStatus
  event_date: string | null      // 'YYYY-MM-DD'
  start_time: string | null      // 'HH:MM'
  end_time: string | null
  expected_people: number | null
  location_mode: LocationMode | null
  booking_id: string | null
  space_id: string | null
  external_location: string | null
  cover_image: string | null
  public_code: string
  public_enabled: boolean
  allow_companions: boolean
  require_checkin: boolean
  created_at: string
  updated_at: string
}

/** Pregunta semilla de plantilla (sin id/activity_id todavía). */
export interface TemplateQuestion {
  label: string
  field_type: QuestionFieldType
  options?: string[]
  required?: boolean
}

export interface ActivityTemplate {
  type: ActivityType
  label: string
  icon: string            // nombre de icono lucide-react
  questions: TemplateQuestion[]
}
```

- [ ] **Step 2: Write the failing test for templates**

```ts
// src/lib/__tests__/activities-templates.test.ts
import { ACTIVITY_TEMPLATES, getTemplate, ACTIVITY_TYPE_ORDER } from '@/lib/activities/templates'

describe('activity templates', () => {
  it('has a template for every type in the picker order', () => {
    for (const t of ACTIVITY_TYPE_ORDER) {
      expect(getTemplate(t)).toBeDefined()
      expect(getTemplate(t)!.label.length).toBeGreaterThan(0)
    }
  })
  it('every template question has a non-empty label and valid field_type', () => {
    for (const tpl of Object.values(ACTIVITY_TEMPLATES)) {
      for (const q of tpl.questions) {
        expect(q.label.length).toBeGreaterThan(0)
        expect(['text', 'choice', 'boolean', 'number']).toContain(q.field_type)
        if (q.field_type === 'choice') expect(Array.isArray(q.options)).toBe(true)
      }
    }
  })
  it('getTemplate falls back to "otro" for unknown type', () => {
    // @ts-expect-error intentional bad input
    expect(getTemplate('inexistente').type).toBe('otro')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest activities-templates -i`
Expected: FAIL with "Cannot find module '@/lib/activities/templates'".

- [ ] **Step 4: Write minimal implementation**

```ts
// src/lib/activities/templates.ts
import type { ActivityTemplate, ActivityType } from './types'

export const ACTIVITY_TYPE_ORDER: ActivityType[] = [
  'podcast', 'sesion_foto', 'taller', 'reunion',
  'casting', 'cena', 'cumpleanos', 'networking', 'otro',
]

export const ACTIVITY_TEMPLATES: Record<ActivityType, ActivityTemplate> = {
  podcast: { type: 'podcast', label: 'Podcast / Grabación', icon: 'Mic', questions: [
    { label: '¿Eres invitado o staff?', field_type: 'choice', options: ['Invitado', 'Staff'], required: true },
    { label: 'Tema o nombre del episodio', field_type: 'text' },
  ]},
  sesion_foto: { type: 'sesion_foto', label: 'Sesión de fotos/video', icon: 'Camera', questions: [
    { label: 'Rol', field_type: 'choice', options: ['Cliente', 'Modelo', 'Fotógrafo', 'Equipo técnico'], required: true },
  ]},
  taller: { type: 'taller', label: 'Taller / Capacitación', icon: 'GraduationCap', questions: [
    { label: 'Empresa', field_type: 'text' },
    { label: 'Rol', field_type: 'text' },
  ]},
  reunion: { type: 'reunion', label: 'Reunión', icon: 'Briefcase', questions: [
    { label: 'Empresa', field_type: 'text' },
  ]},
  casting: { type: 'casting', label: 'Casting / Entrevista', icon: 'Clapperboard', questions: [
    { label: 'Portafolio o link', field_type: 'text' },
  ]},
  cena: { type: 'cena', label: 'Cena privada', icon: 'UtensilsCrossed', questions: [
    { label: '¿Alergias o restricciones?', field_type: 'text' },
  ]},
  cumpleanos: { type: 'cumpleanos', label: 'Cumpleaños / Celebración', icon: 'Cake', questions: [
    { label: '¿Cuántos vienen contigo?', field_type: 'number' },
  ]},
  networking: { type: 'networking', label: 'Networking', icon: 'Users', questions: [
    { label: 'Empresa / proyecto', field_type: 'text' },
  ]},
  otro: { type: 'otro', label: 'Otro', icon: 'Sparkles', questions: [] },
}

export function getTemplate(type: ActivityType): ActivityTemplate {
  return ACTIVITY_TEMPLATES[type] ?? ACTIVITY_TEMPLATES.otro
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest activities-templates -i`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/activities/types.ts src/lib/activities/templates.ts src/lib/__tests__/activities-templates.test.ts
git commit -m "feat(actividades): tipos y plantillas por tipo"
```

---

## Task 3: Validación de payloads (lógica pura)

**Files:**
- Create: `src/lib/activities/validate.ts`
- Test: `src/lib/__tests__/activities-validate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/activities-validate.test.ts
import { validateCreateActivity, validateRsvp } from '@/lib/activities/validate'

describe('validateCreateActivity', () => {
  const base = { type: 'podcast', title: 'Mi pod', location_mode: 'external', external_location: 'Calle 1' }
  it('accepts a valid payload', () => {
    expect(validateCreateActivity(base as any).ok).toBe(true)
  })
  it('rejects empty title', () => {
    const r = validateCreateActivity({ ...base, title: '  ' } as any)
    expect(r.ok).toBe(false); expect(r.error).toMatch(/nombre/i)
  })
  it('requires a location for the chosen mode', () => {
    const r = validateCreateActivity({ ...base, external_location: '' } as any)
    expect(r.ok).toBe(false); expect(r.error).toMatch(/ubicaci/i)
  })
  it('requires booking_id when mode=booking', () => {
    const r = validateCreateActivity({ type: 'podcast', title: 'x', location_mode: 'booking' } as any)
    expect(r.ok).toBe(false)
  })
})

describe('validateRsvp', () => {
  it('rejects empty name', () => {
    expect(validateRsvp({ name: '', companions: 0 }).ok).toBe(false)
  })
  it('caps companions at 20', () => {
    const r = validateRsvp({ name: 'Ana', companions: 99 })
    expect(r.ok).toBe(false); expect(r.error).toMatch(/acompa/i)
  })
  it('accepts a valid rsvp', () => {
    expect(validateRsvp({ name: 'Ana', companions: 2 }).ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest activities-validate -i`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/activities/validate.ts
import type { LocationMode } from './types'

export const MAX_COMPANIONS = 20
type Result = { ok: true } | { ok: false; error: string }

export function validateCreateActivity(p: {
  type?: string; title?: string; location_mode?: LocationMode
  external_location?: string; booking_id?: string; space_id?: string
}): Result {
  if (!p.type) return { ok: false, error: 'Falta el tipo de actividad.' }
  if (!p.title || !p.title.trim()) return { ok: false, error: 'Escribe un nombre para la actividad.' }
  if (!p.location_mode) return { ok: false, error: 'Elige una ubicación.' }
  if (p.location_mode === 'external' && !p.external_location?.trim())
    return { ok: false, error: 'Escribe la dirección de la ubicación.' }
  if (p.location_mode === 'booking' && !p.booking_id)
    return { ok: false, error: 'Elige la reserva a vincular.' }
  if (p.location_mode === 'space' && !p.space_id)
    return { ok: false, error: 'Elige un espacio.' }
  return { ok: true }
}

export function validateRsvp(p: { name?: string; companions?: number }): Result {
  if (!p.name || !p.name.trim()) return { ok: false, error: 'Escribe tu nombre.' }
  const c = p.companions ?? 0
  if (c < 0 || c > MAX_COMPANIONS) return { ok: false, error: `Máximo ${MAX_COMPANIONS} acompañantes.` }
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest activities-validate -i`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/activities/validate.ts src/lib/__tests__/activities-validate.test.ts
git commit -m "feat(actividades): validación de payloads"
```

---

## Task 4: Migración de base de datos

**Files:**
- Create: `supabase/migrations/20260620_activities.sql`

> Nota: el push NO aplica SQL. Tras crear el archivo, el dueño lo corre a mano en el SQL Editor de Supabase. Verificación = consultas manuales (este repo no tiene tests de integración de RLS).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260620_activities.sql
-- Organiza con Espot — actividades del cliente (entidad nueva, separada de external_events)

CREATE TABLE IF NOT EXISTS activities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'borrador'
                      CHECK (status IN ('borrador','publicada','en_curso','finalizada','cancelada')),
  event_date        DATE,
  start_time        TIME,
  end_time          TIME,
  expected_people   INTEGER,
  location_mode     TEXT CHECK (location_mode IN ('booking','space','external')),
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  space_id          UUID REFERENCES spaces(id)   ON DELETE SET NULL,
  external_location TEXT,
  cover_image       TEXT,
  public_code       TEXT NOT NULL UNIQUE,
  public_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  allow_companions  BOOLEAN NOT NULL DEFAULT TRUE,
  require_checkin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_organizer_idx ON activities(organizer_id);
CREATE INDEX IF NOT EXISTS activities_public_code_idx ON activities(public_code);
CREATE INDEX IF NOT EXISTS activities_booking_idx ON activities(booking_id);
CREATE INDEX IF NOT EXISTS activities_space_idx ON activities(space_id);

CREATE TABLE IF NOT EXISTS activity_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  field_type  TEXT NOT NULL DEFAULT 'text'
                CHECK (field_type IN ('text','choice','boolean','number')),
  options     JSONB,
  required    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS activity_questions_activity_idx ON activity_questions(activity_id);

CREATE TABLE IF NOT EXISTS activity_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id   UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact       TEXT,
  status        TEXT NOT NULL DEFAULT 'confirmado'
                  CHECK (status IN ('invitado','confirmado','rechazado','registrado')),
  companions    INTEGER NOT NULL DEFAULT 0 CHECK (companions >= 0 AND companions <= 20),
  answers       JSONB,
  rsvp_token    TEXT NOT NULL UNIQUE,
  checked_in_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_participants_activity_idx ON activity_participants(activity_id);

-- RLS: solo el organizador toca sus filas. La lectura/alta pública va por service-role.
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_owner" ON activities
  FOR ALL USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "activity_questions_owner" ON activity_questions
  FOR ALL USING (EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.organizer_id = auth.uid()));

CREATE POLICY "activity_participants_owner" ON activity_participants
  FOR ALL USING (EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.organizer_id = auth.uid()));
```

- [ ] **Step 2: Commit (no aplicar todavía)**

```bash
git add supabase/migrations/20260620_activities.sql
git commit -m "feat(actividades): migración (3 tablas + RLS + índices)"
```

- [ ] **Step 3: Verificación manual (la corre el dueño en Supabase)**

1. Pegar el SQL en el SQL Editor → ejecutar.
2. Como usuario A: `insert into activities(...)` → OK; `select` devuelve la fila.
3. Como usuario B: `select * from activities` → 0 filas del usuario A (aislamiento RLS).
4. `delete from activities where id = ...` → desaparecen sus `activity_questions` y `activity_participants` (cascade).

---

## Task 5: Server actions del organizador

**Files:**
- Create: `src/lib/actions/activities.ts`

> Sin test unitario automatizado (toca BD/auth; el repo no tiene harness de integración). La lógica pura ya está cubierta en Tasks 1–3. Verificación = QA manual en Step 3.

- [ ] **Step 1: Implement the actions**

```ts
// src/lib/actions/activities.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generatePublicCode } from '@/lib/activities/public-code'
import { getTemplate } from '@/lib/activities/templates'
import { validateCreateActivity } from '@/lib/activities/validate'
import type { Activity, ActivityType, LocationMode } from '@/lib/activities/types'

export interface CreateActivityInput {
  type: ActivityType
  title: string
  event_date?: string | null
  start_time?: string | null
  end_time?: string | null
  expected_people?: number | null
  location_mode: LocationMode
  booking_id?: string | null
  space_id?: string | null
  external_location?: string | null
}

export async function createActivity(input: CreateActivityInput) {
  const v = validateCreateActivity(input)
  if (!v.ok) return { ok: false as const, error: v.error }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }

  const code = generatePublicCode()
  const { data, error } = await supabase.from('activities').insert({
    organizer_id: user.id,
    type: input.type,
    title: input.title.trim(),
    event_date: input.event_date ?? null,
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    expected_people: input.expected_people ?? null,
    location_mode: input.location_mode,
    booking_id: input.booking_id ?? null,
    space_id: input.space_id ?? null,
    external_location: input.external_location ?? null,
    public_code: code,
    public_enabled: true,
    status: 'publicada',
  }).select('id').single()

  if (error || !data) return { ok: false as const, error: 'No se pudo crear la actividad.' }

  // Sembrar preguntas de la plantilla del tipo
  const tpl = getTemplate(input.type)
  if (tpl.questions.length) {
    await supabase.from('activity_questions').insert(
      tpl.questions.map((q, i) => ({
        activity_id: data.id, label: q.label, field_type: q.field_type,
        options: q.options ?? null, required: q.required ?? false, sort_order: i,
      })),
    )
  }

  revalidatePath('/dashboard/actividades')
  return { ok: true as const, id: data.id as string }
}

export async function getMyActivities(): Promise<Activity[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('organizer_id', user.id)
    .order('event_date', { ascending: true, nullsFirst: false })
  return (data ?? []) as Activity[]
}

export async function getActivityDetail(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: activity } = await supabase
    .from('activities').select('*').eq('id', id).eq('organizer_id', user.id).single()
  if (!activity) return null
  const { data: questions } = await supabase
    .from('activity_questions').select('*').eq('activity_id', id).order('sort_order')
  const { data: participants } = await supabase
    .from('activity_participants').select('*').eq('activity_id', id).order('created_at')
  return { activity, questions: questions ?? [], participants: participants ?? [] }
}

export async function cancelActivity(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }
  const { error } = await supabase.from('activities')
    .update({ status: 'cancelada', public_enabled: false, updated_at: new Date().toISOString() })
    .eq('id', id).eq('organizer_id', user.id)
  if (error) return { ok: false as const, error: 'No se pudo cancelar.' }
  revalidatePath('/dashboard/actividades')
  return { ok: true as const }
}
```

- [ ] **Step 2: Verify type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errores de tipo.

- [ ] **Step 3: QA manual (tras aplicar la migración)**

Login como cliente → llamar `createActivity` desde la UI (Task 7) → la fila aparece en `getMyActivities` → `getActivityDetail` trae preguntas sembradas.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/activities.ts
git commit -m "feat(actividades): server actions del organizador"
```

---

## Task 6: Server action pública (service-role, gateada)

**Files:**
- Create: `src/lib/actions/activity-public.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/actions/activity-public.ts
'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { isValidPublicCode } from '@/lib/activities/public-code'
import { validateRsvp } from '@/lib/activities/validate'

/** Vista pública: solo campos no sensibles. NUNCA expone la lista de participantes. */
export async function getPublicActivity(code: string) {
  if (!isValidPublicCode(code)) return null
  const supabase = createServiceClient()
  const { data: activity } = await supabase
    .from('activities')
    .select('id, type, title, description, event_date, start_time, end_time, location_mode, external_location, space_id, cover_image, public_enabled, allow_companions')
    .eq('public_code', code).single()
  if (!activity || !activity.public_enabled) return null

  const { data: questions } = await supabase
    .from('activity_questions')
    .select('id, label, field_type, options, required, sort_order')
    .eq('activity_id', activity.id).order('sort_order')

  let space = null
  if (activity.location_mode === 'space' && activity.space_id) {
    const { data } = await supabase
      .from('spaces').select('name, address, city, lat, lng').eq('id', activity.space_id).single()
    space = data
  }
  return { activity, questions: questions ?? [], space }
}

export async function submitRsvp(input: {
  code: string; name: string; contact?: string
  companions?: number; answers?: Record<string, string>
}) {
  const v = validateRsvp(input)
  if (!v.ok) return { ok: false as const, error: v.error }
  if (!isValidPublicCode(input.code)) return { ok: false as const, error: 'Enlace inválido.' }

  const supabase = createServiceClient()
  const { data: activity } = await supabase
    .from('activities').select('id, public_enabled, allow_companions')
    .eq('public_code', input.code).single()
  if (!activity || !activity.public_enabled) return { ok: false as const, error: 'Esta actividad ya no recibe confirmaciones.' }

  const token = `${input.code}-${crypto.randomUUID()}`
  const { error } = await supabase.from('activity_participants').insert({
    activity_id: activity.id,
    name: input.name.trim(),
    contact: input.contact?.trim() || null,
    status: 'confirmado',
    companions: activity.allow_companions ? (input.companions ?? 0) : 0,
    answers: input.answers ?? null,
    rsvp_token: token,
  })
  if (error) return { ok: false as const, error: 'No se pudo confirmar. Intenta de nuevo.' }
  return { ok: true as const }
}
```

- [ ] **Step 2: Confirm the service helper name**

Run: `grep -n "export" src/lib/supabase/service.ts`
Expected: una función exportada que crea el cliente service-role. Si se llama distinto a `createServiceClient`, ajustar el import en este archivo a ese nombre exacto.

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add src/lib/actions/activity-public.ts
git commit -m "feat(actividades): lectura pública + RSVP por service-role"
```

---

## Task 7: UI — Lista, wizard y detalle (organizador)

**Files:**
- Create: `src/components/activities/ActivityCard.tsx`
- Create: `src/components/activities/ActivityTypePicker.tsx`
- Create: `src/app/dashboard/(client)/actividades/page.tsx`
- Create: `src/app/dashboard/(client)/actividades/nueva/page.tsx` (+ `NuevaActividadClient.tsx`)
- Create: `src/app/dashboard/(client)/actividades/[id]/page.tsx`
- Modify: sidebar del cliente (añadir item "Actividades")

> UI con verificación visual manual en los 3 temas/tamaños (constraint de QA del repo). Reutiliza `EmptyState`, `Skeleton`, `LoadError`, `StatusBadge`, control segmentado activo `var(--brand)`, `ConfirmDialog`/`useConfirm`, `SpaceCard`. Inputs `font-size:16px`.

- [ ] **Step 1: `ActivityCard.tsx`** — Card con portada/placeholder, título (truncado), fecha (`new Date(event_date + 'T12:00')`), ubicación, `StatusBadge`, contador "N confirmados", botón "Gestionar". Props: `{ activity: Activity, confirmedCount: number }`.

- [ ] **Step 2: `ActivityTypePicker.tsx`** — Grid 2–4 col de `ACTIVITY_TYPE_ORDER` con icono `lucide-react` (por `template.icon`) y `template.label`. Props: `{ value, onChange }`. Activo: borde + fondo `var(--brand-dim)`, texto `var(--brand)`.

- [ ] **Step 3: Lista `actividades/page.tsx`** — Server component: `getMyActivities()`. Header "Actividades" + `[+ Crear]`. Control segmentado Próximas/Pasadas (split por `event_date` vs hoy con `T12:00`). `EmptyState` ("Crea tu primera actividad") si vacío. Grid de `ActivityCard`.

- [ ] **Step 4: Wizard `nueva/NuevaActividadClient.tsx`** — 3 pasos con control segmentado de progreso:
  1. **Tipo** → `ActivityTypePicker`.
  2. **Detalles** → nombre, fecha, horario inicio/fin, # personas.
  3. **Ubicación** → 3 radios con **divulgación progresiva**: `external` (input dirección) · `booking` (lista de reservas del cliente → card-resumen al elegir) · `space` (buscador + grid `SpaceCard`; al elegir, autorrelleno de dirección/fotos/aforo).
  Botón final → `createActivity(input)`; en `{ok:false}` mostrar `error` inline sin perder datos; en `{ok:true}` → `router.push('/dashboard/actividades/'+id)`.

- [ ] **Step 5: Detalle `[id]/page.tsx`** — Server: `getActivityDetail(id)`; si null → `notFound()`. Header: ← título, `StatusBadge`, fecha/ubicación, `[Compartir]` (abre `ShareSheet`, Task 8), menú `⋯` con "Cancelar" (`useConfirm` → `cancelActivity`). Tabs: Resumen (contadores: confirmados / acompañantes), Participantes (lista nombre + estado + acompañantes + respuestas), Preguntas (solo-lectura de las sembradas en este envío).

- [ ] **Step 6: Sidebar** — Añadir item "Actividades" (icono `CalendarCheck`) al nav del cliente, ruta `/dashboard/actividades`.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit && npm run build`
Verificación visual: crear una actividad de cada modo de ubicación; lista muestra estados vacío/cargando; móvil y `white-theme` coherentes.

- [ ] **Step 8: Commit**

```bash
git add src/components/activities src/app/dashboard/\(client\)/actividades
git commit -m "feat(actividades): lista, wizard y detalle del organizador"
```

---

## Task 8: Compartir (link + QR)

**Files:**
- Create: `src/components/activities/ShareSheet.tsx`
- Add dep: `qrcode` (o `qrcode.react`)

- [ ] **Step 1: Install QR lib**

Run: `npm i qrcode.react`
Expected: añadida a package.json.

- [ ] **Step 2: `ShareSheet.tsx`** — Modal con: URL pública `https://espot.do/a/{code}`, botón "Copiar enlace" (`navigator.clipboard`), QR (`<QRCodeSVG value={url} />`), botón "Compartir" (Web Share API si existe, fallback `wa.me?text=`). Props: `{ code: string, title: string }`. CTA primario `var(--brand)`.

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit && npm run build
git add src/components/activities/ShareSheet.tsx package.json package-lock.json
git commit -m "feat(actividades): compartir link + QR"
```

---

## Task 9: Página pública `/a/[code]` + RSVP + adquisición

**Files:**
- Create: `src/app/a/[code]/page.tsx`
- Create: `src/app/a/[code]/RsvpClient.tsx`

- [ ] **Step 1: `page.tsx` (server, force-dynamic)**

```tsx
// src/app/a/[code]/page.tsx
import { notFound } from 'next/navigation'
import { getPublicActivity } from '@/lib/actions/activity-public'
import { RsvpClient } from './RsvpClient'

export const dynamic = 'force-dynamic'

export default async function PublicActivityPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const data = await getPublicActivity(code)
  if (!data) notFound()
  return <RsvpClient code={code} data={data} />
}
```

- [ ] **Step 2: `RsvpClient.tsx`** — Tema público limpio (NO `white-theme`), móvil-first, una columna:
  - Portada (o placeholder de marca) → título → fecha (`T12:00`) → horario → ubicación (espacio: nombre+dirección+mapa; externa: dirección) → "Organizado con [nombre]".
  - Form: nombre (req), acompañantes (`<select 0..20>` solo si `allow_companions`), una entrada por `question` (text/number/choice/boolean), `font-size:16px`.
  - Submit → `submitRsvp({code, name, contact, companions, answers})`; en error: mensaje inline **sin perder datos**; en éxito: estado de confirmación cálido ("¡Confirmado! Te esperamos.").
  - **Privacidad**: nunca renderizar otros participantes.
  - **Pie de adquisición**: "Organizado con Espot" → `https://espot.do?ref=actividad` (discreto). Registrar vista con el helper de analytics existente (`src/lib/analytics`) con evento `public_activity_view` y `public_activity_cta_click`.

- [ ] **Step 3: 404 amable**

Modify: `src/app/a/[code]/page.tsx` — en vez de `notFound()` crudo, opcionalmente renderizar un componente "Esta actividad no está disponible" con CTA "Explorar Espot" → `/`. (Si se usa `notFound()`, asegurar que `not-found.tsx` global sea amable.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run build`
Manual: abrir `/a/{code}` de una actividad publicada → confirmar como invitado → aparece en el detalle del organizador (Task 7, tab Participantes). Abrir un code inexistente → 404 amable. `public_enabled=false` → 404.

- [ ] **Step 5: Commit**

```bash
git add src/app/a
git commit -m "feat(actividades): página pública + RSVP sin cuenta + adquisición"
```

---

## Self-Review

**1. Cobertura del spec (primer envío):**
- F0 datos → Task 4 ✅ · public_code → Task 1 ✅
- F1 crear/listar/detalle → Tasks 5, 7 ✅ · vínculo reserva/espacio/externa → Task 7 Step 4 ✅
- F2 mínimo (preguntas sembradas por tipo) → Task 2 + Task 5 (seed) + Task 7 Step 5 (solo-lectura) ✅
- F3 página pública + RSVP sin cuenta + privacidad → Tasks 6, 9 ✅
- Compartir link+QR → Task 8 ✅
- Adquisición instrumentada → Task 9 Step 2 ✅
- Estados vacío/error (revisión de diseño) → Task 7 Step 3, Task 9 Steps 2–3 ✅
- Anti-abuso (tope acompañantes) → Task 3 + CHECK en SQL Task 4 ✅

**2. Placeholders:** ninguno; cada paso con código o contrato concreto + comando.

**3. Consistencia de tipos:** `Activity`/`ActivityQuestion`/`ActivityParticipant` (Task 2) usados igual en Tasks 5/6/7/9. `createActivity`/`getMyActivities`/`getActivityDetail`/`cancelActivity` (Task 5) y `getPublicActivity`/`submitRsvp` (Task 6) referenciados con esos nombres exactos en la UI. `generatePublicCode`/`isValidPublicCode` (Task 1) consistentes.

**Pendiente a verificar en ejecución (no bloqueante):** nombre exacto del export en `src/lib/supabase/service.ts` (Task 6 Step 2) y la firma del helper en `src/lib/analytics` (Task 9 Step 2).

**Fuera de este plan (fase 2):** editor de preguntas, recordatorios Twilio, check-in móvil, panel host read-only, afinado de recomendación. Documentados en el spec de diseño.
