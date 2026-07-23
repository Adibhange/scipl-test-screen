"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Small, subtle "Master Login" trigger for the landing page header.
 * Intentionally understated — this is not meant to be a primary CTA.
 */
export function MasterLoginTrigger() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [code, setCode] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) {
			setCode("");
			setError("");
			setLoading(false);
		}
	}

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

			setOpen(false);
			router.replace("/master");
			router.refresh();
		} catch {
			setError("Something went wrong. Please try again.");
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setOpen(true)}
				className="h-7 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground"
			>
				<KeyRound className="h-3 w-3" strokeWidth={1.75} />
				Master Login
			</Button>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Master Login</DialogTitle>
					<DialogDescription>
						Enter the 6-digit master code to continue.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="master-code">Master Code</Label>
						<Input
							id="master-code"
							inputMode="numeric"
							autoComplete="off"
							maxLength={6}
							placeholder="••••••"
							value={code}
							onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
							className="h-12 text-center text-lg tracking-[0.5em]"
							autoFocus
						/>
					</div>
					{error && <p className="text-sm font-medium text-red-600">{error}</p>}
					<Button type="submit" disabled={loading} className="w-full">
						{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
						{loading ? "Verifying…" : "Login"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
