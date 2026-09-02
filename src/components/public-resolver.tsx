import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { resolveUrl } from '@/services/url-service'
import { StatusPage } from '@/components/status-page'

const CODE_PATTERN = /^[A-Za-z]{7}$/

export function PublicResolver() {
  const { code = '' } = useParams()
  const [state, setState] = useState<'loading' | 'not-found'>(CODE_PATTERN.test(code) ? 'loading' : 'not-found')

  useEffect(() => {
    if (!CODE_PATTERN.test(code)) return
    void resolveUrl(code).then((destination) => { if (destination) window.location.replace(destination); else setState('not-found') }).catch(() => setState('not-found'))
  }, [code])

  return state === 'loading' ? <StatusPage title="Opening link" message="Taking you to the destination." /> : <StatusPage title="404" message="This QR link is invalid, disabled, or expired." />
}
