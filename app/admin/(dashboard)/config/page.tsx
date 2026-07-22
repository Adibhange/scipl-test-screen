import { getCurrentAdmin } from "@/repositories/admin.repository"
import { redirect } from "next/navigation"
import { ConfigManager } from "@/app/admin/(dashboard)/config/config-manager"

export const dynamic = "force-dynamic"

export default async function AdminConfigPage() {
  const admin = await getCurrentAdmin()

  // Guard the route completely for HR admins only
  if (!admin) {
    redirect("/admin/login")
  }
  if (admin.role !== "hr") {
    redirect("/admin")
  }

  return (
    <ConfigManager />
  )
}
