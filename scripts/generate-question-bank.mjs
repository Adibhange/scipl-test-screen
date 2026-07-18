import fs from "fs"
import path from "path"

const experiences = [["0-1", "easy"], ["1-3", "medium"], ["3-5", "hard"], ["5+", "expert"]]
const levelContext = {
  "0-1": "Choose the safe foundational practice.",
  "1-3": "Apply the practice independently in a production feature.",
  "3-5": "Choose the approach that handles scale, failure modes, and trade-offs.",
  "5+": "Choose the strategy you would standardize and lead across multiple teams.",
}
const roles = {
  "SQL Developer": ["SELECT filtering", "JOINs", "aggregations", "window functions", "indexing", "query plans", "transactions", "normalization", "CTEs", "subqueries", "NULL handling", "constraints", "stored procedures", "locking", "partitioning", "views", "data quality", "backup recovery", "security", "performance tuning"],
  "NextJS Developer": ["App Router", "Server Components", "Client Components", "routing", "data fetching", "caching", "forms", "metadata", "images", "authentication", "errors", "loading states", "route handlers", "middleware", "performance", "accessibility", "testing", "deployment", "state", "security"],
  "Full Stack Developer": ["API design", "data modeling", "authentication", "authorization", "React state", "validation", "REST", "error handling", "caching", "background jobs", "logging", "testing", "CI/CD", "security", "performance", "queues", "uploads", "observability", "scalability", "system design"],
  "React Native Developer": ["rendering", "navigation", "state", "lists", "platform APIs", "permissions", "offline storage", "networking", "performance", "animations", "deep links", "notifications", "testing", "native modules", "accessibility", "security", "releases", "crash reporting", "lifecycle", "memory"],
}
const pmTopics = ["Excel formulas", "Excel lookups", "pivot tables", "Excel charts", "data validation", "conditional formatting", "percentages", "ratios", "time and work", "number sequences", "logical reasoning", "critical reasoning", "stakeholder mapping", "scope", "risk", "issues", "scheduling", "resources", "budgets", "Agile", "Scrum", "Kanban", "status reporting", "RACI", "change control", "quality", "vendors", "communication", "conflict", "dependencies", "prioritization", "root cause", "KPIs", "earned value", "capacity", "releases", "roadmaps", "traceability", "facilitation", "decision logs", "governance", "forecasting", "business cases", "feedback", "process improvement", "team health", "negotiation", "escalation", "compliance", "documentation"]
const codeTasks = ["Implement a robust solution for the stated requirement.", "Design error handling and validation for this workflow.", "Implement a performant solution and explain the trade-offs.", "Build a secure solution for the scenario.", "Refactor the scenario for maintainability and testability."]
const subjectiveTasks = ["Explain how you would investigate a production issue in this area.", "Describe the trade-offs and your recommended approach.", "Explain how you would deliver this safely with tests and monitoring."]
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
const singleOptions = (answer) => [{ id: "a", text: answer }, { id: "b", text: "Ignore evidence and use an unvalidated shortcut" }, { id: "c", text: "Delay action until production fails" }, { id: "d", text: "Make unrelated changes without review" }]
const questions = []

for (const [role, topics] of Object.entries(roles)) for (const [experience, difficulty] of experiences) {
  const prefix = `${slug(role)}-${experience}`
  topics.forEach((topic, index) => {
    const multi = index % 5 === 4
    questions.push({ id: `${prefix}-mcq-${index + 1}`, type: multi ? "mcq_multi" : "mcq_single", topic, marks: 1, role, experience, difficulty, stem: `Which practice best supports ${topic}? ${levelContext[experience]}`, options: multi ? [{ id: "a", text: `Apply the documented ${topic} approach` }, { id: "b", text: "Validate behaviour using tests and monitoring" }, { id: "c", text: "Skip review" }, { id: "d", text: "Ignore the requirement" }] : singleOptions(`Apply the documented ${topic} approach and validate the outcome`), ...(multi ? { correctOptionIds: ["a", "b"] } : { correctOptionId: "a" }) })
  })
  codeTasks.forEach((task, index) => questions.push({ id: `${prefix}-coding-${index + 1}`, type: role === "SQL Developer" ? "sql" : "coding", topic: "Practical implementation", marks: 10, role, experience, difficulty, stem: `${task} ${levelContext[experience]}`, starterCode: role === "SQL Developer" ? "-- Write your SQL solution here" : "// Write your solution here", testCasesVisible: [{ input: "Representative valid input", expected: "Correct validated result" }], hiddenCount: 3 }))
  subjectiveTasks.forEach((task, index) => questions.push({ id: `${prefix}-subjective-${index + 1}`, type: "subjective", topic: "Technical judgement", marks: 10, role, experience, difficulty, stem: `${task} ${levelContext[experience]}` }))
}

for (const [experience, difficulty] of experiences) pmTopics.forEach((topic, index) => {
  const multi = index % 6 === 5
  questions.push({ id: `project-manager-${experience}-mcq-${index + 1}`, type: multi ? "mcq_multi" : "mcq_single", topic, marks: 1, role: "Project Manager", experience, difficulty, stem: `Which approach is most effective for ${topic}? ${levelContext[experience]}`, options: multi ? [{ id: "a", text: "Use objective data and documented assumptions" }, { id: "b", text: "Communicate ownership and impact" }, { id: "c", text: "Rely on an unrecorded verbal agreement" }, { id: "d", text: "Wait until the issue escalates" }] : singleOptions("Use objective data, clear ownership, and documented follow-up"), ...(multi ? { correctOptionIds: ["a", "b"] } : { correctOptionId: "a" }) })
})

fs.writeFileSync(path.join(process.cwd(), "data", "questions.json"), `${JSON.stringify(questions, null, 2)}\n`)
console.log(`Generated ${questions.length} questions.`)
