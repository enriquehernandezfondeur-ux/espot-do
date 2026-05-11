import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/azul-check
// Solo accesible por el superadmin. Muestra el estado de las variables de Azul
// y genera un hash de prueba para verificar que la firma funciona.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== (process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const MERCHANT_ID   = process.env.AZUL_MERCHANT_ID    ?? ''
  const MERCHANT_NAME = process.env.AZUL_MERCHANT_NAME  ?? ''
  const MERCHANT_TYPE = process.env.AZUL_MERCHANT_TYPE  ?? 'Marketplace'
  const PRIVATE_KEY   = process.env.AZUL_PRIVATE_KEY    ?? ''
  const PAGE_URL      = process.env.AZUL_PAYMENT_PAGE_URL ?? ''
  const SITE          = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const NODE_ENV      = process.env.NODE_ENV ?? ''

  // Generar un hash de prueba para confirmar que la firma funciona
  let testHash = ''
  let hashError = ''
  try {
    const { createHmac } = await import('crypto')
    const testInput = [
      MERCHANT_ID,
      MERCHANT_NAME || 'ESPOT, S.R.L.',
      MERCHANT_TYPE,
      '$',
      'TEST-ORDER-001',
      '100000', // RD$1,000.00 en centavos
      '0',
      `${SITE}/pago/exitoso?b=test`,
      `${SITE}/pago/fallido?b=test`,
      `${SITE}/pago/cancelado?b=test`,
    ].join('')

    testHash = createHmac('sha512', PRIVATE_KEY)
      .update(testInput)
      .digest('hex')
      .toUpperCase()
      .slice(0, 16) + '...' // Solo primeros 16 chars por seguridad
  } catch (e: any) {
    hashError = e.message
  }

  const resolvedPageUrl = PAGE_URL || (NODE_ENV === 'production'
    ? 'https://pagos.azul.com.do/PaymentPage/Default.aspx'
    : 'https://pruebas.azul.com.do/paymentpage/Default.aspx')

  return NextResponse.json({
    variables: {
      AZUL_MERCHANT_ID:       MERCHANT_ID   ? `${MERCHANT_ID.slice(0, 4)}...` : '❌ NO CONFIGURADA',
      AZUL_MERCHANT_NAME:     MERCHANT_NAME || '⚠️  No configurada (usará "ESPOT, S.R.L.")',
      AZUL_PRIVATE_KEY:       PRIVATE_KEY   ? `${PRIVATE_KEY.slice(0, 6)}... (${PRIVATE_KEY.length} chars)` : '❌ NO CONFIGURADA',
      AZUL_PAYMENT_PAGE_URL:  PAGE_URL      || `⚠️  No configurada (usará: ${resolvedPageUrl})`,
      NEXT_PUBLIC_SITE_URL:   SITE          || '❌ NO CONFIGURADA',
      NODE_ENV,
    },
    resolvedValues: {
      pageUrl:        resolvedPageUrl,
      merchantType:   MERCHANT_TYPE,
      merchantTypeEnv: process.env.AZUL_MERCHANT_TYPE ? '✅ Desde AZUL_MERCHANT_TYPE' : '⚠️  Usando default "Marketplace" — confirma con Azul',
      currencyCode:   '$',
    },
    hashTest: {
      generated: testHash || null,
      error:     hashError || null,
      note:      testHash ? '✅ La firma HMAC funciona correctamente' : '❌ Error generando firma',
    },
    issues: [
      !MERCHANT_ID   && 'AZUL_MERCHANT_ID no está configurada en Vercel',
      !PRIVATE_KEY   && 'AZUL_PRIVATE_KEY no está configurada en Vercel',
      !SITE          && 'NEXT_PUBLIC_SITE_URL no está configurada',
      MERCHANT_ID && MERCHANT_ID.includes(' ') && 'AZUL_MERCHANT_ID tiene espacios — copiala sin espacios',
      PRIVATE_KEY && PRIVATE_KEY.includes(' ') && 'AZUL_PRIVATE_KEY tiene espacios — copiala sin espacios',
    ].filter(Boolean),
  })
}
