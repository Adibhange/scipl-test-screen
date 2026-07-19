import "dotenv/config"
import { createClient } from "@supabase/supabase-js"

const [email, password, ...nameParts] = process.argv.slice(2)
const name = nameParts.join(" ").trim() || "HR Administrator"
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || !password || !url || !serviceRoleKey) {
  console.error("Usage: npm run bootstrap:hr -- hr@example.com StrongPassword123 HR Administrator")
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase.auth.admin.createUser({
  email: email.toLowerCase(),
  password,
  email_confirm: true,
})

if (error && !error.message.toLowerCase().includes("already registered")) {
  console.error(`Could not create HR auth user: ${error.message}`)
  process.exit(1)
}

let userId = data.user?.id
if (!userId) {
  const { data: existing, error: lookupError } = await supabase.auth.admin.listUsers()
  if (lookupError) throw lookupError
  userId = existing.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id
}

if (!userId) {
  console.error("Auth user exists, but its id could not be found.")
  process.exit(1)
}

const { error: rowError } = await supabase.from("admin_users").upsert({
  user_id: userId,
  email: email.toLowerCase(),
  name,
  role: "hr",
}, { onConflict: "user_id" })

if (rowError) {
  console.error(`Could not create HR admin record: ${rowError.message}`)
  process.exit(1)
}

console.log(`HR admin ready: ${email.toLowerCase()}`)
