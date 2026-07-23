"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { DotGrid, DiamondGrid } from "@/components/layout/portal-patterns";

function isSafeRedirect(path: string | null): path is string {
	return !!path && path.startsWith("/master") && !path.startsWith("//");
}

function MasterLoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirectTo = isSafeRedirect(searchParams.get("redirect")) ? searchParams.get("redirect")! : "/master";

	const [code, setCode] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function submit(event: FormEvent) {
		event.preventDefault();
		if (!/^\d{6}$/.test(code)) {
			setError("Enter the 6-digit master code");
			return;
		}
		setLoading(true);
		setError("");

		try {
			const res = await fetch("/api/auth/master", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code }),
			});
			const json = await res.json().catch(() => null);

			if (!res.ok || !json?.success) {
				setError(json?.error?.message || "Invalid master code");
				setLoading(false);
				return;
			}

			router.replace(redirectTo);
			router.refresh();
		} catch {
			setError("Something went wrong. Please try again.");
			setLoading(false);
		}
	}

	return (
		<div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-white p-10 shadow-2xl">
			<div className="flex flex-col items-center text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy/10">
					<ShieldCheck className="h-7 w-7 text-brand-navy" strokeWidth={1.7} />
				</div>
				<p className="mt-4 text-sm font-bold tracking-wide text-brand-blue">SCIPL MASTER</p>
				<h1 className="mt-2 text-2xl font-bold text-brand-navy">Master Login</h1>
				<p className="mt-3 text-sm text-muted-foreground">
					Restricted access for company directors and senior management.
				</p>
			</div>

			<form onSubmit={submit} className="mt-8 space-y-5">
				<div className="space-y-2">
					<Label htmlFor="master-code" className="text-base">
						Master Code
					</Label>
					<div className="relative">
						<KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							id="master-code"
							inputMode="numeric"
							autoComplete="off"
							maxLength={6}
							placeholder="••••••"
							value={code}
							onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
							className="h-13 pl-11 text-center text-lg tracking-[0.5em]"
							autoFocus
						/>
					</div>
				</div>

				{error && <p className="text-sm font-medium text-red-600">{error}</p>}

				<Button type="submit" disabled={loading} size="lg" className="h-14 w-full text-base bg-brand-navy hover:bg-brand-navy/90">
					{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
					{loading ? "Verifying…" : "Login"}
				</Button>
			</form>
		</div>
	);
}

export default function MasterLoginPage() {
	return (
		<div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#f7f7fa] px-4 py-12">
			<DotGrid />
			<DiamondGrid maskFrom="right" className="right-0 top-1/3 h-[480px] w-[480px]" />

			<div className="relative z-10 mb-10">
				<Logo />
			</div>

			<Suspense fallback={null}>
				<MasterLoginForm />
			</Suspense>
		</div>
	);
}
