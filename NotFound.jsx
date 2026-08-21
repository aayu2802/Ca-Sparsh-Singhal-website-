import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
      <div className="max-w-sm">
        <p className="font-mono text-[11px] uppercase tracking-widest text-primary">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">No such screen</h1>
        <p className="mt-2 text-sm text-muted">
          That URL isn’t part of the admin panel. It may have been renamed.
        </p>
        <Button as={Link} to="/" className="mt-5">
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
