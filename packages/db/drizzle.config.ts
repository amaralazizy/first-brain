import { defineConfig } from 'drizzle-kit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, '../../web');

dotenv.config({ path: path.resolve(webDir, '.env.local') });
dotenv.config({ path: path.resolve(webDir, '.env.production'), override: false });

export default defineConfig({
  schema: path.resolve(__dirname, './schema.ts'),
  out: path.resolve(__dirname, './migrations'),
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});