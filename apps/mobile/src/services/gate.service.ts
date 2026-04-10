import api from '../lib/api'

export const gateService = {
  async openEntry(communityId: string): Promise<{ queued: boolean }> {
    const res = await api.post(`/communities/${communityId}/gate/open`)
    return res.data
  },

  async openExit(communityId: string): Promise<{ queued: boolean }> {
    const res = await api.post(`/communities/${communityId}/gate/exit`)
    return res.data
  },
}
