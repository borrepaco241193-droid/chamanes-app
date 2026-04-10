// ============================================================
// In-memory token store — single source of truth for the
// current access token. Avoids async SecureStore reads on
// every request and race conditions after login.
// ============================================================

let _accessToken: string | null = null
let _refreshToken: string | null = null

export const tokenStore = {
  setTokens(access: string, refresh: string) {
    _accessToken = access
    _refreshToken = refresh
  },
  clearTokens() {
    _accessToken = null
    _refreshToken = null
  },
  getAccessToken() {
    return _accessToken
  },
  getRefreshToken() {
    return _refreshToken
  },
}
