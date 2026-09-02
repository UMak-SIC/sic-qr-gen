import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/resolve'
import { notFoundPage } from '../api/not-found'

function response() {
  const result = { statusCode: 0, headers: {} as Record<string, string>, body: '' }
  const res = {
    status(code: number) { result.statusCode = code; return res },
    setHeader(name: string, value: string) { result.headers[name] = value; return res },
    end(body: string) { result.body = body },
  }
  return { result, res }
}

describe('public resolver', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.VITE_SUPABASE_URL = 'https://project.supabase.co'
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'publishable-key'
  })

  it('redirects to the resolved destination and calls the public RPC with apikey only', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify('https://example.com'), { status: 200 }))
    const { result, res } = response()
    await handler({ method: 'GET', query: { code: 'AbcDefG' } }, res)
    expect(result.statusCode).toBe(302)
    expect(result.headers.Location).toBe('https://example.com')
    expect(result.body).toBe('')
    const request = fetchMock.mock.calls[0][1] as RequestInit
    expect(request.headers).toEqual({ apikey: 'publishable-key', 'Content-Type': 'application/json' })
    expect(JSON.parse(String(request.body))).toEqual({ p_url_id: 'AbcDefG' })
  })

  it('returns a real 404 for malformed codes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const { result, res } = response()
    await handler({ method: 'GET', query: { code: 'abc123' } }, res)
    expect(result.statusCode).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns a 404 for upstream errors and missing destinations without leaking data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('database detail', { status: 500 })).mockResolvedValueOnce(new Response('null', { status: 200 }))
    const first = response(); await handler({ query: { code: 'AbcDefG' } }, first.res)
    const second = response(); await handler({ query: { code: 'AbcDefG' } }, second.res)
    expect(first.result.statusCode).toBe(404)
    expect(second.result.statusCode).toBe(404)
    expect(first.result.body).not.toContain('database detail')
    expect(second.result.body).not.toContain('null')
  })

  it('renders the dedicated styled 404 content', async () => {
    const { result, res } = response()
    await handler({ query: { code: 'nope' } }, res)
    expect(result.body).toBe(notFoundPage)
    expect(result.body).toContain('#176b4f')
    expect(result.body).toContain('#173e33')
    expect(result.body).toContain('href="/"')
  })
})
