// ============================================================
// Chamanes — Shared Types (used by both mobile and backend)
// ============================================================

export type UserRole = 'SUPER_ADMIN' | 'COMMUNITY_ADMIN' | 'RESIDENT' | 'GUARD' | 'STAFF'

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
export type PaymentType = 'MAINTENANCE_FEE' | 'RESERVATION_FEE' | 'FINE' | 'OTHER'

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export type WorkOrderStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type AccessEventType = 'ENTRY' | 'EXIT'
export type VisitorPassStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED'

// ── API Response wrappers ─────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  message: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ── Auth ──────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: UserRole
  communityId?: string
  communityRole?: UserRole
}

// ── Community ─────────────────────────────────────────────────

export interface Community {
  id: string
  name: string
  address: string
  city: string
  state: string
  country: string
  phone?: string
  email?: string
  logoUrl?: string
  timezone: string
  currency: string
  totalUnits: number
  isActive: boolean
  settings: CommunitySettings
}

export interface CommunitySettings {
  maintenanceFeeAmount?: number
  paymentDueDayOfMonth?: number
  lateFeePct?: number
  gracePeriodDays?: number
  allowSelfCheckIn?: boolean
  requireVisitorPhoto?: boolean
  maxVisitorPassDays?: number
}

// ── Unit ──────────────────────────────────────────────────────

export interface Unit {
  id: string
  communityId: string
  number: string
  floor?: number
  block?: string
  type: string
  isOccupied: boolean
  residents?: ResidentSummary[]
}

export interface ResidentSummary {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string
  isPrimary: boolean
}

// ── Visitor Pass ──────────────────────────────────────────────

export interface VisitorPass {
  id: string
  communityId: string
  visitorName: string
  visitorPhone?: string
  plateNumber?: string
  qrCode: string
  qrCodeImageUrl?: string
  status: VisitorPassStatus
  validFrom: string
  validUntil: string
  maxUses: number
  usedCount: number
  createdAt: string
}

// ── Payment ───────────────────────────────────────────────────

export interface Payment {
  id: string
  communityId: string
  unitId: string
  amount: number
  currency: string
  type: PaymentType
  description: string
  status: PaymentStatus
  dueDate?: string
  paidAt?: string
  periodMonth?: number
  periodYear?: number
  stripeReceiptUrl?: string
}

// ── Notification types ────────────────────────────────────────

export type NotificationType =
  | 'payment_due'
  | 'payment_received'
  | 'visitor_arrived'
  | 'visitor_pass_created'
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'work_order_updated'
  | 'announcement'
