/**
 * Password hashing using PBKDF2 (Web Crypto).
 * Format stored in DB: pbkdf2$100000$<saltB64>$<hashB64>
 */

const ITERATIONS = 100_000;
const KEY_LEN = 32;
const ALGO = 'PBKDF2';

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function hashPassword(password: string, salt?: Uint8Array): Promise<string> {
  const s = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    ALGO,
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: ALGO, hash: 'SHA-256', iterations: ITERATIONS, salt: s },
    keyMaterial,
    KEY_LEN * 8,
  );
  return `pbkdf2$${ITERATIONS}$${toB64(s)}$${toB64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  const salt = fromB64(parts[2]);
  const expected = fromB64(parts[3]);
  const actualB64 = await hashPasswordRaw(password, salt, iterations);
  const actual = fromB64(actualB64);
  if (actual.length !== expected.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

async function hashPasswordRaw(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    ALGO,
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: ALGO, hash: 'SHA-256', iterations, salt },
    keyMaterial,
    KEY_LEN * 8,
  );
  return toB64(bits);
}
