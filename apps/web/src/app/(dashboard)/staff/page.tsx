'use client'
import { useStaff } from '@/hooks/useStaff'
import { useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder } from '@/hooks/useStaff'
import { fullName, formatDate, WORK_ORDER_STATUS_COLOR, WORK_ORDER_STATUS_LABEL, PRIORITY_COLOR, PRIORITY_LABEL } from '@/lib/utils'
import { UserCog, Clock, Briefcase } from 'lucide-react'
import { useState } from 'react'

export default function StaffPage() {
  const { data: staffData, isLoading } = useStaff()
  const staff = Array.isArray(staffData) ? staffData : []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Personal</h1>
        <p className="text-gray-500 text-sm">{staff.length} empleado{staff.length !== 1 ? 's' : ''} registrado{staff.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Empleado</th>
                <th className="table-th">Email</th>
                <th className="table-th">Puesto</th>
                <th className="table-th">Departamento</th>
                <th className="table-th">ID Empleado</th>
                <th className="table-th">Inicio</th>
                <th className="table-th">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">Cargando...</td></tr>}
              {!isLoading && staff.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center py-12">
                  <UserCog className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400">No hay personal registrado</p>
                </td></tr>
              )}
              {staff.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                        {s.user?.firstName?.[0]}{s.user?.lastName?.[0]}
                      </div>
                      <span className="font-medium">{fullName(s.user)}</span>
                    </div>
                  </td>
                  <td className="table-td text-gray-500">{s.user?.email}</td>
                  <td className="table-td">{s.position}</td>
                  <td className="table-td text-gray-500">{s.department ?? '—'}</td>
                  <td className="table-td text-gray-500">{s.employeeId ?? '—'}</td>
                  <td className="table-td text-gray-500">{formatDate(s.startDate)}</td>
                  <td className="table-td">
                    <span className={`badge ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {s.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
