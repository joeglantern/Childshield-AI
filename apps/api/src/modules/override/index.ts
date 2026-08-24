// Protected export surface. Only the service and its route registrar are
// public: nothing outside this module may write OverrideEvent rows, so no
// raw prisma access is exported here (safeguarding invariants 3 and 5).
export { OverrideService, OVERRIDE_ROLES } from './service.js';
export type { OverrideServiceDeps, OverrideEventWithContext } from './service.js';
export { registerOverrideRoutes } from './routes.js';
