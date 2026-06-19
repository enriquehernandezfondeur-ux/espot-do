# Espot 2.0 — F4: Panel Normal vs Pro + activación manual admin

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o superpowers:executing-plans.

**Goal:** Hacer visible "Espot Pro": página comparativa + estado de suscripción en el panel del host, badge Pro, y activación manual por admin (puente para probar Pro end-to-end sin Azul). El gating de funciones reales (external events/CRM) y el cobro Azul llegan en F5/F7.

**Architecture:** Server actions sobre `host_subscriptions` (creadas en F2). Helper puro `subscriptionSummary` para presentación. El admin activa Pro manualmente (`payment_provider='manual'`), que actualiza `profiles.plan_type` y deja `is_pro_host()` en true. UI con tokens del tema actual (host-theme), sin rediseño.

**Tech Stack:** Next.js 16 server actions, React 19 client pages, Supabase, Jest, lucide-react.

---

## File Structure

**Crear:**
- `src/components/PlanBadge.tsx` — badge "Espot Pro".
- `src/app/dashboard/host/pro/page.tsx` — comparativa + estado + CTA (client, patrón dashboard).

**Modificar:**
- `src/lib/plans.ts` — `subscriptionSummary()` puro.
- `src/lib/__tests__/plans.test.ts` — tests del summary.
- `src/lib/actions/subscription.ts` — `getMySubscription()`, `startProRequest()`, `adminSetHostPlan()`.
- `src/components/dashboard/Sidebar.tsx` — link "Espot Pro".
- `src/app/admin/usuarios/[id]/page.tsx` — control admin de plan (activar/extender/cancelar).

**Diferido a F5:** `<PlanGate>` + upsell en puntos de fricción + RLS de escritura Pro.

---

## Task 1: `plans.ts` — subscriptionSummary + tests
Helper puro que deriva { plan, isPro, statusLabel, nextChargeISO, daysLeft }. Tests para active/pending/cancelled/sin-sub. `npx jest` verde. Commit.

## Task 2: `subscription.ts` — actions
- `getMySubscription()` → { plan, status, currentPeriodEnd } (resuelve host dueño).
- `startProRequest()` (host) → crea `pending_payment` si no hay viva.
- `adminSetHostPlan(hostId, 'activate'|'extend'|'cancel')` (admin) → puente manual; actualiza `profiles.plan_type`.
`npx tsc --noEmit` OK. Commit.

## Task 3: `PlanBadge` + Sidebar link + Pro page
- `PlanBadge.tsx` (Crown + tokens).
- Sidebar: `{ href:'/dashboard/host/pro', label:'Espot Pro', icon: Crown }`.
- `pro/page.tsx`: estado actual (summary) + comparativa Normal/Pro + CTA (startProRequest).
`tsc + build` OK. Commit.

## Task 4: Control admin de plan en usuarios/[id]
Sección "Plan" con botones activar/extender/cancelar → `adminSetHostPlan`. `tsc + build` OK. Commit.

## Task 5: Verificación integral
`npx tsc --noEmit && npm run build && npx jest` verde.

## Self-Review
- Spec §6/§7 (panel + comparativa + estado + badge + activación) ✅.
- Pro probable end-to-end vía activación manual admin (sin depender de Azul) ✅.
- Gating real de features + upsell contextual → F5 (consciente).
- Tokens del tema, sin rediseño ✅.
