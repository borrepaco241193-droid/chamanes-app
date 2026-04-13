import api from '../lib/api'

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Task {
  id: string
  communityId: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: string | null
  assignee?: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } | null
  creator: { id: string; firstName: string; lastName: string }
  dueDate?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export const taskService = {
  async list(communityId: string, status?: string): Promise<{ tasks: Task[] }> {
    const param = status && status !== 'ALL' ? `?status=${status}` : ''
    const res = await api.get(`/communities/${communityId}/tasks${param}`)
    return res.data
  },

  async create(communityId: string, data: {
    title: string; description?: string; priority?: TaskPriority
    assigneeId?: string; dueDate?: string
  }): Promise<{ task: Task }> {
    const res = await api.post(`/communities/${communityId}/tasks`, data)
    return res.data
  },

  async update(communityId: string, taskId: string, data: {
    status?: TaskStatus; priority?: TaskPriority
    assigneeId?: string; dueDate?: string; title?: string; description?: string
  }): Promise<{ task: Task }> {
    const res = await api.patch(`/communities/${communityId}/tasks/${taskId}`, data)
    return res.data
  },

  async delete(communityId: string, taskId: string): Promise<void> {
    await api.delete(`/communities/${communityId}/tasks/${taskId}`)
  },
}
