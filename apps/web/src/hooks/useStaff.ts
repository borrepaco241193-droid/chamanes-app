import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

export function useCreateStaff() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ communityId, ...body }: { communityId?: string; [key: string]: any }) => {
      const id = communityId ?? activeCommunityId
      return api.post(`/communities/${id}/residents`, body).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export function useDeleteStaff() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/communities/${activeCommunityId}/residents/${userId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff', activeCommunityId] }),
  })
}

export function useStaff() {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])
  return useQuery({
    queryKey: ['staff', ids],
    queryFn: async () => {
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/staff`)
        return data.staff ?? data
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/staff`).then((r) => ({ communityId: id, staff: r.data.staff ?? r.data })))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      return results.flatMap((r) => (r.staff ?? []).map((s: any) => ({ ...s, _communityId: r.communityId })))
    },
    enabled: ids.length > 0,
  })
}

export function useWorkOrders(status?: string) {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])

  return useQuery({
    queryKey: ['workorders', ids, status],
    queryFn: async () => {
      const params = status && status !== 'ALL' ? `?status=${status}` : ''
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/work-orders${params}`)
        return data.orders ?? data.workOrders ?? data
      }
      // Multi-community merge
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/work-orders${params}`).then((r) => r.data))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = results.flatMap((r) => r.orders ?? r.workOrders ?? [])
      merged.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return merged
    },
    enabled: ids.length > 0,
  })
}

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (body: object) =>
      api.post(`/communities/${activeCommunityId}/work-orders`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workorders', activeCommunityId] }),
  })
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient()
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const fallbackId = activeCommunityId ?? activeCommunityIds[0]
  return useMutation({
    mutationFn: ({ id, body, communityId }: { id: string; body: object; communityId?: string }) =>
      api.patch(`/communities/${communityId ?? fallbackId}/work-orders/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workorders'] }),
  })
}

export function useCreateVisitorPass() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (body: object) =>
      api.post(`/communities/${activeCommunityId}/visitors`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitors', activeCommunityId] }),
  })
}

export function useRevokeVisitorPass() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (passId: string) =>
      api.patch(`/communities/${activeCommunityId}/visitors/${passId}/revoke`, {}).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitors', activeCommunityId] }),
  })
}

export function useVisitorPasses(status?: string) {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])
  return useQuery({
    queryKey: ['visitors', ids, status],
    queryFn: async () => {
      const params = status && status !== 'ALL' ? `?status=${status}` : ''
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/visitors${params}`)
        return data.passes ?? data
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/visitors${params}`).then((r) => ({ communityId: id, passes: r.data.passes ?? r.data })))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = results.flatMap((r) => (r.passes ?? []).map((p: any) => ({ ...p, _communityId: r.communityId })))
      merged.sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      return merged
    },
    enabled: ids.length > 0,
  })
}

export function useAccessEvents(limit = 50) {
  const { activeCommunityId } = useAuthStore()
  return useQuery({
    queryKey: ['access-events', activeCommunityId, limit],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${activeCommunityId}/gate/events?limit=${limit}`)
      return data.events ?? data
    },
    enabled: !!activeCommunityId,
  })
}

export function useIdVerifications(status = 'ALL') {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])
  return useQuery({
    queryKey: ['id-verifications', ids, status],
    queryFn: async () => {
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/admin/id-verifications?status=${status}`)
        return data.verifications ?? data.users ?? data
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/admin/id-verifications?status=${status}`).then((r) => ({ communityId: id, data: r.data })))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = results.flatMap((r) => (r.data.verifications ?? r.data.users ?? []).map((u: any) => ({ ...u, _communityId: r.communityId })))
      // Deduplicate by user id (same user can belong to multiple communities)
      const seen = new Set<string>()
      return merged.filter((u: any) => { if (seen.has(u.id)) return false; seen.add(u.id); return true })
    },
    enabled: ids.length > 0,
  })
}

export function useVerifyId() {
  const qc = useQueryClient()
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const communityId = activeCommunityId ?? activeCommunityIds[0]
  return useMutation({
    mutationFn: ({ userId, approve, note, communityId: cId }: { userId: string; approve: boolean; note?: string; communityId?: string }) =>
      api.patch(`/communities/${cId ?? communityId}/admin/id-verify/${userId}`, { approve, note }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['id-verifications'] }),
  })
}
