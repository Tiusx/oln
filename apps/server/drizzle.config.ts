import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    databaseId: 'REPLACE_WITH_YOUR_D1_DATABASE_ID',
    accountId: 'REPLACE_WITH_YOUR_CLOUDFLARE_ACCOUNT_ID',
    token: 'REPLACE_WITH_YOUR_CLOUDFLARE_API_TOKEN',
  },
  verbose: true,
  strict: true,
});
