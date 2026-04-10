import api from '../lib/api'

export interface Community {
  id: string
  name: string
  address: string
  city: string
  state: string
  country: string
  phone?: string | null
  email?: string | null
  logoUrl?: string | null
  timezone: string
  currency: string
  totalUnits: number
  isActive: boolean
  createdAt?: string
}

export const communityService = {
  async list(search?: string) {
    const res = await api.get('/communities', { params: search ? { search } : undefined })
    return res.data as { communities: Community[] }
  },

  async create(data: {
    name: string
    address: string
    city: string
    state: string
    country?: string
    zipCode?: string | null
    phone?: string | null
    email?: string | null
    timezone?: string
    currency?: string
  }) {
    const res = await api.post('/communities', data)
    return res.data as Community
  },

  async get(communityId: string) {
    const res = await api.get(`/communities/${communityId}`)
    return res.data as Community
  },

  async update(communityId: string, data: Partial<Community>) {
    const res = await api.patch(`/communities/${communityId}`, data)
    return res.data
  },
}
