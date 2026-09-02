import { useEffect } from 'react'
import { Route, Routes } from 'react-router'
import { Dashboard } from '@/components/dashboard'
import { PublicResolver } from '@/components/public-resolver'
import { SignIn } from '@/components/sign-in'
import { StatusPage } from '@/components/status-page'
import { useAuthStore } from '@/store/auth-store'

const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

function HomeRoute() {
  const user = useAuthStore((state) => state.user)
  const isHydrated = useAuthStore((state) => state.isHydrated)
  const hydrate = useAuthStore((state) => state.hydrate)

  useEffect(() => { if (configured) void hydrate() }, [hydrate])

  if (!configured || !isHydrated) return configured ? <StatusPage title="Loading workspace" message="Checking your session." /> : <SignIn />
  return user ? <Dashboard /> : <SignIn />
}

export function AppRoutes() {
  return <Routes><Route path="/" element={<HomeRoute />} /><Route path="/:code" element={<PublicResolver />} /><Route path="*" element={<PublicResolver />} /></Routes>
}
