import { z } from 'zod';
import type { AppDb } from '../db';
import { getSetting, setSetting } from './config';

// ---------------------------------------------------------------------------
// Third-party storage configuration (persisted in the settings table)
// ---------------------------------------------------------------------------

export const r2ConfigSchema = z.object({
  accountId: z.string().default(''),
  accessKeyId: z.string().default(''),
  secretAccessKey: z.string().default(''),
  bucketName: z.string().default(''),
  endpoint: z.string().optional().default(''),
});

export const githubConfigSchema = z.object({
  repo: z.string().default(''),
  path: z.string().default(''),
  token: z.string().default(''),
});

export const storageConfigSchema = z.object({
  provider: z.enum(['local', 'r2', 'github']).default('local'),
  r2: r2ConfigSchema.default({}),
  github: githubConfigSchema.default({}),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;

const STORAGE_KEY = 'storage_config';

export const DEFAULT_STORAGE_CONFIG: StorageConfig = storageConfigSchema.parse({});

/** Load the storage configuration. */
export async function loadStorageConfig(db: AppDb): Promise<StorageConfig> {
  const raw = await getSetting(db, STORAGE_KEY);
  if (!raw) return DEFAULT_STORAGE_CONFIG;
  try {
    const parsed = storageConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_STORAGE_CONFIG;
  } catch {
    return DEFAULT_STORAGE_CONFIG;
  }
}

/** Persist the storage configuration. */
export async function saveStorageConfig(db: AppDb, config: StorageConfig): Promise<StorageConfig> {
  const valid = storageConfigSchema.parse(config);
  await setSetting(db, STORAGE_KEY, JSON.stringify(valid));
  return valid;
}

/** Providers that have a working listing integration in this deployment. */
export const LISTABLE_PROVIDERS = ['local'] as const;

/** Whether a provider currently supports browsing/uploading resources. */
export function isListable(provider: string): boolean {
  return (LISTABLE_PROVIDERS as readonly string[]).includes(provider);
}
