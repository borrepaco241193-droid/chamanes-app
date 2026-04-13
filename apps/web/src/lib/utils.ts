import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined, fmt = 'dd/MM/yyyy') {
  if (!date) return '—'
  return format(new Date(date), fmt, { locale: es })
}

export function formatDateTime(date: string | Date | null | undefined) {
  if (!date) return '—'
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es })
}

export function timeAgo(date: string | Date | null | undefined) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function formatMoney(amount: number | string | null | undefined, currency = 'MXN') {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(Number(amount))
}

export function fullName(user: { firstName: string; lastName: string } | null | undefined) {
  if (!user) return '—'
  return `${user.firstName} ${user.lastName}`
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
}

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED:  'bg-green-100 text-green-800',
  FAILED:     'bg-red-100 text-red-800',
  REFUNDED:   'bg-gray-100 text-gray-800',
}

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  PENDING:   'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW:   'No se presentó',
}

export const RESERVATION_STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  NO_SHOW:   'bg-gray-100 text-gray-800',
}

export const WORK_ORDER_STATUS_LABEL: Record<string, string> = {
  OPEN:        'Abierta',
  ASSIGNED:    'Asignada',
  IN_PROGRESS: 'En progreso',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
}

export const WORK_ORDER_STATUS_COLOR: Record<string, string> = {
  OPEN:        'bg-red-100 text-red-800',
  ASSIGNED:    'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED:   'bg-green-100 text-green-800',
  CANCELLED:   'bg-gray-100 text-gray-800',
}

export const PRIORITY_COLOR: Record<string, string> = {
  LOW:    'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH:   'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
}

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente',
}

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:     'Super Admin',
  COMMUNITY_ADMIN: 'Administrador',
  MANAGER:         'Manager',
  RESIDENT:        'Residente',
  GUARD:           'Guardia',
  STAFF:           'Personal',
}

export const ID_STATUS_COLOR: Record<string, string> = {
  NOT_SUBMITTED: 'bg-gray-100 text-gray-600',
  PENDING:       'bg-yellow-100 text-yellow-800',
  APPROVED:      'bg-green-100 text-green-800',
  REJECTED:      'bg-red-100 text-red-800',
}

export const ID_STATUS_LABEL: Record<string, string> = {
  NOT_SUBMITTED: 'Sin enviar',
  PENDING:       'Pendiente',
  APPROVED:      'Aprobado',
  REJECTED:      'Rechazado',
}
