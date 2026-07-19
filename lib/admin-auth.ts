import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseServerClient } from "@/lib/db"

export type AdminRole = "hr" | "interviewer" | "director"
export type AdminUser = {
  userId: string
  email: string
  name: string
  role: AdminRole
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user?.email) return null

  const { data } = await getSupabaseServerClient()
    .from("admin_users")
    .select("user_id, email, name, role")
    .eq("user_id", user.id)
    .maybeSingle()

  return data ? {
    userId: data.user_id,
    email: data.email,
    name: data.name,
    role: data.role as AdminRole,
  } : null
}

export function canReviewRound(role: AdminRole, round: "face_to_face" | "assessment" | "director") {
  return role === "hr" || (role === "interviewer" && round !== "director") || (role === "director" && round === "director")
}
