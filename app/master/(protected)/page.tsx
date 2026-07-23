import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Master's real home is /admin — it now accepts a Master session the same
 * way it accepts a real Supabase Admin session (see middleware.ts and
 * lib/write-actor.ts). This route only exists so a bare /master URL
 * (e.g. an old bookmark) still goes somewhere sensible instead of 404ing.
 */
export default function MasterIndexPage() {
	redirect("/admin");
}
