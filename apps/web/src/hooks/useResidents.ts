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
        ids.map((id) => api.get(`/communities/${id}/residents${params}`).then((r) => r.data))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const merged = results.flatMap((r) => r.residents ?? [])
      return { residents: merged, total: merged.length }
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
    mutationFn: (body: object) =>
      api.post(`/communities/${activeCommunityId}/residents`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residents', activeCommunityId] }),
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
        ids.map((id) => api.get(`/communities/${id}/units${suffix}`).then((r) => r.data))
      )
      const results = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value)
      const allUnits = results.flatMap((r) => r.units ?? [])
      const allStats = results.map((r) => r.stats).filter(Boolean)
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
