/**
 * Generate a sortable, URL-safe id (timestamp-prefixed hex).
 * Format: <timestamp_ms_hex><random_hex> — lexicographically sortable by creation time.
 */
export function createId(): string {
  const ts = Date.now().toString(16).padStart(12, '0');
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const randHex = Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('');
  return ts + randHex;
}

/** Basic slugify — good enough for titles/URLs. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Ensure a string is a unique-ish slug; append suffix if needed by caller. */
export function uniqueSlug(input: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  return resolveUnique(slugify(input) || 'untitled', exists);
}

async function resolveUnique(base: string, exists: (s: string) => Promise<boolean>): Promise<string> {
  let slug = base;
  let i = 1;
  while (await exists(slug)) {
    slug = `${base}-${i}`;
    i++;
  }
  return slug;
}
