// ── Azul PaymentPage — República Dominicana ───────────────
// Modelo: página de pago alojada por Azul (no API directa).
// Azul recoge los datos de tarjeta en su dominio. Nosotros
// solo generamos la firma HMAC-SHA512 y redirigimos al usuario.

import { createHmac } from 'crypto'

// MerchantType debe coincidir EXACTAMENTE con lo registrado en Azul (ej: 'E-Commerce', 'Retail', 'Marketplace')
// Configura AZUL_MERCHANT_TYPE en Vercel si 'Marketplace' no funciona.
const MERCHANT_TYPE = process.env.AZUL_MERCHANT_TYPE ?? 'Marketplace'

// ── Construir campos firmados para PaymentPage ────────────
export interface AzulPageParams {
  amount:      number   // en pesos RD$ (ej: 1500.00)
  itbis?:      number   // ITBIS — 0 por defecto
  orderNumber: string   // ID único de orden
  bookingId:   string   // para construir las URLs de retorno
  cuotaId?:    string   // ID de la cuota específica (installment) si aplica
}

export interface AzulPageFields {
  pageUrl: string
  fields:  Record<string, string>
}

export function buildPaymentPageFields(params: AzulPageParams): AzulPageFields {
  // Leer siempre en tiempo de ejecución para capturar las variables de Vercel
  const MERCHANT_ID   = process.env.AZUL_MERCHANT_ID   ?? ''
  const MERCHANT_NAME = process.env.AZUL_MERCHANT_NAME ?? 'ESPOT, S.R.L.'
  const PRIVATE_KEY   = process.env.AZUL_PRIVATE_KEY   ?? ''
  const SITE          = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'
  const IS_PROD       = process.env.NODE_ENV === 'production'
  const PAGE_URL      = process.env.AZUL_PAYMENT_PAGE_URL
    ?? (IS_PROD
      ? 'https://pagos.azul.com.do/PaymentPage/Default.aspx'
      : 'https://pruebas.azul.com.do/paymentpage/Default.aspx')

  if (!MERCHANT_ID) throw new Error('Falta AZUL_MERCHANT_ID en las variables de entorno de Vercel.')
  if (!PRIVATE_KEY) throw new Error('Falta AZUL_PRIVATE_KEY en las variables de entorno de Vercel.')

  // ITBIS dominicano: 18%.
  // Si AZUL_ITBIS_RATE > 0: Amount = neto (sin ITBIS), Itbis = neto * rate
  // → Amount + Itbis = total que el cliente paga (igual que el precio original)
  // Si AZUL_ITBIS_RATE = 0 (default): Amount = total, Itbis = 0
  const ITBIS_RATE  = Number(process.env.AZUL_ITBIS_RATE ?? '0')
  let amountCents: number
  let itbisCents:  number
  if (ITBIS_RATE > 0) {
    // Separar neto e ITBIS del precio total
    const netCents  = Math.round(params.amount * 100 / (1 + ITBIS_RATE))
    itbisCents      = Math.round(params.amount * 100) - netCents
    amountCents     = netCents
  } else {
    amountCents = Math.round(params.amount * 100)
    itbisCents  = 0
  }
  const amountStr = String(amountCents)
  // ITBIS=0 se envía como "000" (formato requerido por Azul)
  const itbisStr  = itbisCents === 0 ? '000' : String(itbisCents)

  // AZUL_RETURN_BASE_URL permite usar un dominio diferente a NEXT_PUBLIC_SITE_URL
  // para las URLs de retorno — necesario cuando Azul tiene registrado un dominio
  // distinto al dominio principal de la app (ej: espot.do vs espothub.com).
  const BASE        = process.env.AZUL_RETURN_BASE_URL ?? SITE
  const cuotaQuery  = params.cuotaId ? `&cuota=${params.cuotaId}` : ''
  const approvedUrl = `${BASE}/pago/exitoso?b=${params.bookingId}${cuotaQuery}`
  const declinedUrl = `${BASE}/pago/fallido?b=${params.bookingId}${cuotaQuery}`
  const cancelUrl   = `${BASE}/pago/cancelado?b=${params.bookingId}${cuotaQuery}`

  const CURRENCY    = process.env.AZUL_CURRENCY_CODE ?? 'RD$'

  // Custom fields — siempre incluidos en hash (requerido por Azul)
  const useCustomField1    = '0'
  const customField1Label  = ''
  const customField1Value  = ''
  const useCustomField2    = '0'
  const customField2Label  = ''
  const customField2Value  = ''

  // El hash incluye todos los campos + el private key al final del mensaje
  // (según documentación oficial de Azul PaymentPage)
  const hashInput = [
    MERCHANT_ID,
    MERCHANT_NAME,
    MERCHANT_TYPE,
    CURRENCY,
    params.orderNumber,
    amountStr,
    itbisStr,
    approvedUrl,
    declinedUrl,
    cancelUrl,
    useCustomField1,
    customField1Label,
    customField1Value,
    useCustomField2,
    customField2Label,
    customField2Value,
    PRIVATE_KEY,
  ].join('')

  const authHash = createHmac('sha512', PRIVATE_KEY)
    .update(hashInput)
    .digest('hex')

  return {
    pageUrl: PAGE_URL,
    fields: {
      MerchantId:        MERCHANT_ID,
      TrxType:           'Sale',
      MerchantName:      MERCHANT_NAME,
      MerchantType:      MERCHANT_TYPE,
      CurrencyCode:      CURRENCY,
      OrderNumber:       params.orderNumber,
      Amount:            amountStr,
      ITBIS:             itbisStr,
      ApprovedUrl:       approvedUrl,
      DeclinedUrl:       declinedUrl,
      CancelUrl:         cancelUrl,
      UseCustomField1:   useCustomField1,
      CustomField1Label: customField1Label,
      CustomField1Value: customField1Value,
      UseCustomField2:   useCustomField2,
      CustomField2Label: customField2Label,
      CustomField2Value: customField2Value,
      SaveToDataVault:   '0',
      AuthHash:          authHash,
    },
  }
}

// ── Verificar hash de respuesta de Azul ──────────────────
// Azul envía estos params al regresar al ApprovedUrl.
// Debemos verificar el hash antes de confirmar la reserva.
export interface AzulResponseParams {
  OrderNumber:       string
  Amount:            string
  ITBIS:             string
  ResponseMessage:   string
  IsoCode:           string
  AuthorizationCode: string
  DateTime:          string
  AzulOrderId:       string
  AuthHash:          string
}

export function verifyResponseHash(p: AzulResponseParams): boolean {
  const PRIVATE_KEY = process.env.AZUL_PRIVATE_KEY ?? ''
  if (!PRIVATE_KEY) return false

  const input = [
    p.OrderNumber,
    p.Amount,
    p.ITBIS,
    p.ResponseMessage,
    p.IsoCode,
    p.AuthorizationCode,
    p.DateTime,
    p.AzulOrderId,
  ].join('')

  const expected = createHmac('sha512', PRIVATE_KEY)
    .update(input)
    .digest('hex')
    .toUpperCase()

  return expected === (p.AuthHash ?? '').toUpperCase()
}

// ── Utilidades de formato de tarjeta (para display) ──────
export function formatCard(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

export function detectBrand(num: string): 'visa' | 'mastercard' | 'amex' | 'unknown' {
  const n = num.replace(/\D/g, '')
  if (n.startsWith('4'))                       return 'visa'
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n))                        return 'amex'
  return 'unknown'
}
