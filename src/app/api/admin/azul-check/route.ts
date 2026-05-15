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

  // Verificar hash con valores EXACTOS del ejemplo oficial de Azul
  const EXPECTED = '6662f1e52260cf845a848845e6769ece7ef173c2809ea215f1fc8907442a21f395bdfbb8422eb4d6ce8673eb6961beb730d97842e8030668516beba717ffff5b'
  let hashOk = false
  let computedHash = ''
  let hashError = ''
  try {
    const { createHmac } = await import('crypto')
    const msg = [
      '39038540035', 'Prueba AZUL', 'ECommerce', '$',
      '001', '10000', '000',
      'https://google.com', 'https://google.com', 'https://google.com',
      '0', '', '', '0', '', '',
      PRIVATE_KEY,
    ].join('')
    computedHash = createHmac('sha512', PRIVATE_KEY).update(msg).digest('hex')
    hashOk = computedHash === EXPECTED
  } catch (e: any) {
    hashError = e.message
  }

  return NextResponse.json({
    config: {
      MERCHANT_ID,
      MERCHANT_NAME,
      MERCHANT_TYPE,
      CURRENCY:     process.env.AZUL_CURRENCY_CODE ?? '(no set)',
      PAGE_URL:     PAGE_URL || '(no set)',
      PRIVATE_KEY_LENGTH: PRIVATE_KEY.length,
    },
    hashVerification: {
      ok:            hashOk,
      computed:      computedHash.slice(0, 32) + '...',
      expected:      EXPECTED.slice(0, 32) + '...',
      result:        hashOk
        ? '✅ PRIVATE_KEY correcta — hash coincide con el ejemplo de Azul'
        : '❌ PRIVATE_KEY incorrecta o tiene caracteres extra — hash NO coincide',
    },
    fieldChecks: {
      merchantName:  MERCHANT_NAME === 'Prueba AZUL' ? '✅ Correcto' : `❌ Incorrecto — tienes "${MERCHANT_NAME}", debe ser "Prueba AZUL"`,
      merchantType:  MERCHANT_TYPE === 'ECommerce'   ? '✅ Correcto' : `❌ Incorrecto — tienes "${MERCHANT_TYPE}", debe ser "ECommerce"`,
      merchantId:    MERCHANT_ID   === '39038540035' ? '✅ Correcto' : `❌ Incorrecto — tienes "${MERCHANT_ID}"`,
      currency:      (process.env.AZUL_CURRENCY_CODE ?? '') === '$' ? '✅ Correcto' : `❌ Incorrecto — debe ser "$"`,
    },
    readyToPay: hashOk && MERCHANT_NAME === 'Prueba AZUL' && MERCHANT_TYPE === 'ECommerce',
    error: hashError || undefined,
  })
}
