"use client"

import { useRouter } from "next/navigation"
import { useTransition, useEffect, useState, useCallback } from "react"
import { useUiStore } from "@/stores/ui.store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Search, Calendar, X, AlertCircle } from "lucide-react"

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
  dateRange = "all",
  startDate = "",
  endDate = "",
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
  dateRange?: string
  startDate?: string
  endDate?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const setIsSyncing = useUiStore((state) => state.setIsSyncing)

  // Local state for debounced search input
  const [localSearch, setLocalSearch] = useState(hiringLocation || "")
  const [prevHiringLocation, setPrevHiringLocation] = useState(hiringLocation)

  // Sync state during render if props change to avoid useEffect set-state warning
  if (hiringLocation !== prevHiringLocation) {
    setPrevHiringLocation(hiringLocation)
    setLocalSearch(hiringLocation || "")
  }

  // Local states for custom date range picker
  const [localDateRange, setLocalDateRange] = useState(dateRange || "all")
  const [prevDateRange, setPrevDateRange] = useState(dateRange)

  if (dateRange !== prevDateRange) {
    setPrevDateRange(dateRange)
    setLocalDateRange(dateRange || "all")
  }

  const [localStartDate, setLocalStartDate] = useState(startDate || "")
  const [localEndDate, setLocalEndDate] = useState(endDate || "")
  const [dateError, setDateError] = useState<string | null>(null)

  const [prevStartDate, setPrevStartDate] = useState(startDate)
  const [prevEndDate, setPrevEndDate] = useState(endDate)

  if (startDate !== prevStartDate || endDate !== prevEndDate) {
    setPrevStartDate(startDate)
    setPrevEndDate(endDate)
    setLocalStartDate(startDate || "")
    setLocalEndDate(endDate || "")
    setDateError(null)
  }

  useEffect(() => {
    setIsSyncing(isPending)
    return () => {
      setIsSyncing(false)
    }
  }, [isPending, setIsSyncing])

  // Unified parameter update method memoized with useCallback
  const updateParams = useCallback((newParams: Record<string, string | null>) => {
    const params = new URLSearchParams()
    
    const current = {
      status,
      role,
      round,
      testLocation,
      hiringLocation: localSearch,
      dateRange,
      startDate,
      endDate,
      ...newParams
    }

    if (current.status !== "all") params.set("status", current.status)
    if (current.role !== "all") params.set("role", current.role)
    if (current.round !== "all") params.set("round", current.round)
    if (current.testLocation !== "all") params.set("testLocation", current.testLocation)
    if (current.hiringLocation) params.set("hiringLocation", current.hiringLocation)
    
    if (current.dateRange !== "all") {
      params.set("dateRange", current.dateRange)
      if (current.dateRange === "custom") {
        if (current.startDate) params.set("startDate", current.startDate)
        if (current.endDate) params.set("endDate", current.endDate)
      }
    }

    const query = params.toString()
    startTransition(() => {
      router.push(query ? `/admin?${query}` : "/admin")
    })
  }, [status, role, round, testLocation, localSearch, dateRange, startDate, endDate, router])

  // Debounce search input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== hiringLocation) {
        updateParams({ hiringLocation: localSearch || null })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [localSearch, hiringLocation, updateParams])

  // Custom date validation
  const validateDates = (start: string, end: string) => {
    if (start && end) {
      const s = new Date(start)
      const e = new Date(end)
      if (e < s) {
        return "End date cannot be earlier than start date."
      }
    }
    return null
  }

  const handleStartDateChange = (val: string) => {
    setLocalStartDate(val)
    setDateError(validateDates(val, localEndDate))
  }

  const handleEndDateChange = (val: string) => {
    setLocalEndDate(val)
    setDateError(validateDates(localStartDate, val))
  }

  const handleApplyCustomDates = () => {
    const err = validateDates(localStartDate, localEndDate)
    if (err) {
      setDateError(err)
      return
    }
    updateParams({
      dateRange: "custom",
      startDate: localStartDate || null,
      endDate: localEndDate || null,
    })
  }

  // Determine if any filters differ from default settings
  const isAnyFilterActive =
    status !== "all" ||
    role !== "all" ||
    round !== "all" ||
    testLocation !== "all" ||
    localSearch !== "" ||
    localDateRange !== "all"

  // Date select value display helper
  const dateDisplayValue = 
    localDateRange === "all" ? "All Time"
    : localDateRange === "today" ? "Today"
    : localDateRange === "yesterday" ? "Yesterday"
    : localDateRange === "last_7" ? "Last 7 Days"
    : localDateRange === "last_30" ? "Last 30 Days"
    : localDateRange === "this_month" ? "This Month"
    : localDateRange === "last_month" ? "Last Month"
    : "Custom Range"

  return (
    <div className={`relative mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-4 transition-all duration-200 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {isPending && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600 animate-pulse rounded-t-2xl" />
      )}
      
      <div className="flex flex-col gap-4">
        {/* Top Row: Status pills, search, and clear filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-grow">
            {/* Status Tabs */}
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 shrink-0 select-none">
              {[
                ["all", "All"],
                ["pending", "Pending"],
                ["evaluated", "Evaluated"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateParams({ status: value })}
                  className={`flex-1 sm:flex-none rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    status === value
                      ? "bg-white text-indigo-600 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {label} <span className="ml-0.5 text-slate-400 text-[10px]">{statusCounts[value]}</span>
                </button>
              ))}
            </div>

            <div className="hidden sm:block w-px h-5 bg-slate-200 shrink-0" />

            {/* Search Input Box */}
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by candidate name, email, or location…"
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-200 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("")
                setLocalDateRange("all")
                setLocalStartDate("")
                setLocalEndDate("")
                setDateError(null)
                startTransition(() => {
                  router.push("/admin")
                })
              }}
              className="h-8 rounded-lg border border-slate-200 px-3 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 select-none shadow-xs shrink-0 self-stretch sm:self-auto"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          )}

        </div>

        <div className="w-full h-px bg-slate-100" />

        {/* Bottom Row: Selector drop-downs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Role Dropdown */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 select-none">Role</span>
            <Select value={role} onValueChange={v => updateParams({ role: v })}>
              <SelectTrigger className={`${triggerCls} w-full`}>
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
          </div>

          {/* Round Dropdown */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 select-none">Round</span>
            <Select value={round} onValueChange={v => updateParams({ round: v })}>
              <SelectTrigger className={`${triggerCls} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={contentCls} position="popper" sideOffset={6}>
                <SelectItem value="all" className={itemCls}>All Rounds</SelectItem>
                <SelectItem value="face_to_face" className={itemCls}>Round 1 · F2F</SelectItem>
                <SelectItem value="assessment" className={itemCls}>Round 2 · Assessment</SelectItem>
                <SelectItem value="director" className={itemCls}>Round 3 · Director</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Test Location Dropdown */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 select-none">Test Location</span>
            <Select value={testLocation} onValueChange={v => updateParams({ testLocation: v })}>
              <SelectTrigger className={`${triggerCls} w-full`}>
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

          {/* Date Filter Dropdown */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 select-none">Date Range</span>
            <Select value={localDateRange} onValueChange={v => {
              setLocalDateRange(v)
              if (v !== "custom") {
                updateParams({ dateRange: v, startDate: null, endDate: null })
              }
            }}>
              <SelectTrigger className={`${triggerCls} w-full flex items-center gap-2`}>
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <SelectValue>{dateDisplayValue}</SelectValue>
              </SelectTrigger>
              <SelectContent className={contentCls} position="popper" sideOffset={6}>
                <SelectItem value="all" className={itemCls}>All Time</SelectItem>
                <SelectSeparator />
                <SelectItem value="today" className={itemCls}>Today</SelectItem>
                <SelectItem value="yesterday" className={itemCls}>Yesterday</SelectItem>
                <SelectSeparator />
                <SelectItem value="last_7" className={itemCls}>Last 7 Days</SelectItem>
                <SelectItem value="last_30" className={itemCls}>Last 30 Days</SelectItem>
                <SelectSeparator />
                <SelectItem value="this_month" className={itemCls}>This Month</SelectItem>
                <SelectItem value="last_month" className={itemCls}>Last Month</SelectItem>
                <SelectSeparator />
                <SelectItem value="custom" className={itemCls}>Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* Custom Date Range Picker Container */}
        {localDateRange === "custom" && (
          <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row md:items-end justify-between gap-3 transition-all duration-200">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-grow">
              {/* Start Date picker */}
              <div className="flex-grow flex-1">
                <DatePicker
                  value={localStartDate}
                  onChange={handleStartDateChange}
                  placeholder="Select start date"
                  label="Start Date"
                  otherValue={localEndDate}
                  isEndDate={false}
                />
              </div>

              {/* End Date picker */}
              <div className="flex-grow flex-1">
                <DatePicker
                  value={localEndDate}
                  onChange={handleEndDateChange}
                  placeholder="Select end date"
                  label="End Date"
                  otherValue={localStartDate}
                  isEndDate={true}
                />
              </div>
            </div>

            {/* Apply and error row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 shrink-0">
              {dateError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg py-1.5 px-3">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{dateError}</span>
                </div>
              )}
              
              <button
                type="button"
                disabled={!!dateError || !localStartDate || !localEndDate}
                onClick={handleApplyCustomDates}
                className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Apply Range
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
