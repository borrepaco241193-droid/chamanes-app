import api from '../lib/api'

export type WorkOrderStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface WorkOrder {
  id: string
  communityId: string
  title: string
  description: string
  category: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  location?: string
  dueDate?: string
  completedAt?: string
  reportedById?: string
  createdAt: string
  imageUrls?: string[]
  assignments?: { staffId: string; staff: any }[]
  comments?: WorkOrderComment[]
  _count?: { comments: number }
}

export interface WorkOrderComment {
  id: string
  workOrderId: string
  authorId: string
  body: string
  createdAt: string
}

export const workOrderService = {
  async list(
    communityId: string,
    params?: { status?: WorkOrderStatus; page?: number; limit?: number },
  ): Promise<{ orders: WorkOrder[]; total: number; pages: number }> {
    const res = await api.get(`/communities/${communityId}/work-orders`, { params })
    return res.data
  },

  async get(communityId: string, orderId: string): Promise<WorkOrder> {
    const res = await api.get(`/communities/${communityId}/work-orders/${orderId}`)
    return res.data
  },

  async create(
    communityId: string,
    data: {
      title: string
      description: string
      category?: string
      priority?: WorkOrderPriority
      location?: string
    },
  ): Promise<WorkOrder> {
    const res = await api.post(`/communities/${communityId}/work-orders`, data)
    return res.data
  },

  async updateStatus(
    communityId: string,
    orderId: string,
    status: WorkOrderStatus,
  ): Promise<WorkOrder> {
    const res = await api.patch(`/communities/${communityId}/work-orders/${orderId}/status`, {
      status,
    })
    return res.data
  },

  async assign(
    communityId: string,
    orderId: string,
    staffId: string,
    notes?: string,
  ): Promise<WorkOrder> {
    const res = await api.post(`/communities/${communityId}/work-orders/${orderId}/assign`, {
      staffId,
      notes,
    })
    return res.data
  },

  async addComment(
    communityId: string,
    orderId: string,
    body: string,
  ): Promise<WorkOrderComment> {
    const res = await api.post(`/communities/${communityId}/work-orders/${orderId}/comments`, {
      body,
    })
    return res.data
  },

  async uploadPhoto(
    communityId: string,
    orderId: string,
    imageUri: string,
    mimeType: string,
  ): Promise<{ ok: boolean; url: string; imageUrls: string[] }> {
    const formData = new FormData()
    const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg'
    formData.append('file', { uri: imageUri, type: mimeType, name: `photo-${Date.now()}.${ext}` } as any)
    const res = await api.post(`/communities/${communityId}/work-orders/${orderId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async removePhoto(
    communityId: string,
    orderId: string,
    url: string,
  ): Promise<{ ok: boolean; imageUrls: string[] }> {
    const res = await api.delete(`/communities/${communityId}/work-orders/${orderId}/photos`, {
      data: { url },
    })
    return res.data
  },
}
