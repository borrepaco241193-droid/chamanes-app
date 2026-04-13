import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'
import { forumService } from '../services/forum.service'

function useCommunityId() {
  return useAuthStore((s) => s.user?.communityId ?? '')
}

export function useForumPosts() {
  const communityId = useCommunityId()
  return useInfiniteQuery({
    queryKey: ['forum', communityId],
    queryFn: ({ pageParam = 1 }) => forumService.listPosts(communityId, pageParam as number),
    getNextPageParam: (last, pages) =>
      last.pages > pages.length ? pages.length + 1 : undefined,
    initialPageParam: 1,
    enabled: !!communityId,
    staleTime: 30_000,
  })
}

export function useCreatePost() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body, imageUrl }: { body: string; imageUrl?: string }) =>
      forumService.createPost(communityId, body, imageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum', communityId] })
    },
  })
}

export function useDeletePost() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => forumService.deletePost(communityId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum', communityId] })
    },
  })
}

export function useToggleLike() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => forumService.toggleLike(communityId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum', communityId] })
    },
  })
}

export function useForumComments(postId: string) {
  const communityId = useCommunityId()
  return useQuery({
    queryKey: ['forum-comments', communityId, postId],
    queryFn: () => forumService.listComments(communityId, postId),
    enabled: !!communityId && !!postId,
    staleTime: 30_000,
  })
}

export function useAddComment(postId: string) {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => forumService.addComment(communityId, postId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', communityId, postId] })
      queryClient.invalidateQueries({ queryKey: ['forum', communityId] })
    },
  })
}

export function useDeleteComment() {
  const communityId = useCommunityId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => forumService.deleteComment(communityId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum', communityId] })
      queryClient.invalidateQueries({ queryKey: ['forum-comments', communityId] })
    },
  })
}
