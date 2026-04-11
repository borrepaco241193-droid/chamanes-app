import api from '../lib/api'

export interface CommonArea {
  id: string
  name: string
  description?: string
  capacity?: number
  imageUrl?: string
  openTime: string
  closeTime: string
  slotDurationMins: number
  requiresApproval: boolean
  hasFee: boolean
  feeAmount: number
  rules?: string
}

export interface TimeSlot {
  startTime: string
  endTime: string
  available: boolean
}

export interface Reservation {
  id: string
  commonAreaId: string
  communityId: string
  userId: string
  title?: string
  startTime: string
  endTime: string
  attendees: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
  notes?: string
  feeAmount: number
  createdAt: string
  commonArea?: { name: string; imageUrl?: string }
  user?: { firstName: string; lastName: string }
}

export const reservationService = {
  async listAreas(communityId: string): Promise<CommonArea[]> {
    const res = await api.get(`/communities/${communityId}/common-areas`)
    return res.data
  },

  async getSlots(
    communityId: string,
    areaId: string,
    date: string,
  ): Promise<{ area: CommonArea; slots: TimeSlot[]; date: string }> {
    const res = await api.get(`/communities/${communityId}/common-areas/${areaId}/slots`, {
      params: { date },
    })
    return res.data
  },

  async create(
    communityId: string,
    data: {
      commonAreaId: string
      startTime: string
      endTime: string
      attendees?: number
      title?: string
      notes?: string
    },
  ): Promise<Reservation> {
    const res = await api.post(`/communities/${communityId}/reservations`, data)
    return res.data
  },

  async list(
    communityId: string,
    params?: { upcoming?: boolean; status?: string; all?: boolean },
  ): Promise<Reservation[]> {
    const res = await api.get(`/communities/${communityId}/reservations`, {
      params: {
        upcoming: params?.upcoming !== undefined ? String(params.upcoming) : undefined,
        status:   params?.status,
        all:      params?.all ? 'true' : undefined,
      },
    })
    return res.data
  },

  async approve(communityId: string, reservationId: string, approve: boolean): Promise<Reservation> {
    const res = await api.patch(
      `/communities/${communityId}/reservations/${reservationId}/approve`,
      { approve },
    )
    return res.data
  },

  async cancel(communityId: string, reservationId: string, reason?: string): Promise<Reservation> {
    const res = await api.delete(`/communities/${communityId}/reservations/${reservationId}`, {
      data: { reason },
    })
    return res.data
  },
}
