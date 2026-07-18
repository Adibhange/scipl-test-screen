"use client"

import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROLES } from "@/data/roles"

const roles = [
  { value: "all", label: "All Applications" },
  ...ROLES.map(({ value, label }) => ({ value, label })),
]

export function ResultsFilterBar({
  status,
  role,
  statusCounts,
  roleCounts,
}: {
  status: string
  role: string
  statusCounts: Record<string, number>
  roleCounts: Record<string, number>
}) {
  const router = useRouter()

  function updateFilters(nextStatus: string, nextRole: string) {
    const params = new URLSearchParams()
    if (nextStatus !== "completed") params.set("status", nextStatus)
    if (nextRole !== "all") params.set("role", nextRole)
    const query = params.toString()
    router.push(query ? `/admin?${query}` : "/admin")
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
        {[
          ["completed", "Completed Tests"],
          ["pending", "Pending Evaluation"],
          ["evaluated", "Completed Evaluation"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => updateFilters(value, role)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              status === value
                ? "bg-white text-[#4F46E5] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label} <span className="ml-1 text-slate-400">{statusCounts[value]}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Application</span>
        <Select value={role} onValueChange={(value) => updateFilters(status, value)}>
          <SelectTrigger className="h-9 w-48 rounded-lg border-slate-200 bg-white text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {roles.map((item) => (
              <SelectItem key={item.value} value={item.value} className="text-xs">
                {item.label} ({roleCounts[item.value] ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
