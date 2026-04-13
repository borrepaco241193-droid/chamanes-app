'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { timeAgo, fullName } from '@/lib/utils'
import { MessageSquare, Heart, Trash2, Plus, X } from 'lucide-react'

function usePosts() {
  const { activeCommunityId } = useAuthStore()
  return useQuery({
    queryKey: ['forum-posts', activeCommunityId],
    queryFn: async () => {
      const { data } = await api.get(`/communities/${activeCommunityId}/forum/posts?limit=50`)
      return data.posts ?? []
    },
    enabled: !!activeCommunityId,
  })
}

function useCreatePost() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (body: object) => api.post(`/communities/${activeCommunityId}/forum/posts`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum-posts', activeCommunityId] }),
  })
}

function useDeletePost() {
  const qc = useQueryClient()
  const { activeCommunityId } = useAuthStore()
  return useMutation({
    mutationFn: (postId: string) => api.delete(`/communities/${activeCommunityId}/forum/posts/${postId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum-posts', activeCommunityId] }),
  })
}

export default function ForumPage() {
  const { data: posts, isLoading } = usePosts()
  const deletePost = useDeletePost()
  const createPost = useCreatePost()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.communityRole === 'COMMUNITY_ADMIN' || user?.role === 'COMMUNITY_ADMIN'

  const [showCreate, setShowCreate] = useState(false)
  const [body, setBody] = useState('')
  const [createError, setCreateError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setCreateError('')
    try {
      await createPost.mutateAsync({ body: body.trim() })
      setBody('')
      setShowCreate(false)
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? 'No se pudo publicar')
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Foro Comunitario</h1>
          <p className="text-gray-500 text-sm">Publicaciones de la comunidad</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nueva publicación</button>
      </div>

      {showCreate && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Nueva publicación</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <textarea
              className="input"
              rows={4}
              placeholder="Escribe un mensaje para la comunidad..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={createPost.isPending || !body.trim()} className="btn-primary flex-1">
                {createPost.isPending ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="card p-5 h-32 animate-pulse bg-gray-100" />)}</div>}

      {!isLoading && (!posts || posts.length === 0) && (
        <div className="card p-12 text-center">
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No hay publicaciones en el foro</p>
        </div>
      )}

      <div className="space-y-4">
        {posts?.map((post: any) => (
          <div key={post.id} className="card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {post.author?.avatarUrl
                  ? <img src={post.author.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                  : <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-semibold text-brand-700">
                    {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                  </div>
                }
                <div>
                  <p className="font-medium text-gray-900 text-sm">{fullName(post.author)}</p>
                  <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => { if (confirm('¿Eliminar esta publicación?')) deletePost.mutate(post.id) }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{post.body}</p>
            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.imageUrl} alt="" className="w-full rounded-lg object-cover max-h-64" />
            )}
            <div className="flex items-center gap-4 pt-1">
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Heart className="w-3.5 h-3.5" /> {post.likesCount}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <MessageSquare className="w-3.5 h-3.5" /> {post.comments?.length ?? 0} comentario{(post.comments?.length ?? 0) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
