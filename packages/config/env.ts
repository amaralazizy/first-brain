import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.enum(['true', 'false']).optional().default('false'),
  NEXT_PUBLIC_ENABLE_DEBUG: z.enum(['true', 'false']).optional().default('false'),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
