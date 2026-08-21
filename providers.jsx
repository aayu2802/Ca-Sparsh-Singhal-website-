import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { queryClient } from './queryClient'
import { router } from './router'

/**
 * ponytail: no MotionConfig. The student app needs it for `motion`; this app's only
 * animations are CSS transitions, and every one of them already carries `motion-reduce:`.
 * A reduced-motion provider with nothing to configure is a dependency for nothing.
 */
export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" toastOptions={{ className: 'font-sans' }} />
    </QueryClientProvider>
  )
}
