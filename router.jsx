import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
} from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { NotFound } from './NotFound'
import { RouteError } from '@/components/ui/RouteError'
import { requireAdmin, requireGuest, requirePermission } from './guards'

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

const lazy = (loader) => lazyRouteComponent(loader)

// ── Public ───────────────────────────────────────────────────────────────────
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (s) => ({ redirect: typeof s.redirect === 'string' ? s.redirect : undefined }),
  beforeLoad: requireGuest,
  component: lazy(() => import('@/features/auth/Login')),
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: NotFound,
})

// ── App shell — one guard protects every child ───────────────────────────────
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: requireAdmin,
  component: AppShell,
  errorComponent: RouteError,
})

/**
 * Every route gets its own error boundary: one thrown error in the quiz builder must not
 * take navigation down for the rest of the session.
 */
const route = (path, loader, opts = {}) =>
  createRoute({
    getParentRoute: () => appRoute,
    path,
    component: lazy(loader),
    errorComponent: RouteError,
    // Every screen is gated by its view permission from config/permissions.js, so the
    // sidebar and the router read one mapping and cannot disagree. A missing right
    // renders the no-access state in RouteError, not a redirect or a crash.
    //
    // ⚠️ UX, not security — the route's queries still hit the API and localStorage is
    // editable. The backend re-checks every permission on every request.
    beforeLoad: requirePermission(path),
    ...opts,
  })

// One line per sidebar section — the other half of the pair in @/components/layout/nav.js.
const appRoutes = [
  route('/', () => import('@/features/dashboard')),
  route('/papers', () => import('@/features/papers')),
  route('/series', () => import('@/features/series')),
  route('/answer-keys', () => import('@/features/answer-keys')),
  route('/quizzes', () => import('@/features/quizzes')),
  route('/courses', () => import('@/features/courses')),
  route('/videos', () => import('@/features/videos')),
  route('/submissions', () => import('@/features/submissions')),
  route('/doubts', () => import('@/features/doubts')),
  route('/students', () => import('@/features/students')),
  route('/staff', () => import('@/features/staff')),
]

const routeTree = rootRoute.addChildren([loginRoute, appRoute.addChildren(appRoutes), notFoundRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})
