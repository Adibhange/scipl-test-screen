"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const itemCls = "rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700"
const triggerCls = "h-8 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 shrink-0"
const contentCls = "rounded-2xl border-slate-200 shadow-xl p-1"

export function ResultsFilterBar({
  status,
  role,
  statusCounts,
  roleCounts,
  round,
  testLocation,
  hiringLocation,
  rolesList = [],
  testLocationsList = [],
}: {
  status: string
  role: string
  statusCounts: Record<string, number>
  roleCounts: Record<string, number>
  round: string
  testLocation: string
  hiringLocation: string
  rolesList?: Array<{ value: string; label: string }>
  testLocationsList?: Array<{ value: string; label: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function updateFilters(nextStatus: string, nextRole: string) {
    const params = new URLSearchParams()
    if (nextStatus !== "all") params.set("status", nextStatus)
    if (nextRole !== "all") params.set("role", nextRole)
    if (round !== "all") params.set("round", round)
    if (testLocation !== "all") params.set("testLocation", testLocation)
    if (hiringLocation) params.set("hiringLocation", hiringLocation)
    const query = params.toString()
    startTransition(() => {
      router.push(query ? `/admin?${query}` : "/admin")
    })
  }

  function updateExtra(key: "round" | "testLocation", value: string) {
    const params = new URLSearchParams()
    if (status !== "all") params.set("status", status)
    if (role !== "all") params.set("role", role)
    if (key === "round" ? value !== "all" : round !== "all") params.set("round", key === "round" ? value : round)
    if (key === "testLocation" ? value !== "all" : testLocation !== "all") params.set("testLocation", key === "testLocation" ? value : testLocation)
    if (hiringLocation) params.set("hiringLocation", hiringLocation)
    const query = params.toString()
    startTransition(() => {
      router.push(query ? `/admin?${query}` : "/admin")
    })
  }

  function updateHiringLocation(value: string) {
    const params = new URLSearchParams()
    if (status !== "all") params.set("status", status)
    if (role !== "all") params.set("role", role)
    if (round !== "all") params.set("round", round)
    if (testLocation !== "all") params.set("testLocation", testLocation)
    if (value) params.set("hiringLocation", value)
    startTransition(() => {
      router.push(`/admin?${params.toString()}`)
    })
  }

  return (
    <div className={`relative mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-4 transition-all duration-200 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {isPending && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600 animate-pulse rounded-t-2xl" />
      )}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        
        {/* Left container: Status filter + search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Status tab pills */}
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
            {[
              ["all", "All"],
              ["pending", "Pending"],
              ["evaluated", "Evaluated"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => updateFilters(value, role)}
                className={`flex-1 sm:flex-none rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  status === value
                    ? "bg-white text-indigo-600 shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label} <span className="ml-0.5 text-slate-400 text-[10px]">{statusCounts[value]}</span>
              </button>
            ))}
          </div>

          <div className="hidden sm:block w-px h-5 bg-slate-200" />

          {/* Search input */}
          <input
            value={hiringLocation}
            onChange={(e) => updateHiringLocation(e.target.value)}
            placeholder="Search name, email or location…"
            className="h-8 w-full sm:w-56 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-200 transition-all"
          />
        </div>

        <div className="hidden lg:block w-px h-5 bg-slate-200" />

        {/* Right container: Select dropdown filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Role — Shadcn Select */}
          <Select value={role} onValueChange={v => updateFilters(status, v)}>
            <SelectTrigger className={`${triggerCls} w-full sm:w-[170px]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={contentCls} position="popper" sideOffset={6}>
              <SelectItem value="all" className={itemCls}>
                All Roles <span className="ml-1 text-slate-400 text-[10px]">({roleCounts["all"] ?? 0})</span>
              </SelectItem>
              {rolesList.map(item => (
                <SelectItem key={item.value} value={item.value} className={itemCls}>
                  {item.label} <span className="ml-1 text-slate-400 text-[10px]">({roleCounts[item.value] ?? 0})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Round — Shadcn Select */}
          <Select value={round} onValueChange={v => updateExtra("round", v)}>
            <SelectTrigger className={`${triggerCls} w-full sm:w-[148px]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={contentCls} position="popper" sideOffset={6}>
              <SelectItem value="all" className={itemCls}>All Rounds</SelectItem>
              <SelectItem value="face_to_face" className={itemCls}>Round 1 · F2F</SelectItem>
              <SelectItem value="assessment" className={itemCls}>Round 2 · Assessment</SelectItem>
              <SelectItem value="director" className={itemCls}>Round 3 · Director</SelectItem>
            </SelectContent>
          </Select>

          {/* Test location — Shadcn Select */}
          <Select value={testLocation} onValueChange={v => updateExtra("testLocation", v)}>
            <SelectTrigger className={`${triggerCls} w-full sm:w-[150px]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={contentCls} position="popper" sideOffset={6}>
              <SelectItem value="all" className={itemCls}>All Locations</SelectItem>
              {testLocationsList.map(loc => (
                <SelectItem key={loc.value} value={loc.value} className={itemCls}>{loc.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>
    </div>
  )
}
