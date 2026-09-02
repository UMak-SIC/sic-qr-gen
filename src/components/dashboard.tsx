import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth-store'
import { useUrlMutations, useUrls } from '@/hooks/use-url-queries'
import type { UrlInput, UrlRecord } from '@/types/url'
import { LinkRow } from '@/components/link-row'
import { UrlForm } from '@/components/url-form'

export function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const { data: urls = [], isLoading, error } = useUrls()
  const { save, toggleStatus, remove } = useUrlMutations()
  const [editing, setEditing] = useState<UrlRecord | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<UrlRecord | null>(null)

  useEffect(() => { if (error) toast.error(error instanceof Error ? error.message : 'Could not load links.') }, [error])
  useEffect(() => { if (save.error) toast.error(save.error instanceof Error ? save.error.message : 'Could not save link.') }, [save.error])
  useEffect(() => { if (toggleStatus.error) toast.error(toggleStatus.error instanceof Error ? toggleStatus.error.message : 'Could not update link status.') }, [toggleStatus.error])
  useEffect(() => { if (remove.error) toast.error(remove.error instanceof Error ? remove.error.message : 'Could not delete link.') }, [remove.error])

  const saveUrl = async (input: UrlInput) => {
    await save.mutateAsync({ id: editing?.id, input })
    setEditing(null)
    setShowCreate(false)
  }
  const toggleUrlStatus = (url: UrlRecord) => toggleStatus.mutate({ id: url.id, status: url.status === 'disabled' ? 'active' : 'disabled' })
  const deleteUrl = (id: string) => remove.mutate(id, { onSuccess: () => setDeleteConfirm(null) })

  return <main className="app-shell">
    <nav className="topbar" aria-label="Main navigation"><a className="brand" href="/"><span className="brand-mark">SIC</span><span>QR Studio</span></a><div className="nav-links"><span className="user-email">{user?.email}</span><button className="account-button" type="button" onClick={() => void signOut()} aria-label="Sign out">↗</button></div></nav>
    <section className="dashboard-header"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Your links<br /><span>in one place.</span></h1></div><button className="primary-button" type="button" onClick={() => { setEditing(null); setShowCreate(true) }}>Create a QR link <span>+</span></button></section>
    <section className="workspace"><div className="section-heading"><div><p className="eyebrow">PRIVATE LIBRARY</p><h2>Recent links</h2></div><span className="link-count">{urls.length} {urls.length === 1 ? 'link' : 'links'}</span></div>{isLoading ? <p className="empty-state">Loading your links...</p> : urls.length === 0 ? <p className="empty-state">No links yet. Create your first QR link below.</p> : <div className="link-list">{urls.map((url) => <LinkRow key={url.id} url={url} onEdit={() => { setEditing(url); setShowCreate(true) }} onToggleStatus={() => toggleUrlStatus(url)} onDelete={() => setDeleteConfirm(url)} />)}</div>}</section>
    {(showCreate || editing) && <UrlForm initial={editing} userId={user?.id ?? ''} onCancel={() => { setEditing(null); setShowCreate(false) }} onSave={saveUrl} />}
    {deleteConfirm && <div className="form-backdrop" role="presentation"><div className="modal-form confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><div className="section-heading"><div><p className="eyebrow">DELETE QR LINK</p><h2 id="delete-title">Delete this<br /><span>QR link?</span></h2></div><button className="close-button" type="button" onClick={() => setDeleteConfirm(null)} aria-label="Close delete confirmation">×</button></div><p className="confirmation-copy">This permanently removes the short link and its scan history. Printed codes will stop working.</p><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setDeleteConfirm(null)}>Keep it</button><button className="danger-button" type="button" onClick={() => deleteUrl(deleteConfirm.id)} disabled={remove.isPending}>Delete link</button></div></div></div>}
  </main>
}
