import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ML_API_URL: z.string().url().optional().default('http://localhost:8000'),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
