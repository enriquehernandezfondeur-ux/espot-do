// ── Cliente Azul Payments (República Dominicana) ──────────
// Documentación: https://developers.azul.com.do

const AZUL_PROD_URL = 'https://pagos.azul.com.do/webservices/JSON/Default.aspx'
const AZUL_TEST_URL = 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx'

const IS_PROD     = process.env.NODE_ENV === 'production'
const AZUL_URL    = IS_PROD ? AZUL_PROD_URL : AZUL_TEST_URL
const STORE       = process.env.AZUL_MERCHANT_ID ?? ''
const AUTH1       = process.env.AZUL_AUTH1 ?? ''
const AUTH2       = process.env.AZUL_AUTH2 ?? ''
const CHANNEL     = 'EC'

export interface AzulSalePayload {
  cardNumber:   string   // sin espacios ni guiones
  expiration:   string   // YYYYMM
  cvv:          string
  amount:       number   // en pesos (ej: 1500.00)
  itbis?:       number   // ITBIS/ITBIS (ej: 270.00)
  customOrderId: string  // tu ID único de orden
  orderDesc?:   string
}

export interface AzulSaleResponse {
  success:         boolean
  azulOrderId?:    string
  authCode?:       string
  responseCode?:   string
  responseMessage?: string
  isoCode?:        string
  errorDescription?: string
  rawResponse?:    Record<string, unknown>
}

export async function azulSale(payload: AzulSalePayload): Promise<AzulSaleResponse> {
  if (!STORE || !AUTH1 || !AUTH2) {
    console.error('[Azul] Credenciales no configuradas')
    return { success: false, errorDescription: 'Pasarela de pago no configurada' }
  }

  // Azul recibe el monto en centavos como string (sin punto decimal)
  const amountStr = String(Math.round(payload.amount * 100))
  const itbisStr  = String(Math.round((payload.itbis ?? 0) * 100))

  const body = {
    Channel:             CHANNEL,
    Store:               STORE,
    CardNumber:          payload.cardNumber.replace(/\s/g, ''),
    Expiration:          payload.expiration,      // YYYYMM
    CVC:                 payload.cvv,
    PosInputMode:        'E-Commerce',
    TrxType:             'Sale',
    Amount:              amountStr,
    Itbis:               itbisStr,
    CurrencyPosCode:     '$',
    Payments:            '1',
    Plan:                '0',
    AcquirerRefData:     '1',
    CustomerServicePhone:'8095550000',
    ECommerceUrl:        process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espothub.com',
    CustomOrderId:       payload.customOrderId,
    OrderNumber:         payload.customOrderId,
    SaveToDataVault:     '0',
    DataVaultToken:      null,
    ForceNo3DS:          '0',
  }

  try {
    const res = await fetch(AZUL_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth1':        AUTH1,
        'Auth2':        AUTH2,
        'MerchantType': 'E-Commerce',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[Azul] HTTP error', res.status, text)
      return { success: false, errorDescription: `Error HTTP ${res.status}` }
    }

    const data = await res.json() as Record<string, string>

    // IsoCode "00" = aprobada
    const success = data.IsoCode === '00'

    return {
      success,
      azulOrderId:      data.AzulOrderId,
      authCode:         data.AuthorizationCode,
      responseCode:     data.ResponseCode,
      responseMessage:  data.ResponseMessage,
      isoCode:          data.IsoCode,
      errorDescription: data.ErrorDescription || (!success ? data.ResponseMessage : undefined),
      rawResponse:      data,
    }
  } catch (err) {
    console.error('[Azul] Fetch error', err)
    return { success: false, errorDescription: 'Error de conexión con la pasarela de pago' }
  }
}

// Formatea número de tarjeta para mostrar (agrega espacios cada 4 dígitos)
export function formatCard(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

// Detecta la marca de la tarjeta por el número
export function detectBrand(num: string): 'visa' | 'mastercard' | 'amex' | 'unknown' {
  const n = num.replace(/\D/g, '')
  if (n.startsWith('4'))                    return 'visa'
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n))                    return 'amex'
  return 'unknown'
}
