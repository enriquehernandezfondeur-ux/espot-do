/**
 * Regresión del cliente Azul PaymentPage.
 *
 * El ALGORITMO real (orden de campos + UTF-16LE + HMAC-SHA512 + key anexada)
 * está validado contra el vector de prueba OFICIAL de Azul en
 * `/api/admin/azul-check` (merchant 39038540035 "Prueba AZUL"). Estos tests
 * NO re-validan ese vector (requiere la AuthKey de prueba de Azul como secreto),
 * sino que CONGELAN el comportamiento con una key ficticia: si alguien cambia
 * el orden de campos, el encoding o el formato de monto/ITBIS, el hash deja de
 * coincidir y el test falla — evitando romper pagos en silencio.
 */

// Env determinista — debe quedar fijado ANTES de importar el módulo.
process.env.AZUL_MERCHANT_ID    = '39624010001'
process.env.AZUL_MERCHANT_NAME  = 'ESPOT, S.R.L.'
process.env.AZUL_PRIVATE_KEY    = 'TEST_KEY_FOR_UNIT_TESTS'
process.env.NEXT_PUBLIC_SITE_URL = 'https://espot.do'
delete process.env.AZUL_ITBIS_RATE          // rate 0 → Amount = total, ITBIS = '000'
delete process.env.AZUL_RETURN_BASE_URL
delete process.env.AZUL_CURRENCY_CODE        // default 'RD$'

import { buildPaymentPageFields, verifyResponseHash, type AzulResponseParams } from '@/lib/azul/client'
import { createHmac } from 'crypto'

const PARAMS = {
  amount:      1500,
  itbis:       0,
  orderNumber: 'ESP-TEST-001',
  bookingId:   'abcd1234-0000-0000-0000-000000000000',
}

describe('buildPaymentPageFields', () => {
  const { pageUrl, fields } = buildPaymentPageFields(PARAMS)

  it('formatea el monto en centavos y el ITBIS como "000" cuando rate=0', () => {
    expect(fields.Amount).toBe('150000') // 1500.00 → centavos
    expect(fields.ITBIS).toBe('000')
  })

  it('construye las URLs de retorno con el bookingId', () => {
    expect(fields.ApprovedUrl).toBe('https://espot.do/pago/exitoso?b=abcd1234-0000-0000-0000-000000000000')
    expect(fields.DeclinedUrl).toBe('https://espot.do/pago/fallido?b=abcd1234-0000-0000-0000-000000000000')
    expect(fields.CancelUrl).toBe('https://espot.do/pago/cancelado?b=abcd1234-0000-0000-0000-000000000000')
  })

  it('incluye todos los campos requeridos por PaymentPage', () => {
    for (const k of [
      'MerchantId','TrxType','MerchantName','MerchantType','CurrencyCode','OrderNumber',
      'Amount','ITBIS','ApprovedUrl','DeclinedUrl','CancelUrl',
      'UseCustomField1','CustomField1Label','CustomField1Value',
      'UseCustomField2','CustomField2Label','CustomField2Value','SaveToDataVault','AuthHash',
    ]) {
      expect(fields).toHaveProperty(k)
    }
    expect(fields.TrxType).toBe('Sale')
    expect(pageUrl).toMatch(/azul\.com\.do/)
  })

  it('CONGELA el AuthHash (orden de campos + UTF-16LE) — si cambia, rompe pagos', () => {
    expect(fields.AuthHash).toBe(
      'bf7180c69456de1cf6e5f8b639d271d9e9b4a0c41285d74b11be7642a7d60c4d' +
      'e8a0abbbac09902a12f8ef4cefae1e4b88418dc16980244e3288eb34af58da2f'
    )
    expect(fields.AuthHash).toMatch(/^[0-9a-f]{128}$/)
  })

  it('un monto distinto produce un hash distinto', () => {
    const other = buildPaymentPageFields({ ...PARAMS, amount: 2000 })
    expect(other.fields.AuthHash).not.toBe(fields.AuthHash)
  })
})

describe('verifyResponseHash', () => {
  const base: AzulResponseParams = {
    OrderNumber: 'ESP-TEST-001', Amount: '150000', AuthorizationCode: 'OK123',
    DateTime: '2026-06-17', ResponseCode: '00', IsoCode: '00',
    ResponseMessage: 'Aprobada', ErrorDescription: '', RRN: 'RRN001',
    AuthHash: '37BA0B5B4157824CF7CB6CE1D0BDF25C565FDC44197551A3CE85D027B06FD292' +
              'D5FABE9776AD2D85F76832F07B84B093883D074F7711C694197553DB992FEFA8',
  }

  it('acepta una respuesta con hash válido (round-trip)', () => {
    expect(verifyResponseHash(base)).toBe(true)
  })

  it('rechaza si manipulan el monto', () => {
    expect(verifyResponseHash({ ...base, Amount: '1' })).toBe(false)
  })

  it('rechaza un AuthHash vacío o de longitud incorrecta', () => {
    expect(verifyResponseHash({ ...base, AuthHash: '' })).toBe(false)
    expect(verifyResponseHash({ ...base, AuthHash: 'abc' })).toBe(false)
  })

  it('acepta hash en minúsculas (comparación case-insensitive)', () => {
    const lower = createHmac('sha512', 'TEST_KEY_FOR_UNIT_TESTS')
      .update(Buffer.from(
        ['ESP-TEST-001','150000','OK123','2026-06-17','00','00','Aprobada','','RRN001','TEST_KEY_FOR_UNIT_TESTS'].join(''),
        'utf16le'))
      .digest('hex') // minúsculas
    expect(verifyResponseHash({ ...base, AuthHash: lower })).toBe(true)
  })
})
