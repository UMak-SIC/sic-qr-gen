import type { StatusPageProps } from '@/types/components'

export function StatusPage({ title, message }: StatusPageProps) {
  return <main className="status-page"><p className="eyebrow">SIC QR STUDIO</p><h1>{title}</h1><p>{message}</p><a className="text-link" href="/">Return to home</a></main>
}
