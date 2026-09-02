import type { Session, User } from '@supabase/supabase-js'

export interface AuthState {
  session: Session | null
  user: User | null
  isHydrated: boolean
  hydrate: () => Promise<void>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}
