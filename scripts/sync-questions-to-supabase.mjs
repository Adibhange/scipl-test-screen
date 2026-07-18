import fs from "fs"
import path from "path"
import "dotenv/config"
import { createClient } from "@supabase/supabase-js"

const filePath = path.join(process.cwd(), "data", "questions.json")
const watchDirectory = path.dirname(filePath)

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""

  return { supabaseUrl, supabaseKey }
}

async function syncQuestions() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig()

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "Supabase credentials are missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) to .env to enable syncing."
    )
    return
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`Questions file not found at ${filePath}`)
    return
  }

  let payload
  try {
    payload = JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch (error) {
    console.error("Failed to parse questions.json:", error)
    return
  }

  const questions = Array.isArray(payload) ? payload : [payload]
  const rows = questions.map((question, index) => ({
    id: question.id || `question-${index}`,
    payload: question,
    updated_at: new Date().toISOString(),
  }))

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  })

  const { error } = await client
    .from("question_documents")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: false })

  if (error) {
    if (error.message.includes("does not exist") || error.message.includes("relation")) {
      console.warn(
        "Supabase sync skipped: table question_documents may not exist or RLS may be blocking writes."
      )
    } else {
      console.warn("Supabase sync skipped:", error.message)
    }

    return
  }

  console.log(`Synced ${rows.length} question records to Supabase.`)
}

let syncTimer = null
function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void syncQuestions()
  }, 1000)
}

console.log(`Watching ${filePath} for changes...`)
fs.watch(watchDirectory, (eventType, filename) => {
  if (!filename) return
  if (filename.toLowerCase() !== "questions.json") return
  if (eventType === "change") {
    scheduleSync()
  }
})

void syncQuestions()
