import { redirect } from '@tanstack/react-router'
import { useAdminAuthStore } from '@/stores/adminAuthStore'

export function requireAdmin({ location }) {
  if (!useAdminAuthStore.getState().isAuthenticated()) {
    throw redirect({ to: '/login', search: { redirect: location.pathname } })
  }
}

export function requireGuest() {
  if (useAdminAuthStore.getState().isAuthenticated()) {
    throw redirect({ to: '/' })
  }
}

// TEMPORARY: Disable permission checking
export function requirePermission() {
  return () => true
}

export const requireAdminWithPermission = (path) => (ctx) => {
  requireAdmin(ctx)
  requirePermission(path)(ctx)
}