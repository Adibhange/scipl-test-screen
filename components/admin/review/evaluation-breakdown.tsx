import type { CandidateResult } from "@/types"
import { Badge } from "@/components/ui/badge"

const categories = [
  ["MCQ", "mcq"],
  ["CODING", "coding"],
  ["SQL", "sql"],
  ["SUBJECTIVE", "subjective"],
] as const

export function EvaluationBreakdown({
  result,
  compact = false,
}: {
  result: CandidateResult
  compact?: boolean
}) {
  const breakdown = result.scoreBreakdown
  if (!breakdown) return null

  if (compact) {
    return (
      <div className='mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 normal-case'>
        <div className='flex items-center justify-between gap-2'>
          <p className='text-[10px] font-semibold uppercase tracking-wider text-[#4F46E5]'>
            Evaluation
          </p>
          <p className='text-xs font-bold text-slate-800'>
            {result.totalMarksAwarded}/{result.totalMarksPossible}
          </p>
        </div>
        <div className='mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-600'>
          {categories.map(([label, key]) => (
            <p key={key} className='flex justify-between gap-1'>
              <span>{label}</span>
              <span className='font-semibold text-slate-800'>
                {breakdown[key].awarded}/{breakdown[key].possible}
              </span>
            </p>
          ))}
        </div>
        {breakdown.tabSwitchDeduction > 0 && (
          <p className='mt-2 text-[10px] font-medium text-red-600'>
            Tab-switch penalty: -{breakdown.tabSwitchDeduction}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-lg border bg-card'>
      <div className='h-1.5 w-full bg-[#4F46E5]' />
      <div className='p-5'>
        <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold'>Evaluation breakdown</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            Marks are grouped by question type before the tab-switch penalty.
          </p>
        </div>
        {breakdown.tabSwitchDeduction > 0 && (
          <Badge className='border-red-200 bg-red-50 text-red-600'>
            Tab-switch penalty: -{breakdown.tabSwitchDeduction}
          </Badge>
        )}
        </div>
        <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {categories.map(([label, key]) => (
          <div key={key} className='rounded-md border border-slate-100 bg-slate-50 px-3 py-2'>
            <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-500'>
              {label}
            </p>
            <p className='mt-1 text-sm font-bold text-slate-800'>
              {breakdown[key].awarded}/{breakdown[key].possible}
            </p>
          </div>
        ))}
        </div>
        <p className='mt-4 text-sm text-muted-foreground'>
          Score before penalty: {breakdown.scoreBeforeDeduction}/{result.totalMarksPossible}
          {" · "}Final score: {result.totalMarksAwarded}/{result.totalMarksPossible}
        </p>
      </div>
    </div>
  )
}
