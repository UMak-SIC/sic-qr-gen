import { useAuthStore } from '@/store/auth-store'

export function SignIn() {
  const signIn = useAuthStore((state) => state.signIn)
  return <main className="auth-page"><div className="auth-card"><div className="brand"><span className="brand-mark">SIC</span><span>QR Studio</span></div><p className="eyebrow">SIC QR GENERATOR</p><h1>Put your link<br /><span>in the <em>right</em> place.</span></h1><p className="hero-description">Create stable QR links for events, forms, and everything your community shares.</p><button className="primary-button" type="button" onClick={() => void signIn()}>Continue with Google <span>↗</span></button><p className="hero-note">Google sign-in only. No password required.</p></div></main>
}
