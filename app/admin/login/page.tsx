// "use client";

// import { FormEvent, useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent } from "@/components/ui/card";
// import { createSupabaseBrowserClient } from "@/database/adapters/browser-client";
// import { toast } from "sonner";

// export default function AdminLoginPage() {
// 	const router = useRouter();
// 	const [email, setEmail] = useState("");
// 	const [password, setPassword] = useState("");
// 	const [error, setError] = useState("");
// 	const [loading, setLoading] = useState(false);

// 	useEffect(() => {
// 		if (typeof window !== "undefined") {
// 			const params = new URLSearchParams(window.location.search);
// 			if (params.get("inactive") === "true") {
// 				toast.warning("Session expired.");
// 				const url = new URL(window.location.href);
// 				url.searchParams.delete("inactive");
// 				window.history.replaceState({}, document.title, url.pathname);
// 			}
// 		}
// 	}, []);

// 	async function submit(event: FormEvent) {
// 		event.preventDefault();
// 		setLoading(true);
// 		setError("");
// 		const supabase = createSupabaseBrowserClient();
// 		const { error: signInError } = await supabase.auth.signInWithPassword({
// 			email,
// 			password,
// 		});
// 		if (signInError) {
// 			setError(signInError.message);
// 			toast.error(signInError.message);
// 			setLoading(false);
// 		} else {
// 			window.sessionStorage.clear();
// 			router.replace("/admin");
// 		}
// 	}

// 	return (
// 		<main className='flex min-h-screen items-center justify-center bg-slate-50 px-5'>
// 			<Card className='w-full max-w-md shadow-sm'>
// 				<CardContent className='space-y-6 p-8'>
// 					<div>
// 						<p className='text-xs font-semibold uppercase tracking-[0.24em] text-[#4F46E5]'>
// 							SCIPL Admin
// 						</p>
// 						<h1 className='mt-2 text-2xl font-bold text-slate-900'>
// 							Sign in to interview operations
// 						</h1>
// 						<p className='mt-2 text-sm text-slate-500'>
// 							HR, interviewers, and directors use their assigned account.
// 						</p>
// 					</div>
// 					<form
// 						onSubmit={submit}
// 						className='space-y-4'>
// 						<Input
// 							type='email'
// 							required
// 							placeholder='Work email'
// 							value={email}
// 							onChange={(e) => setEmail(e.target.value)}
// 						/>
// 						<Input
// 							type='password'
// 							required
// 							placeholder='Password'
// 							value={password}
// 							onChange={(e) => setPassword(e.target.value)}
// 						/>
// 						{error && <p className='text-sm text-red-600'>{error}</p>}
// 						<Button
// 							className='w-full'
// 							disabled={loading}>
// 							{loading ? "Signing in…" : "Sign in"}
// 						</Button>
// 					</form>
// 				</CardContent>
// 			</Card>
// 		</main>
// 	);
// }

"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createSupabaseBrowserClient } from "@/database/adapters/browser-client";
import {
	AlertCircle,
	Eye,
	EyeOff,
	Lock,
	LogIn,
	Mail,
	ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import {
	DotGrid,
	DiamondGrid,
	DiagonalHatch,
} from "@/components/layout/portal-patterns";

export default function AdminLoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [showInactiveToast, setShowInactiveToast] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(true);

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
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const json = await res.json().catch(() => null);

			if (!res.ok || !json?.success) {
				setError(json?.error?.message || "Invalid email or password");
				setLoading(false);
				return;
			}

			window.sessionStorage.clear();
			router.replace("/admin");
			router.refresh();
		} catch {
			setError("Something went wrong. Please try again.");
			setLoading(false);
		}
	}

	return (
		<div className='relative flex min-h-screen flex-col items-center overflow-hidden bg-[#f7f7fa] px-4 py-12'>
			{/* decorative background */}
			<DotGrid />
			<DiagonalHatch className='left-0 top-0 h-[520px] w-[520px]' />
			<DiamondGrid
				maskFrom='right'
				className='right-0 top-1/3 h-[480px] w-[480px]'
			/>
			<ShieldCheck
				aria-hidden
				className='pointer-events-none absolute -right-16 bottom-0 -z-10 h-[460px] w-[460px] text-slate-400/40'
				strokeWidth={0.5}
			/>
			<Lock
				aria-hidden
				className='pointer-events-none absolute right-10 bottom-10 -z-10 h-24 w-24 text-slate-400/50'
				strokeWidth={0.6}
			/>

			<div className='relative z-10 mb-10'>
				<Logo />
			</div>

			<div className='relative z-10 w-full max-w-lg rounded-2xl border border-border bg-white p-10 shadow-2xl'>
				<div className='flex flex-col items-center text-center'>
					<div className='flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy/10'>
						<ShieldCheck className='h-7 w-7 text-brand-navy' strokeWidth={1.7} />
					</div>
					<p className='mt-4 text-sm font-bold tracking-wide text-brand-blue'>
						SCIPL ADMIN
					</p>
					<h1 className='mt-2 text-3xl font-bold text-brand-navy'>
						Sign in to interview operations
					</h1>
					<p className='mt-3 text-base text-muted-foreground'>
						HR, interviewers, and directors use their assigned account.
					</p>
				</div>

				<form onSubmit={submit} className='mt-9 space-y-6'>
					<div className='space-y-2'>
						<Label htmlFor='email' className='text-base'>
							Email Address
						</Label>
						<div className='relative'>
							<Mail className='pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground' />
							<Input
								id='email'
								type='email'
								required
								placeholder='you@sthapatya.co.in'
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className='h-13 pl-11 text-base'
							/>
						</div>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='password' className='text-base'>
							Password
						</Label>
						<div className='relative'>
							<Lock className='pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground' />
							<Input
								id='password'
								type={showPassword ? "text" : "password"}
								required
								placeholder='••••••••'
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className='h-13 pl-11 pr-11 text-base'
							/>
							<button
								type='button'
								onClick={() => setShowPassword((s) => !s)}
								className='absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? (
									<EyeOff className='h-4.5 w-4.5' />
								) : (
									<Eye className='h-4.5 w-4.5' />
								)}
							</button>
						</div>
					</div>

					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2.5'>
							<Checkbox
								id='remember'
								checked={rememberMe}
								onCheckedChange={(v) => setRememberMe(v === true)}
								className='h-5 w-5'
							/>
							<Label htmlFor='remember' className='font-normal text-foreground'>
								Remember me
							</Label>
						</div>
						<a
							href='#'
							className='text-sm font-medium text-brand-blue hover:underline'
						>
							Forgot password?
						</a>
					</div>

					{error && (
						<p className='text-sm font-medium text-red-600'>{error}</p>
					)}

					<Button
						type='submit'
						disabled={loading}
						size='lg'
						className='h-14 w-full text-base bg-brand-navy hover:bg-brand-navy/90'
					>
						<LogIn className='h-5 w-5' />
						{loading ? "Signing in…" : "Sign in"}
					</Button>
				</form>

				<div className='mt-8 flex items-center gap-3 text-sm text-muted-foreground'>
					<span className='h-px flex-1 bg-border' />
					<span className='flex items-center gap-1.5 whitespace-nowrap'>
						Secure Access <ShieldCheck className='h-4 w-4' />
					</span>
					<span className='h-px flex-1 bg-border' />
				</div>
				<p className='mt-2 text-center text-sm text-muted-foreground'>
					Authorized personnel only
				</p>
			</div>

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
		</div>
	);
}
