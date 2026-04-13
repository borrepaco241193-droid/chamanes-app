import api from '../lib/api'

export interface ForumAuthor {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string
}

export interface ForumPost {
  id: string
  communityId: string
  authorId: string
  body: string
  imageUrl?: string
  likesCount: number
  likedByMe: boolean
  createdAt: string
  author: ForumAuthor
  _count: { comments: number; likes: number }
}

export interface ForumComment {
  id: string
  postId: string
  authorId: string
  body: string
  createdAt: string
  author: ForumAuthor
}

export const forumService = {
  async listPosts(
    communityId: string,
    page = 1,
    limit = 20,
  ): Promise<{ posts: ForumPost[]; total: number; pages: number }> {
    const res = await api.get(`/communities/${communityId}/forum`, {
      params: { page, limit },
    })
    return res.data
  },

  async createPost(communityId: string, body: string, imageUrl?: string): Promise<ForumPost> {
    const res = await api.post(`/communities/${communityId}/forum`, { body, imageUrl })
    return res.data
  },

  async deletePost(communityId: string, postId: string): Promise<void> {
    await api.delete(`/communities/${communityId}/forum/${postId}`)
  },

  async toggleLike(communityId: string, postId: string): Promise<{ liked: boolean }> {
    const res = await api.post(`/communities/${communityId}/forum/${postId}/like`)
    return res.data
  },

  async listComments(communityId: string, postId: string): Promise<ForumComment[]> {
    const res = await api.get(`/communities/${communityId}/forum/${postId}/comments`)
    return res.data
  },

  async addComment(communityId: string, postId: string, body: string): Promise<ForumComment> {
    const res = await api.post(`/communities/${communityId}/forum/${postId}/comments`, { body })
    return res.data
  },

  async deleteComment(communityId: string, commentId: string): Promise<void> {
    await api.delete(`/communities/${communityId}/forum/comments/${commentId}`)
  },
}
