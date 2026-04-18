import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

export function useResidents(search?: string) {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])

  return useQuery({
    queryKey: ['residents', ids, search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/residents${params}`)
        return data
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/residents${params}`).then((r) => ({ communityId: id, data: r.data })))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = results.flatMap((r) => (r.data.residents ?? []).map((res: any) => ({ ...res, _communityId: r.communityId })))
      // Deduplicate by User.id — same user can belong to multiple communities
      const seen = new Set<string>()
      const deduped = merged.filter((r: any) => {
        if (seen.has(r.id)) return false
        seen.add(r.id)
        return true
      })
      return { residents: deduped, total: deduped.length }
    },
    enabled: ids.length > 0,
  })
}

export function useResident(userId: string) {
  const { activeCommunityId } = useAuthStore()
  return useQuery({
    queryKey: ['resident', activeCommunityId, userId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${activeCommunityId}/residents/${userId}`)
      return data
    },
    enabled: !!activeCommunityId && !!userId,
  })
}

export function useCreateResident() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ communityId, ...body }: { communityId?: string; [key: string]: any }) =>
      api.post(`/communities/${communityId ?? activeCommunityId}/residents`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residents'] }),
  })
}

export function useAdminResetPassword() {
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ userId, communityId }: { userId: string; communityId?: string }) =>
      api.post(`/communities/${communityId ?? activeCommunityId}/residents/${userId}/reset-password`).then((r) => r.data),
  })
}

export function useUpdateResident() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: object }) =>
      api.patch(`/communities/${activeCommunityId}/residents/${userId}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residents', activeCommunityId] }),
  })
}

export function useDeleteResident() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/communities/${activeCommunityId}/residents/${userId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residents', activeCommunityId] }),
  })
}

export function useChangeRole() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: ({ userId, role, communityId }: { userId: string; role: string; communityId?: string }) =>
      api.patch(`/communities/${communityId ?? activeCommunityId}/residents/${userId}/role`, { role }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residents'] }),
  })
}

export function useCreateUnit() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (body: object) =>
      api.post(`/communities/${activeCommunityId}/units`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  })
}

export function useUnits(withStats = false) {
  const { activeCommunityId, activeCommunityIds } = useAuthStore()
  const ids = activeCommunityIds.length > 0 ? activeCommunityIds : (activeCommunityId ? [activeCommunityId] : [])

  return useQuery({
    queryKey: ['units', ids, withStats],
    queryFn: async () => {
      const suffix = withStats ? '?stats=true' : ''
      if (ids.length <= 1) {
        const { data } = await api.get(`/communities/${ids[0]}/units${suffix}`)
        return data
      }
      const settled = await Promise.allSettled(
        ids.map((id) => api.get(`/communities/${id}/units${suffix}`).then((r) => ({ communityId: id, data: r.data })))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const allUnits = results.flatMap((r: any) => (r.data.units ?? []).map((u: any) => ({ ...u, _communityId: r.communityId })))
      const allStats = results.map((r: any) => r.data.stats).filter(Boolean)
      const mergedStats = allStats.length > 0 ? allStats.reduce((acc, s) => ({
        total: (acc.total ?? 0) + (s.total ?? 0),
        occupied: (acc.occupied ?? 0) + (s.occupied ?? 0),
        vacant: (acc.vacant ?? 0) + (s.vacant ?? 0),
      }), {}) : undefined
      return { units: allUnits, stats: mergedStats }
    },
    enabled: ids.length > 0,
  })
}
