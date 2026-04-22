import { router, publicProcedure } from '../init';
import { tasksRouter } from './tasks';

export const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;
