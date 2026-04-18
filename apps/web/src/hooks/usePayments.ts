import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

export function usePayments(status?: string, search?: string) {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])

  return useQuery({
    queryKey: ['payments', ids, status, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (status && status !== 'ALL') params.set('status', status)
      if (search) params.set('search', search)

      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/payments?${params}`)
        return data
      }

      // Multi-community: fetch all and merge
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/payments?${params}`).then((r) => r.data))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = results.flatMap((r) => r.payments ?? [])
      merged.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return { payments: merged, total: merged.length }
    },
    enabled: ids.length > 0,
  })
}

export function useCreatePayment() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (body: object) =>
      api.post(`/communities/${activeCommunityId}/payments/charge`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  })
}

export function useMarkPaymentPaid() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ paymentId, method, notes, transferProofUrl }: {
      paymentId: string; method?: string; notes?: string; transferProofUrl?: string
    }) =>
      api.patch(`/communities/${activeCommunityId}/payments/${paymentId}/mark-paid`, {
        paymentMethod: method ?? 'CASH',
        cashNotes: notes,
        transferProofUrl,
      }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  })
}

export function useUploadPaymentProof() {
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: async ({ paymentId, file }: { paymentId: string; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post(
        `/communities/${activeCommunityId}/payments/${paymentId}/upload-proof`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return data as { proofUrl: string }
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.delete(`/communities/${activeCommunityId}/payments/${paymentId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  })
}
