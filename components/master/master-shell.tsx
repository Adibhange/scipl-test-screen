"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function MasterShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const [loggingOut, setLoggingOut] = useState(false);

	const navItems = [{ href: "/master", label: "Dashboard", icon: LayoutDashboard }];

	async function handleLogout() {
		setLoggingOut(true);
		try {
			await fetch("/api/auth/master", { method: "DELETE" });
		} finally {
			router.replace("/");
			router.refresh();
		}
	}

	return (
		<div className="flex min-h-screen bg-[#f7f7fa]">
			<aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white sm:flex">
				<div className="flex items-center gap-2 border-b border-border px-6 py-5">
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy/10">
						<ShieldCheck className="h-4.5 w-4.5 text-brand-navy" strokeWidth={1.8} />
					</div>
					<div>
						<p className="text-sm font-bold text-brand-navy">Master Console</p>
						<p className="text-xs text-muted-foreground">Director access</p>
					</div>
				</div>
				<nav className="flex-1 space-y-1 px-3 py-4">
					{navItems.map((item) => {
						const active = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
									active
										? "bg-brand-navy/10 text-brand-navy"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
							>
								<item.icon className="h-4 w-4" strokeWidth={1.8} />
								{item.label}
							</Link>
						);
					})}
				</nav>
				<div className="border-t border-border p-3">
					<button
						type="button"
						onClick={handleLogout}
						disabled={loggingOut}
						className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
					>
						<LogOut className="h-4 w-4" strokeWidth={1.8} />
						{loggingOut ? "Logging out…" : "Logout"}
					</button>
				</div>
			</aside>

			<div className="flex flex-1 flex-col">
				<header className="flex items-center justify-between border-b border-border bg-white px-6 py-4 sm:hidden">
					<p className="text-sm font-bold text-brand-navy">Master Console</p>
					<button
						type="button"
						onClick={handleLogout}
						disabled={loggingOut}
						className="flex items-center gap-1.5 text-sm font-medium text-red-600"
					>
						<LogOut className="h-4 w-4" />
						Logout
					</button>
				</header>
				<main className="flex-1 p-6 sm:p-8">{children}</main>
			</div>
		</div>
	);
}
