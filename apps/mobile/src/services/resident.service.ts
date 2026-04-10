import api from '../lib/api'

// ── Types ─────────────────────────────────────────────────────

export type OccupancyType = 'OWNER' | 'TENANT'
export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'TRUCK' | 'VAN' | 'OTHER'
export type MemberRelationship =
  | 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'RELATIVE'
  | 'CARETAKER' | 'EMPLOYEE' | 'PARTNER' | 'OTHER'

export interface HouseholdMember {
  id: string
  unitId: string
  name: string
  relationship: MemberRelationship
  phone?: string | null
  email?: string | null
  idDocument?: string | null
  canGrantAccess: boolean
  notes?: string | null
  isActive: boolean
}

export interface Vehicle {
  id: string
  unitId: string
  type: VehicleType
  make: string
  model: string
  year?: number | null
  color: string
  plateNumber: string
  sticker?: string | null
  notes?: string | null
  isActive: boolean
}

export interface ResidentUnit {
  id: string
  number: string
  block?: string | null
  floor?: number | null
  type: string
  sqMeters?: number | null
  parkingSpots: number
  isOccupied: boolean
  notes?: string | null
  ownerName?: string | null
  ownerPhone?: string | null
  ownerEmail?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  emergencyContactRelation?: string | null
  occupancyType: OccupancyType
  isPrimary: boolean
  moveInDate?: string | null
  householdMembers: HouseholdMember[]
  vehicles: Vehicle[]
}

export interface ResidentUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  createdAt?: string
  lastLoginAt?: string | null
}

export interface Resident {
  id: string
  communityUserId: string
  role: string
  phone?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  emergencyContactRelation?: string | null
  joinedAt?: string
  user: ResidentUser
  units: ResidentUnit[]
  pendingPayments?: number
  pendingAmount?: number
  payments?: ResidentPayment[]
}

export interface ResidentPayment {
  id: string
  amount: string | number
  status: string
  description: string
  dueDate?: string | null
  paidAt?: string | null
  periodMonth?: number | null
  periodYear?: number | null
  paymentMethod: string
  lateFeeApplied: boolean
}

// ── Service ───────────────────────────────────────────────────

export const residentService = {
  async listUnits(communityId: string) {
    const res = await api.get(`/communities/${communityId}/units`)
    return res.data as { units: { id: string; number: string; block?: string | null; floor?: number | null; isOccupied: boolean }[] }
  },

  async createUnit(communityId: string, data: {
    number: string; block?: string | null; floor?: number | null
    type?: string; sqMeters?: number | null; parkingSpots?: number
    notes?: string | null; ownerName?: string | null; ownerPhone?: string | null; ownerEmail?: string | null
  }) {
    const res = await api.post(`/communities/${communityId}/units`, data)
    return res.data
  },

  async createResident(communityId: string, data: {
    firstName: string; lastName: string; email: string; phone?: string | null
    password?: string; role?: string; unitId?: string | null
    occupancyType?: 'OWNER' | 'TENANT'; isPrimary?: boolean; moveInDate?: string | null
    emergencyContactName?: string | null; emergencyContactPhone?: string | null; emergencyContactRelation?: string | null
  }) {
    const res = await api.post(`/communities/${communityId}/residents`, data)
    return res.data
  },

  async deleteResident(communityId: string, userId: string) {
    const res = await api.delete(`/communities/${communityId}/residents/${userId}`)
    return res.data
  },

  async uploadTransferProof(communityId: string, paymentId: string, imageUri: string, mimeType: string) {
    const formData = new FormData()
    formData.append('file', { uri: imageUri, type: mimeType, name: `proof-${paymentId}.jpg` } as any)
    const res = await api.post(`/communities/${communityId}/payments/${paymentId}/upload-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { ok: boolean; url: string }
  },

  async list(communityId: string, params?: { search?: string; block?: string; page?: number; limit?: number }) {
    const res = await api.get(`/communities/${communityId}/residents`, { params })
    return res.data as { residents: Resident[]; total: number; page: number; pages: number }
  },

  async get(communityId: string, userId: string) {
    const res = await api.get(`/communities/${communityId}/residents/${userId}`)
    return res.data as Resident
  },

  async update(communityId: string, userId: string, data: Partial<{
    firstName: string
    lastName: string
    email: string
    phone: string | null
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    emergencyContactRelation: string | null
    occupancyType: OccupancyType
    ownerName: string | null
    ownerPhone: string | null
    ownerEmail: string | null
    unitEmergencyContactName: string | null
    unitEmergencyContactPhone: string | null
    unitEmergencyContactRelation: string | null
    unitNotes: string | null
  }>) {
    const res = await api.patch(`/communities/${communityId}/residents/${userId}`, data)
    return res.data
  },

  // Household members
  async addMember(communityId: string, unitId: string, data: Omit<HouseholdMember, 'id' | 'unitId' | 'isActive'>) {
    const res = await api.post(`/communities/${communityId}/units/${unitId}/members`, data)
    return res.data as HouseholdMember
  },

  async updateMember(communityId: string, unitId: string, memberId: string, data: Partial<HouseholdMember>) {
    const res = await api.patch(`/communities/${communityId}/units/${unitId}/members/${memberId}`, data)
    return res.data
  },

  async deleteMember(communityId: string, unitId: string, memberId: string) {
    const res = await api.delete(`/communities/${communityId}/units/${unitId}/members/${memberId}`)
    return res.data
  },

  // Vehicles
  async addVehicle(communityId: string, unitId: string, data: Omit<Vehicle, 'id' | 'unitId' | 'isActive'>) {
    const res = await api.post(`/communities/${communityId}/units/${unitId}/vehicles`, data)
    return res.data as Vehicle
  },

  async updateVehicle(communityId: string, unitId: string, vehicleId: string, data: Partial<Vehicle>) {
    const res = await api.patch(`/communities/${communityId}/units/${unitId}/vehicles/${vehicleId}`, data)
    return res.data
  },

  async deleteVehicle(communityId: string, unitId: string, vehicleId: string) {
    const res = await api.delete(`/communities/${communityId}/units/${unitId}/vehicles/${vehicleId}`)
    return res.data
  },

  // Cash payment
  async markPaid(communityId: string, paymentId: string, data: {
    paymentMethod: 'CASH' | 'TRANSFER' | 'CHECK'
    cashNotes?: string | null
  }) {
    const res = await api.patch(`/communities/${communityId}/payments/${paymentId}/mark-paid`, data)
    return res.data
  },
}
