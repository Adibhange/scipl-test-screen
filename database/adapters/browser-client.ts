import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/env";

/**
 * Create a Supabase browser-side client.
 */
export function createSupabaseBrowserClient() {
	const url = env.NEXT_PUBLIC_SUPABASE_URL;
	const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !key) throw new Error("Supabase browser environment is not configured");
	return createBrowserClient(url, key);
}
