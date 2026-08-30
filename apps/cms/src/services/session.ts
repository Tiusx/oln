import { eq } from 'drizzle-orm';
import { sessions } from '../db/schema';
import type { AppDb } from '../db';

export const SESSION_COOKIE_NAME = 'blog_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const clearSessionCookie = `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;

function getCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=') ?? null;
  }
  return null;
}

export function readSessionToken(cookieHeader: string | null): string | null {
  return getCookie(cookieHeader, SESSION_COOKIE_NAME);
}

async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const bytes = new Uint8Array(buf);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Look up a session row by raw cookie token. Returns session or undefined. */
export async function findSession(db: AppDb, cookieHeader: string | null) {
  const token = readSessionToken(cookieHeader);
  if (!token) return undefined;
  const tokenHash = await hashToken(token);
  return db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).get();
}

/** Create/replace a session for a user. Returns the set-cookie string. */
export async function createSession(
  db: AppDb,
  userId: string,
): Promise<{ token: string; setCookie: string }> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000);
  await db.insert(sessions).values({
    id: tokenHash.slice(0, 32),
    userId,
    tokenHash,
    expiresAt,
  });
  const setCookie = `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`;
  return { token, setCookie };
}

export async function destroySession(db: AppDb, cookieHeader: string | null): Promise<void> {
  const token = readSessionToken(cookieHeader);
  if (!token) return;
  const tokenHash = await hashToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
