import fs from "fs"
import path from "path"
import "dotenv/config"
import { createClient } from "@supabase/supabase-js"

const filePath = path.join(process.cwd(), "data", "questions.json")
const watchDirectory = path.dirname(filePath)

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  return { supabaseUrl, supabaseKey }
}

async function syncQuestions() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig()

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "Supabase credentials are missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env to enable syncing."
    )
    process.exitCode = 1
    return false
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`Questions file not found at ${filePath}`)
    process.exitCode = 1
    return false
  }

  let payload
  try {
    payload = JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch (error) {
    console.error("Failed to parse questions.json:", error)
    process.exitCode = 1
    return false
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

  const { data: existingRows, error: existingError } = await client
    .from("question_documents")
    .select("id")

  if (existingError) {
    console.warn("Supabase sync skipped:", existingError.message)
    process.exitCode = 1
    return false
  }

  const nextIds = new Set(rows.map((row) => row.id))
  const obsoleteIds = (existingRows ?? [])
    .map((row) => row.id)
    .filter((id) => !nextIds.has(id))

  if (obsoleteIds.length) {
    const { error: deleteError } = await client
      .from("question_documents")
      .delete()
      .in("id", obsoleteIds)

    if (deleteError) {
      console.warn("Supabase removal skipped:", deleteError.message)
      process.exitCode = 1
      return false
    }
  }

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

    process.exitCode = 1
    return false
  }

  console.log(`Synced ${rows.length} questions; removed ${obsoleteIds.length} obsolete records.`)
  return true
}

let syncTimer = null
function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void syncQuestions()
  }, 1000)
}

if (process.argv.includes("--watch")) {
  console.log(`Watching ${filePath} for changes...`)
  fs.watch(watchDirectory, (eventType, filename) => {
    if (!filename || filename.toLowerCase() !== "questions.json") return
    if (eventType === "change") scheduleSync()
  })
}

void syncQuestions()
