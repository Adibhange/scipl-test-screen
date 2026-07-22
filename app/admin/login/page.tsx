"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/database/adapters/browser-client";
import { AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [showInactiveToast, setShowInactiveToast] = useState(false);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			if (params.get("inactive") === "true") {
				Promise.resolve().then(() => setShowInactiveToast(true));
				const url = new URL(window.location.href);
				url.searchParams.delete("inactive");
				window.history.replaceState({}, document.title, url.pathname);
			}
		}
	}, []);

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

			{/* Floating Toast Alert for Inactivity Logout */}
			{showInactiveToast && (
				<div className='fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-white/95 backdrop-blur-md border border-amber-100 shadow-2xl rounded-2xl p-4 w-80 animate-in fade-in slide-in-from-top-2 duration-150 ease-out text-slate-800'>
					<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 border border-amber-100/50 shadow-xs shadow-amber-50'>
						<AlertCircle className='h-4.5 w-4.5' />
					</div>
					<div className='flex-1 min-w-0'>
						<p className='text-xs font-bold text-slate-900 tracking-tight'>
							Session Expired
						</p>
						<p className='text-[11px] text-slate-500 mt-0.5 leading-relaxed truncate'>
							Logged out due to inactivity.
						</p>
					</div>
					<button 
						type="button"
						onClick={() => setShowInactiveToast(false)}
						className="text-slate-400 hover:text-slate-600 transition-colors text-xs font-bold cursor-pointer"
					>
						✕
					</button>
				</div>
			)}
		</main>
	);
}
