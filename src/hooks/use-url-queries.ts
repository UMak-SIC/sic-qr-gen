import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUrl, deleteUrl, listUrls, setUrlStatus, updateUrl } from '@/services/url-service'
import type { UrlInput } from '@/types/url'

export const urlKeys = { all: ['urls'] as const }

export function useUrls() { return useQuery({ queryKey: urlKeys.all, queryFn: listUrls }) }

export function useUrlMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: urlKeys.all })
  const save = useMutation({ mutationFn: ({ id, input }: { id?: string; input: UrlInput }) => id ? updateUrl(id, input) : createUrl(input), onSuccess: invalidate })
  const toggleStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) => setUrlStatus(id, status), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: deleteUrl, onSuccess: invalidate })
  return { save, toggleStatus, remove }
}
