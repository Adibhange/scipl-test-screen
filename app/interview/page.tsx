"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { CandidateTestScreen } from "@/components/interview/candidate-test-screen"
import type { Candidate, Question, AnswerValue } from "@/types"

let cachedCandidateValue: string | null = null
let cachedCandidate: Candidate | null = null

function getStoredCandidate() {
  if (typeof window === "undefined") return null

  const value = sessionStorage.getItem("candidate")
  if (value === cachedCandidateValue) return cachedCandidate

  cachedCandidateValue = value
  try {
    cachedCandidate = value ? (JSON.parse(value) as Candidate) : null
  } catch {
    cachedCandidate = null
  }
  return cachedCandidate
}

function subscribeToCandidate() {
  return () => {}
}

export default function InterviewPage() {
  const router = useRouter()
  const candidate = useSyncExternalStore(
    subscribeToCandidate,
    getStoredCandidate,
    () => null,
  )
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!candidate) {
      router.replace("/")
      return
    }

    fetch(`/api/questions?role=${encodeURIComponent(candidate.role)}&experience=${encodeURIComponent(candidate.experience)}&all=1`)
      .then((res) => res.json())
      .then((result) => setQuestions(result))
      .finally(() => setLoading(false))
  }, [candidate, router])

  async function handleSubmit(payload: {
    answers: Record<string, AnswerValue>
    flagged: string[]
    tabSwitches: number
    secondsUsed: number
  }) {
    if (!candidate) return

    const answers = questions.map((q) => {
      const given = payload.answers[q.id]
      let isCorrect: boolean | undefined

      if (q.type === "mcq_single" || q.type === "output_prediction") {
        isCorrect = given === q.correctOptionId
      } else if (q.type === "mcq_multi" && q.correctOptionIds) {
        const givenArr = (given as string[]) || []
        isCorrect =
          givenArr.length === q.correctOptionIds.length &&
          givenArr.every((id) => q.correctOptionIds!.includes(id))
      }

      return {
        questionId: q.id,
        questionTopic: q.topic,
        questionType: q.type,
        answerValue: given ?? (q.type === "mcq_multi" ? [] : ""),
        isCorrect,
      }
    })

    const response = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate,
        answers,
        tabSwitches: payload.tabSwitches,
        secondsUsed: payload.secondsUsed,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error ?? "Could not submit the assessment. Please try again.")
    }
  }

  function handleDone() {
    sessionStorage.removeItem("candidate")
    router.push("/")
  }

  if (!candidate || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading interview...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <CandidateTestScreen
        candidate={candidate}
        questions={questions}
        onSubmit={handleSubmit}
        onDone={handleDone}
      />
    </div>
  )
}
