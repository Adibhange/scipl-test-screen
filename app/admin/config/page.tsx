import { getCurrentAdmin } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { ConfigManager } from "@/app/admin/config/config-manager"
import { AdminShell } from "@/components/layout/admin-shell"

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
    <AdminShell admin={admin}>
      <ConfigManager />
    </AdminShell>
  )
}
