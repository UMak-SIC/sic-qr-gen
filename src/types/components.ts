import type { UrlInput, UrlRecord } from '@/types/url'

export interface StatusPageProps { title: string; message: string }
export interface LinkRowProps { url: UrlRecord; onEdit: () => void; onToggleStatus: () => void; onDelete: () => void }
export interface UrlFormProps { initial: UrlRecord | null; userId: string; onCancel: () => void; onSave: (input: UrlInput) => Promise<void> }
