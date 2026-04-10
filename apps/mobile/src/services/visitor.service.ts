import api from '../lib/api'
import type { VisitorPass, VisitorPassStatus } from '@chamanes/shared'

export interface CreateVisitorPassDTO {
  visitorName: string
  visitorPhone?: string
  visitorEmail?: string
  plateNumber?: string
  validFrom?: string
  validUntil: string
  maxUses?: number
  notes?: string
}

export interface ScanQRDTO {
  qrToken: string
  type: 'ENTRY' | 'EXIT'
  notes?: string
}

export interface AccessEvent {
  id: string
  type: 'ENTRY' | 'EXIT'
  personName: string
  plateNumber?: string
  isAllowed: boolean
  deniedReason?: string
  createdAt: string
  visitorPass?: { visitorName: string; createdById: string } | null
}

export const visitorService = {
  async createPass(communityId: string, data: CreateVisitorPassDTO): Promise<VisitorPass> {
    const res = await api.post(`/communities/${communityId}/visitors`, data)
    return res.data
  },

  async listPasses(
    communityId: string,
    params?: { status?: VisitorPassStatus; page?: number; limit?: number },
  ): Promise<{ passes: VisitorPass[]; total: number; pages: number }> {
    const res = await api.get(`/communities/${communityId}/visitors`, { params })
    return res.data
  },

  async getPass(communityId: string, passId: string): Promise<VisitorPass> {
    const res = await api.get(`/communities/${communityId}/visitors/${passId}`)
    return res.data
  },

  async revokePass(communityId: string, passId: string, reason?: string): Promise<VisitorPass> {
    const res = await api.delete(`/communities/${communityId}/visitors/${passId}`, {
      data: { reason },
    })
    return res.data
  },

  async scanQR(
    communityId: string,
    data: ScanQRDTO,
  ): Promise<{ allowed: boolean; pass: VisitorPass; accessEvent: AccessEvent }> {
    const res = await api.post(`/communities/${communityId}/visitors/scan`, data)
    return res.data
  },

  async listAccessEvents(
    communityId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ events: AccessEvent[]; total: number; pages: number }> {
    const res = await api.get(`/communities/${communityId}/access-events`, { params })
    return res.data
  },
}
