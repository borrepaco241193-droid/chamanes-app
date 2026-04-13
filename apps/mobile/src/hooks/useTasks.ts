import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'
import { taskService, type TaskStatus } from '../services/task.service'

function useCommunityId() {
  return useAuthStore((s) => s.user?.communityId ?? '')
}

export function useTasks(status?: string) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['tasks', communityId, status],
    queryFn: () => taskService.list(communityId, status),
    enabled: !!communityId,
    staleTime: 30_000,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const communityId = useCommunityId()
  return useMutation({
    mutationFn: (data: Parameters<typeof taskService.create>[1]) =>
      taskService.create(communityId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', communityId] }),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  const communityId = useCommunityId()
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Parameters<typeof taskService.update>[2] }) =>
      taskService.update(communityId, taskId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', communityId] }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const communityId = useCommunityId()
  return useMutation({
    mutationFn: (taskId: string) => taskService.delete(communityId, taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', communityId] }),
  })
}
