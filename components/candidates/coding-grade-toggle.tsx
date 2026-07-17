"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
}: {
  resultId: string
  questionId: string
  initialGrade?: AdminGrade
  onGradeChange?: (grade: AdminGrade) => void
}) {
  const [grade, setGrade] = useState(initialGrade ?? "")
  const [saving, setSaving] = useState(false)

  async function updateGrade(value: string) {
    setSaving(true)

    try {
      const response = await fetch("/api/admin/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resultId,
          questionId,
          grade: value,
        }),
      })

      if (!response.ok) {
        throw new Error("Unable to save grade")
      }

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
          disabled={saving}
          onClick={() => updateGrade(item.value)}
          className={
            grade === item.value
              ? "bg-primary text-primary-foreground"
              : ""
          }
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
