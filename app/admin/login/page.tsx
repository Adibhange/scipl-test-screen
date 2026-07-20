"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function submit(event: FormEvent) {
		event.preventDefault();
		setLoading(true);
		setError("");
		const supabase = createSupabaseBrowserClient();
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (signInError) {
			setError(signInError.message);
			setLoading(false);
		} else {
			window.sessionStorage.clear();
			router.replace("/admin");
		}
	}

	return (
		<main className='flex min-h-screen items-center justify-center bg-slate-50 px-5'>
			<Card className='w-full max-w-md shadow-sm'>
				<CardContent className='space-y-6 p-8'>
					<div>
						<p className='text-xs font-semibold uppercase tracking-[0.24em] text-[#4F46E5]'>
							SCIPL Admin
						</p>
						<h1 className='mt-2 text-2xl font-bold text-slate-900'>
							Sign in to interview operations
						</h1>
						<p className='mt-2 text-sm text-slate-500'>
							HR, interviewers, and directors use their assigned account.
						</p>
					</div>
					<form
						onSubmit={submit}
						className='space-y-4'>
						<Input
							type='email'
							required
							placeholder='Work email'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
						<Input
							type='password'
							required
							placeholder='Password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						{error && <p className='text-sm text-red-600'>{error}</p>}
						<Button
							className='w-full'
							disabled={loading}>
							{loading ? "Signing in…" : "Sign in"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
