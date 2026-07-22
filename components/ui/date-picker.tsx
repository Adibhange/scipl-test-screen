"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

interface DatePickerProps {
  value?: string // YYYY-MM-DD
  onChange: (dateStr: string) => void
  placeholder?: string
  label?: string
  otherValue?: string // YYYY-MM-DD (e.g. startDate if this is endDate, or vice versa)
  isEndDate?: boolean
}

export function DatePicker({
  value = "",
  onChange,
  placeholder = "Select date",
  label = "",
  otherValue = "",
  isEndDate = false,
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Initialize view month/year based on value, otherValue, or today
  const initialDate = useMemo(() => {
    if (value) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) return d
    }
    if (otherValue) {
      const d = new Date(otherValue)
      if (!isNaN(d.getTime())) return d
    }
    return new Date()
  }, [value, otherValue])

  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth())
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear())

  // Sync display when value changes externally (e.g. filters cleared)
  useEffect(() => {
    if (value) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d.getMonth())
        setCurrentYear(d.getFullYear())
      }
    }
  }, [value])

  // Close calendar popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Start and end date mappings for range calculations
  const activeStartDate = isEndDate ? otherValue : value
  const activeEndDate = isEndDate ? value : otherValue

  const todayStr = useMemo(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  }, [])

  // Check if a date string is within the active selection range
  const isInRange = useMemo(() => (dateStr: string) => {
    if (!activeStartDate || !activeEndDate) return false
    return dateStr > activeStartDate && dateStr < activeEndDate
  }, [activeStartDate, activeEndDate])

  // Check if a date should be disabled
  const isDisabled = useMemo(() => (dateStr: string) => {
    if (isEndDate && otherValue && dateStr < otherValue) return true
    if (!isEndDate && otherValue && dateStr > otherValue) return true
    return false
  }, [isEndDate, otherValue])

  // Construct standard 6-row (42 cells) month days grid
  const cells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    const list: Array<{
      day: number
      month: number // -1 for prev, 0 for current, 1 for next
      year: number
      isCurrentMonth: boolean
      dateStr: string
    }> = []

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      list.push({
        day: d,
        month: -1,
        year: prevYear,
        isCurrentMonth: false,
        dateStr,
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`
      list.push({
        day: i,
        month: 0,
        year: currentYear,
        isCurrentMonth: true,
        dateStr,
      })
    }

    // Next month leading days (fill up to 42 cells)
    const nextDaysCount = 42 - list.length
    for (let i = 1; i <= nextDaysCount; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`
      list.push({
        day: i,
        month: 1,
        year: nextYear,
        isCurrentMonth: false,
        dateStr,
      })
    }

    return list
  }, [currentYear, currentMonth])

  // Navigations
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Formatting date for display (e.g. YYYY-MM-DD -> 22 Jul 2026)
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return placeholder
    const [y, m, d] = dateStr.split("-").map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    if (isNaN(date.getTime())) return placeholder

    const day = date.getUTCDate()
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = months[date.getUTCMonth()]
    const year = date.getUTCFullYear()

    return `${day} ${month} ${year}`
  }

  // Handle cell click selection
  const handleSelectCell = (dateStr: string) => {
    onChange(dateStr)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <span className="text-[10px] font-semibold text-slate-500 mb-1 block">
          {label}
        </span>
      )}

      {/* Popover trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-700 hover:border-indigo-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all flex items-center justify-between relative cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className={value ? "text-slate-700" : "text-slate-400"}>
            {formatDateLabel(value)}
          </span>
        </div>
        <span className="absolute right-3 top-2 pointer-events-none text-slate-400 text-[8px]">
          ▼
        </span>
      </button>

      {/* Calendar dropdown popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 mt-1.5 z-50 w-full sm:w-[320px] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header month navigation */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-800">
              {monthNames[currentMonth]} {currentYear}
            </h4>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-slate-500 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-slate-500 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Monthly grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {cells.map((cell, idx) => {
              const { isCurrentMonth, dateStr, day } = cell
              const isSelStart = dateStr === activeStartDate
              const isSelEnd = dateStr === activeEndDate
              const isToday = dateStr === todayStr
              const inRange = isInRange(dateStr)
              const disabled = isDisabled(dateStr)

              // Trailing/leading month days and disabled dates
              if (!isCurrentMonth || disabled) {
                return (
                  <div
                    key={`${dateStr}-${idx}`}
                    className="py-1 text-xs text-slate-300 pointer-events-none select-none flex items-center justify-center h-8 w-8 mx-auto"
                  >
                    {day}
                  </div>
                )
              }

              // Active selected boundary dates
              if (isSelStart || isSelEnd) {
                return (
                  <button
                    key={`${dateStr}-${idx}`}
                    type="button"
                    onClick={() => handleSelectCell(dateStr)}
                    className="h-8 w-8 rounded-full bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-sm flex items-center justify-center mx-auto cursor-pointer"
                  >
                    {day}
                  </button>
                )
              }

              // Mid-range highlighted dates
              if (inRange) {
                return (
                  <button
                    key={`${dateStr}-${idx}`}
                    type="button"
                    onClick={() => handleSelectCell(dateStr)}
                    className="h-8 w-8 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs flex items-center justify-center mx-auto cursor-pointer"
                  >
                    {day}
                  </button>
                )
              }

              // Today's date indicator
              if (isToday) {
                return (
                  <button
                    key={`${dateStr}-${idx}`}
                    type="button"
                    onClick={() => handleSelectCell(dateStr)}
                    className="h-8 w-8 rounded-full border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold text-xs flex items-center justify-center mx-auto cursor-pointer"
                  >
                    {day}
                  </button>
                )
              }

              // Normal selectable day
              return (
                <button
                  key={`${dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleSelectCell(dateStr)}
                  className="h-8 w-8 rounded-full text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 font-medium text-xs flex items-center justify-center mx-auto cursor-pointer"
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
