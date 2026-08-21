import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // shorter than the student app's 60s: admins expect their own writes back
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
