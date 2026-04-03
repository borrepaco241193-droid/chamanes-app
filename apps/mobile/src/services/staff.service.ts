import api from '../lib/api'

export interface StaffCheckIn {
  id: string
  staffId: string
  checkInTime: string
  checkOutTime?: string | null
  hoursWorked?: number | null
  notes?: string | null
  locationLat?: number | null
  locationLng?: number | null
}

export interface StaffMember {
  id: string
  userId: string
  communityId: string
  position: string
  department?: string
  employeeId?: string
  isActive: boolean
  checkIns: StaffCheckIn[] // active shift only (backend returns at most 1)
}

export const staffService = {
  async getActiveShift(communityId: string): Promise<{ activeShift: StaffCheckIn | null }> {
    const res = await api.get(`/communities/${communityId}/staff/shift`)
    return res.data
  },

  async getShiftHistory(communityId: string): Promise<StaffCheckIn[]> {
    const res = await api.get(`/communities/${communityId}/staff/shifts`)
    return res.data
  },

  async listStaff(communityId: string): Promise<StaffMember[]> {
    const res = await api.get(`/communities/${communityId}/staff`)
    return res.data
  },

  async checkIn(
    communityId: string,
    input: { notes?: string; locationLat?: number; locationLng?: number },
  ): Promise<StaffCheckIn> {
    const res = await api.post(`/communities/${communityId}/staff/checkin`, input)
    return res.data
  },

  async checkOut(communityId: string, input: { notes?: string }): Promise<StaffCheckIn> {
    const res = await api.post(`/communities/${communityId}/staff/checkout`, input)
    return res.data
  },
}
