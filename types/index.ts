export type Candidate = {
	/** Assigned by Supabase when the candidate intake is saved. */
	id?: string
	name: string
  mobile: string
  email: string
  role: string
  experience: string
}

export type MCQOption = { id: string; text: string }

export type QuestionType =
  | "mcq_single"
  | "mcq_multi"
  | "output_prediction"
  | "coding"
  | "sql"
  | "subjective"

export type Question = {
  id: string
  type: QuestionType
  topic: string
  marks: number
  role: string
  experience: string
  difficulty: string
  stem: string
  code?: string                 // shown as a read-only snippet above the question
  options?: MCQOption[]         // mcq_single, mcq_multi, output_prediction
  correctOptionId?: string      // mcq_single, output_prediction
  correctOptionIds?: string[]   // mcq_multi
  starterCode?: string          // coding, sql
  testCasesVisible?: { input: string; expected: string }[]
  hiddenCount?: number
}

export type AnswerValue = string | string[]

export type AdminGrade = "correct" | "partial" | "incorrect"

export type Answer = {
  questionId: string
  questionTopic: string
  questionType: QuestionType
  answerValue: AnswerValue
  isCorrect?: boolean
  adminGrade?: AdminGrade   // set by the admin for coding questions
  marksAwarded?: number     // derived: full/half/zero based on adminGrade (coding) or isCorrect (mcq)
}

export type CandidateResult = {
  id: string
  candidate: Candidate
  answers: Answer[]
  tabSwitches: number
  secondsUsed: number
  submittedAt: string
  totalMarksAwarded?: number  // set once the admin clicks "Calculate results"
  totalMarksPossible?: number
  scoreBreakdown?: {
    mcq: { awarded: number; possible: number }
    coding: { awarded: number; possible: number }
    sql: { awarded: number; possible: number }
    subjective: { awarded: number; possible: number }
    scoreBeforeDeduction: number
    tabSwitchDeduction: number
  }
}
