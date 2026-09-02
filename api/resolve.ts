import { sendNotFound } from './not-found.js'

type Request = { method?: string; url?: string; query?: Record<string, string | string[] | undefined> }
type Response = {
  status: (code: number) => Response
  setHeader: (name: string, value: string) => Response
  end: (body: string) => void
}

const CODE_PATTERN = /^[A-Za-z]{7}$/

function getCode(req: Request) {
  const queryCode = req.query?.code
  if (typeof queryCode === 'string') return queryCode
  if (!req.url) return ''
  return new URL(req.url, 'https://sic-qr-gen.vercel.app').searchParams.get('code') ?? ''
}

export default async function handler(req: Request, res: Response) {
  const code = getCode(req)
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') return sendNotFound(res)
  if (!CODE_PATTERN.test(code)) return sendNotFound(res)

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return sendNotFound(res)

  try {
    const upstream = await fetch(`${url}/rest/v1/rpc/resolve_url`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_url_id: code }),
    })
    if (!upstream.ok) return sendNotFound(res)
    const destination: unknown = await upstream.json()
    if (typeof destination !== 'string' || !destination) return sendNotFound(res)

    return res.status(302).setHeader('Location', destination).end('')
  } catch {
    return sendNotFound(res)
  }
}
