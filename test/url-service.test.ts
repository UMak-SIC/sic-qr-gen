import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createUrl, deleteUrl, disableUrl, listUrls, resolveUrl, updateUrl, validateHttpsUrl } from '@/services/url-service'

const supabase = { from: vi.fn(), rpc: vi.fn() }

vi.mock('@/lib/supabase', () => ({ getSupabaseClient: () => supabase }))

describe('url service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts absolute HTTPS URLs and rejects unsafe or malformed URLs', () => {
    expect(validateHttpsUrl('https://example.com/path')).toBe(true)
    expect(validateHttpsUrl('http://example.com')).toBe(false)
    expect(validateHttpsUrl('javascript:alert(1)')).toBe(false)
    expect(validateHttpsUrl('not a URL')).toBe(false)
  })

  it('creates a URL with database-owned fields omitted and the expected projection', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    supabase.from.mockReturnValue({ insert })

    await createUrl({ name: '  Campaign  ', originalUrl: 'https://example.com', expiresAt: '2026-10-01', qrForeground: '#176b4f', qrBackground: '#f9f9ee', qrLogoFile: null, qrLogoUrl: null })

    expect(insert).toHaveBeenCalledWith({ name: 'Campaign', original_url: 'https://example.com', expires_at: '2026-10-01', qr_foreground: '#176b4f', qr_background: '#f9f9ee', qr_logo_url: null })
    expect(select).toHaveBeenCalledWith('id,url_id,name,original_url,view_count,status,expires_at,qr_foreground,qr_background,qr_logo_url')
  })

  it('updates and disables URLs through the expected database calls', async () => {
    const update = vi.fn()
    const eq = vi.fn()
    const single = vi.fn().mockResolvedValue({ data: {}, error: null })
    const select = vi.fn().mockReturnValue({ single })
    update.mockReturnValue({ eq: vi.fn().mockReturnValue({ select }) })
    supabase.from.mockReturnValue({ update })

    await updateUrl('row-1', { name: '', originalUrl: 'https://example.com', expiresAt: undefined, qrForeground: '#176b4f', qrBackground: '#f9f9ee', qrLogoFile: null, qrLogoUrl: null })
    expect(update).toHaveBeenCalledWith({ name: 'Untitled link', original_url: 'https://example.com', expires_at: undefined, qr_foreground: '#176b4f', qr_background: '#f9f9ee', qr_logo_url: null })

    eq.mockReturnValue({})
    update.mockReturnValue({ eq })
    await disableUrl('row-1')
    expect(update).toHaveBeenCalledWith({ status: 'disabled' })
    expect(eq).toHaveBeenCalledWith('id', 'row-1')
  })

  it('lists URLs with the service projection', async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null })
    supabase.from.mockReturnValue({ select })

    await listUrls()

    expect(select).toHaveBeenCalledWith('id,url_id,name,original_url,view_count,status,expires_at,qr_foreground,qr_background,qr_logo_url')
  })

  it('returns only the scalar resolver result', async () => {
    supabase.rpc.mockResolvedValue({ data: 'https://example.com', error: null })
    expect(await resolveUrl('AbcDefG')).toBe('https://example.com')
    expect(supabase.rpc).toHaveBeenCalledWith('resolve_url', { p_url_id: 'AbcDefG' })

    supabase.rpc.mockResolvedValue({ data: { original_url: 'https://example.com' }, error: null })
    expect(await resolveUrl('AbcDefG')).toBeNull()
  })

  it('deletes URLs through the owner-checked RPC', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null })
    await deleteUrl('row-1')
    expect(supabase.rpc).toHaveBeenCalledWith('delete_url', { p_id: 'row-1' })
  })
})
