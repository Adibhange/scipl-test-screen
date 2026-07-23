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

import { DatePicker } from "@/components/ui/date-picker"
import { Search, Calendar, X, AlertCircle } from "lucide-react"

const itemCls = "rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700"
const triggerCls = "h-9 rounded-lg border-slate-200/80 bg-white text-xs font-semibold text-slate-750 focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0 shadow-2xs hover:border-slate-300 transition-colors"
const contentCls = "rounded-2xl border-slate-200 shadow-xl p-1"

export function ResultsFilterBar({
  evaluation,
  role,
  round,
  hiringStatus,
  hiringLocation,
  search,
  rolesList = [],
  hiringLocationsList = [],
  dateRange = "all",
  startDate = "",
  endDate = "",
  roleCounts,
  evaluationCounts,
}: {
  evaluation: string
  role: string
  round: string
  hiringStatus: string
  hiringLocation: string
  search: string
  rolesList?: Array<{ value: string; label: string }>
  hiringLocationsList?: Array<{ value: string; label: string }>
  dateRange?: string
  startDate?: string
  endDate?: string
  roleCounts: Record<string, number>
  evaluationCounts: Record<string, number>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const setIsSyncing = useUiStore((state) => state.setIsSyncing)

  // Local state for debounced search input
  const [localSearch, setLocalSearch] = useState(search || "")
  const [prevSearch, setPrevSearch] = useState(search)

  // Sync state during render if props change to avoid useEffect set-state warning
  if (search !== prevSearch) {
    setPrevSearch(search)
    setLocalSearch(search || "")
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
      evaluation,
      role,
      round,
      hiringStatus,
      hiringLocation,
      search: localSearch,
      dateRange,
      startDate,
      endDate,
      ...newParams
    }

    if (current.evaluation !== "all") params.set("evaluation", current.evaluation)
    if (current.role !== "all") params.set("role", current.role)
    if (current.round !== "all") params.set("round", current.round)
    if (current.hiringStatus !== "all") params.set("hiringStatus", current.hiringStatus)
    if (current.hiringLocation !== "all") params.set("hiringLocation", current.hiringLocation)
    if (current.search) params.set("search", current.search)
    
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
  }, [evaluation, role, round, hiringStatus, hiringLocation, localSearch, dateRange, startDate, endDate, router])

  // Debounce search input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        updateParams({ search: localSearch || null })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [localSearch, search, updateParams])

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
    evaluation !== "all" ||
    role !== "all" ||
    round !== "all" ||
    hiringStatus !== "all" ||
    hiringLocation !== "all" ||
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
    <div className={`relative mb-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white shadow-xs p-5 transition-all duration-200 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {isPending && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600 animate-pulse rounded-t-2xl" />
      )}
      
      <div className="flex flex-col gap-4">
        {/* Top Row: Search and clear filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          {/* Search Input Box (visually prioritized, 60-70% of the filter row width on large screen) */}
          <div className="relative flex-grow max-w-2xl lg:max-w-3xl">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search candidate by name, email or phone..."
              className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50 pl-11 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
            />
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
              className="h-10 rounded-xl border border-slate-200/80 px-4 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 select-none shadow-2xs shrink-0 self-stretch sm:self-auto cursor-pointer"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          )}

        </div>

        <div className="w-full h-px bg-slate-100" />

        {/* Bottom Row: Selector drop-downs (6 filters grid layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Role Dropdown */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 select-none">Role</span>
            <Select value={role} onValueChange={v => updateParams({ role: v })}>
              <SelectTrigger className={`${triggerCls} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={contentCls} position="popper" sideOffset={6}>
                <SelectItem value="all" className={itemCls}>
                  All <span className="ml-1 text-slate-400 text-[10px]">({roleCounts["all"] ?? 0})</span>
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
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 select-none">Round</span>
            <Select value={round} onValueChange={v => updateParams({ round: v })}>
              <SelectTrigger className={`${triggerCls} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={contentCls} position="popper" sideOffset={6}>
                <SelectItem value="all" className={itemCls}>All</SelectItem>
                <SelectItem value="face_to_face" className={itemCls}>Round 1 · F2F</SelectItem>
                <SelectItem value="assessment" className={itemCls}>Round 2 · Assessment</SelectItem>
                <SelectItem value="director" className={itemCls}>Round 3 · Director</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Evaluation Dropdown */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 select-none">Evaluation</span>
            <Select value={evaluation} onValueChange={v => updateParams({ evaluation: v })}>
              <SelectTrigger className={`${triggerCls} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={contentCls} position="popper" sideOffset={6}>
                <SelectItem value="all" className={itemCls}>
                  All <span className="ml-1 text-slate-400 text-[10px]">({evaluationCounts["all"] ?? 0})</span>
                </SelectItem>
                <SelectItem value="pending" className={itemCls}>
                  Pending <span className="ml-1 text-slate-400 text-[10px]">({evaluationCounts["pending"] ?? 0})</span>
                </SelectItem>
                <SelectItem value="evaluated" className={itemCls}>
                  Evaluated <span className="ml-1 text-slate-400 text-[10px]">({evaluationCounts["evaluated"] ?? 0})</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hiring Status Dropdown */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 select-none">Hiring Status</span>
            <Select value={hiringStatus} onValueChange={v => updateParams({ hiringStatus: v })}>
              <SelectTrigger className={`${triggerCls} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={contentCls} position="popper" sideOffset={6}>
                <SelectItem value="all" className={itemCls}>All</SelectItem>
                <SelectItem value="screening" className={itemCls}>Screening</SelectItem>
                <SelectItem value="in_interview" className={itemCls}>In Interview</SelectItem>
                <SelectItem value="on_hold" className={itemCls}>On Hold</SelectItem>
                <SelectItem value="hired" className={itemCls}>Hired</SelectItem>
                <SelectItem value="rejected" className={itemCls}>Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hiring Location Dropdown */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 select-none">Hiring Location</span>
            <Select value={hiringLocation} onValueChange={v => updateParams({ hiringLocation: v })}>
              <SelectTrigger className={`${triggerCls} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={contentCls} position="popper" sideOffset={6}>
                <SelectItem value="all" className={itemCls}>All</SelectItem>
                {hiringLocationsList.map(loc => (
                  <SelectItem key={loc.value} value={loc.value} className={itemCls}>{loc.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter Dropdown */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 select-none">Date Range</span>
            <Select value={localDateRange} onValueChange={v => {
              setLocalDateRange(v)
              if (v !== "custom") {
                updateParams({ dateRange: v, startDate: null, endDate: null })
              }
            }}>
              <SelectTrigger className={`${triggerCls} w-full flex items-center gap-2`}>
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
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
                className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
