'use server';

import { appRouter } from './routers/_app';

export const createCaller = async () => appRouter.createCaller({});
