import { create } from 'zustand'
import { getSupabaseClient } from '@/lib/supabase'
import type { AuthState } from '@/types/auth'

let hydration: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isHydrated: false,
  hydrate: () => {
    if (hydration) return hydration
    hydration = (async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.getSession()
      set({ session: data.session, user: data.session?.user ?? null, isHydrated: true })
      supabase.auth.onAuthStateChange((_event, session) => set({ session, user: session?.user ?? null }))
    })()
    return hydration
  },
  signIn: async () => {
    await getSupabaseClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  },
  signOut: async () => {
    await getSupabaseClient().auth.signOut()
  },
}))
