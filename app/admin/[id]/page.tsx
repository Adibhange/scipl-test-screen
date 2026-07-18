import { notFound } from "next/navigation"
import { getResultById } from "@/lib/results"
import { getAllQuestions } from "@/lib/questions"
import { AdminQuestionReview } from "@/components/admin/admin-question-review"

export default async function CandidateResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getResultById(id)

  if (!result) notFound()

  const allQuestions = await getAllQuestions()
  const items = result.answers.map((answer) => ({
    answer,
    question: allQuestions.find((q) => q.id === answer.questionId) ?? null,
  }))

  return <AdminQuestionReview result={result} items={items} />
}
