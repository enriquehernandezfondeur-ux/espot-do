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
