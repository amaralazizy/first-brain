import { defineConfig } from 'drizzle-kit';
import path from 'path';
import { config } from 'dotenv';

// Load .env.local from the web app (dev) then .env.production as fallback
config({ path: path.resolve(__dirname, '../../web/.env.local') });
config({ path: path.resolve(__dirname, '../../web/.env.production'), override: false });

export default defineConfig({
  schema: path.resolve(__dirname, './schema.ts'),
  out: path.resolve(__dirname, './migrations'),
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
