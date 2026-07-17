"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calculator } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function CalculateResultsButton({
  resultId,
  tabSwitches,
}: {
  resultId: string
  tabSwitches: number
}) {
  const [calculating, setCalculating] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const deduction = tabSwitches * 10

  async function handleClick() {
    setCalculating(true)
    try {
      const response = await fetch(`/api/results/${resultId}/calculate`, { method: "POST" })
      if (!response.ok) throw new Error("Unable to calculate results")
      setOpen(false)
      router.push("/admin")
    } finally {
      setCalculating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        disabled={calculating}
        className="flex items-center gap-2 text-[12px] px-4 py-2.5 rounded-lg border border-[#3D6EA0] bg-[#17253A] text-[#9DC3E3] hover:bg-[#1B2C44] transition-colors disabled:opacity-50"
      >
        <Calculator className="w-3.5 h-3.5" strokeWidth={1.5} />
        Calculate results
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm final evaluation</DialogTitle>
          <DialogDescription>
            {tabSwitches > 0
              ? `The candidate changed tabs ${tabSwitches} time${tabSwitches === 1 ? "" : "s"}. A penalty of 10 marks per switch will deduct ${deduction} marks from the score.`
              : "No tab switches were recorded. No integrity penalty will be applied."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border px-4 py-2 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClick}
            disabled={calculating}
            className="rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {calculating ? "Calculating…" : "Apply penalty & calculate"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
