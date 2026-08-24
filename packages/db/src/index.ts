import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';
export { PrismaClient };

export * from './audit.js';
export * from './canonical.js';

export function createPrismaClient(datasourceUrl?: string): PrismaClient {
  return new PrismaClient(
    datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : undefined,
  );
}
