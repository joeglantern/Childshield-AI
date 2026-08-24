import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  redirect,
} from '@tanstack/react-router';
import './styles.css';
import { sessionStore } from './lib/session';
import { LoginPage } from './pages/Login';
import { QueuePage } from './pages/Queue';
import { CaseDetailPage } from './pages/CaseDetail';
import { StatsPage } from './pages/Stats';
import { AuditPage } from './pages/Audit';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const requireSession = () => {
  if (!sessionStore.get()) throw redirect({ to: '/login' });
};

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const queueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: requireSession,
  component: QueuePage,
});

const caseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/case/$id',
  beforeLoad: requireSession,
  component: CaseDetailPage,
});

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stats',
  beforeLoad: requireSession,
  component: StatsPage,
});

const auditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit',
  beforeLoad: requireSession,
  component: AuditPage,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([loginRoute, queueRoute, caseRoute, statsRoute, auditRoute]),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
