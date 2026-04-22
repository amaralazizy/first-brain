import { env } from './env';

const config = {
  app: {
    name: 'First Brain',
    url: env.NEXT_PUBLIC_APP_URL,
  },
  api: {
    trpc: '/api/trpc',
  },
  database: {
    url: env.DATABASE_URL,
  },
};

export const featureFlags = {
  enableAnalytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  enableDebug: env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
};

export const constants = {
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
  PAGINATION_DEFAULT_LIMIT: 20,
  PAGINATION_MAX_LIMIT: 100,
} as const;

export default config;
