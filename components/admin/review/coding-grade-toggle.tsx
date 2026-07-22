"use client"

import { useState } from "react"
import { gradeCandidateAnswer } from "@/services/client/admin.service"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AdminGrade } from "@/types"

const gradeOptions = [
  {
    label: "Correct",
    value: "correct",
  },
  {
    label: "Partial",
    value: "partial",
  },
  {
    label: "Incorrect",
    value: "incorrect",
  },
]

export function CodingGradeToggle({
  resultId,
  questionId,
  initialGrade,
  onGradeChange,
  disabled = false,
}: {
  resultId: string
  questionId: string
  initialGrade?: AdminGrade
  onGradeChange?: (grade: AdminGrade) => void
  disabled?: boolean
}) {
  const [grade, setGrade] = useState(initialGrade ?? "")
  const [saving, setSaving] = useState(false)

  async function updateGrade(value: string) {
    if (disabled) return
    setSaving(true)

    try {
      await gradeCandidateAnswer({
        resultId,
        questionId,
        grade: value,
      })

      const nextGrade = value as AdminGrade
      setGrade(nextGrade)
      onGradeChange?.(nextGrade)
    } catch (error) {
      console.error("Failed to update grade:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="text-xs text-muted-foreground">
        Grade:
      </span>

      {gradeOptions.map((item) => (
        <Button
          key={item.value}
          size="sm"
          variant="outline"
          disabled={saving || disabled}
          onClick={() => updateGrade(item.value)}
          className={cn(
            grade === item.value
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "hover:bg-slate-100",
            disabled && "cursor-not-allowed opacity-50 bg-slate-50 text-slate-400 border-slate-200"
          )}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
