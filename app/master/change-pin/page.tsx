"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { DotGrid, DiamondGrid } from "@/components/layout/portal-patterns";
import { toast } from "sonner";

export default function MasterChangePinPage() {
	const router = useRouter();
	const [currentPin, setCurrentPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function submit(event: FormEvent) {
		event.preventDefault();
		if (!/^\d{6}$/.test(currentPin)) {
			setError("Enter the 6-digit current PIN");
			return;
		}
		if (!/^\d{6}$/.test(newPin)) {
			setError("Enter a new 6-digit PIN");
			return;
		}
		if (newPin !== confirmPin) {
			setError("New PIN and confirmation PIN do not match");
			return;
		}
		if (currentPin === newPin) {
			setError("New PIN must be different from current PIN");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const res = await fetch("/api/auth/change-pin", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ currentPin, newPin }),
			});
			const json = await res.json().catch(() => null);

			if (!res.ok || !json?.success) {
				setError(json?.error?.message || "Failed to update PIN");
				setLoading(false);
				return;
			}

			toast.success("PIN changed successfully");
			router.replace("/admin");
			router.refresh();
		} catch {
			setError("Something went wrong. Please try again.");
			setLoading(false);
		}
	}

	return (
		<div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#f7f7fa] px-4 py-12">
			<DotGrid />
			<DiamondGrid maskFrom="right" className="right-0 top-1/3 h-[480px] w-[480px]" />

			<div className="relative z-10 mb-10">
				<Logo />
			</div>

			<div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-white p-10 shadow-2xl animate-fade-in">
				<div className="flex flex-col items-center text-center">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy/10">
						<ShieldCheck className="h-7 w-7 text-brand-navy" strokeWidth={1.7} />
					</div>
					<p className="mt-4 text-sm font-bold tracking-wide text-brand-blue">SCIPL MASTER</p>
					<h1 className="mt-2 text-2xl font-bold text-brand-navy">Change Master PIN</h1>
					<p className="mt-3 text-sm text-muted-foreground">
						To secure your account, you must configure a new 6-digit PIN.
					</p>
				</div>

				<form onSubmit={submit} className="mt-8 space-y-5">
					<div className="space-y-2">
						<Label htmlFor="current-pin" className="text-sm">
							Current PIN
						</Label>
						<div className="relative">
							<KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="current-pin"
								type="password"
								inputMode="numeric"
								autoComplete="off"
								maxLength={6}
								placeholder="••••••"
								value={currentPin}
								onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
								className="h-12 pl-11 text-center text-lg tracking-[0.5em]"
								autoFocus
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="new-pin" className="text-sm">
							New 6-Digit PIN
						</Label>
						<div className="relative">
							<KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="new-pin"
								type="password"
								inputMode="numeric"
								autoComplete="off"
								maxLength={6}
								placeholder="••••••"
								value={newPin}
								onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
								className="h-12 pl-11 text-center text-lg tracking-[0.5em]"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="confirm-pin" className="text-sm">
							Confirm New PIN
						</Label>
						<div className="relative">
							<KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="confirm-pin"
								type="password"
								inputMode="numeric"
								autoComplete="off"
								maxLength={6}
								placeholder="••••••"
								value={confirmPin}
								onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
								className="h-12 pl-11 text-center text-lg tracking-[0.5em]"
							/>
						</div>
					</div>

					{error && <p className="text-sm font-medium text-red-600">{error}</p>}

					<Button type="submit" disabled={loading} size="lg" className="h-14 w-full text-base bg-brand-navy hover:bg-brand-navy/90 mt-2">
						{loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
						{loading ? "Updating PIN…" : "Change PIN"}
					</Button>
				</form>
			</div>
		</div>
	);
}
