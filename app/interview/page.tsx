"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CandidateTestScreen } from "@/components/interview/candidate-test-screen"
import type { Candidate, Question, AnswerValue } from "@/types"

export default function InterviewPage() {
  const router = useRouter()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem("candidate")
    if (!stored) {
      router.replace("/")
      return
    }
    const data: Candidate = JSON.parse(stored)
    setCandidate(data)

    fetch(`/api/questions?role=${encodeURIComponent(data.role)}&experience=${encodeURIComponent(data.experience)}&all=1`)
      .then((res) => res.json())
      .then((result) => setQuestions(result))
      .finally(() => setLoading(false))
  }, [router])

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

    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate,
        answers,
        tabSwitches: payload.tabSwitches,
        secondsUsed: payload.secondsUsed,
      }),
    })
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