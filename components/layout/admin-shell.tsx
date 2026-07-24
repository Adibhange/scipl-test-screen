"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, UsersRound, Settings, Menu, Clock, Link2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/types";
import { createSupabaseBrowserClient } from "@/database/adapters/browser-client";
import { useIsMutating } from "@tanstack/react-query";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";

export function AdminShell({
	children,
	admin,
	isMaster = false,
}: {
	children: React.ReactNode;
	admin: { name: string; email: string; role: AdminRole };
	/** True when this session is a Master session rather than a real Supabase Admin session — changes how logout works. */
	isMaster?: boolean;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const isMutating = useIsMutating();
	const [showSessionModal, setShowSessionModal] = useState(false);
	const [sessionWarning, setSessionWarning] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const navItems = [
		{ href: "/admin", label: "Candidates Dashboard", icon: LayoutDashboard },
		{ href: "/admin/shared-candidates", label: "Shared Candidates", icon: Link2 },
		{ href: "/admin/team", label: "Admin Team", icon: UsersRound },
		...(admin.role !== "director" ? [{ href: "/admin/question-papers", label: "Question Papers", icon: FileText }] : []),
		...(admin.role === "hr" ? [{ href: "/admin/config", label: "Configurations", icon: Settings }] : []),
	];

	const initials =
		admin.name
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0])
			.join("")
			.toUpperCase() || "A";

	useEffect(() => {
		if (isMaster) return;
		const supabase = createSupabaseBrowserClient();
		let active = true;
		const checkSession = async () => {
			const { data } = await supabase.auth.getSession();
			if (!active) return;
			const expiresAt = data.session?.expires_at;
			if (!expiresAt) return;
			const remaining = expiresAt * 1000 - Date.now();
			setSessionWarning(remaining > 0 && remaining < 120_000);
		};
		void checkSession();
		const interval = window.setInterval(() => void checkSession(), 30_000);
		return () => {
			active = false;
			window.clearInterval(interval);
		};
	}, [isMaster]);

	async function handleLogout() {
		if (isMaster) {
			await fetch("/api/auth/master", { method: "DELETE" });
			router.replace("/");
			return;
		}
		const supabase = createSupabaseBrowserClient();
		await supabase.auth.signOut();
		window.localStorage.clear();
		window.sessionStorage.clear();
		router.replace("/admin/login");
	}

	async function handleLogoutWithRedirect() {
		if (isMaster) {
			await fetch("/api/auth/master", { method: "DELETE" });
			router.replace("/?inactive=true");
			return;
		}
		const supabase = createSupabaseBrowserClient();
		await supabase.auth.signOut();
		window.localStorage.clear();
		window.sessionStorage.clear();
		router.replace("/admin/login?inactive=true");
	}

	const { isIdle, remainingSeconds } = useIdleTimeout({
		onLogout: handleLogoutWithRedirect,
	});

	const formatTime = (totalSeconds: number) => {
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	};

	const showFeedback = isMutating > 0;

	return (
		<div className='min-h-screen bg-slate-50 text-slate-900 relative'>
			{/* Desktop Sidebar */}
			<aside className='fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex'>
				<div className='flex h-20 items-center gap-3 border-b border-slate-100 px-6'>
					<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 text-base font-bold text-white shadow-lg shadow-indigo-200'>
						S
					</div>
					<div>
						<p className='text-xl font-bold tracking-tight'>SCIPL</p>
						{/* <p className='text-[11px] text-slate-500'>Interview Portal</p> */}
					</div>
				</div>
				<nav className='flex-1 space-y-1 p-4'>
					{navItems.map((item) => {
						const active =
							item.href === "/admin" ?
								pathname === "/admin"
								: pathname.startsWith(item.href);
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
									active ?
										"bg-indigo-50 text-indigo-700"
										: "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
								)}>
								<Icon className='h-4 w-4' />
								{item.label}
							</Link>
						);
					})}
				</nav>
			</aside>

			{/* Mobile Drawer Navigation */}
			{isMobileMenuOpen && (
				<div className='fixed inset-0 z-40 lg:hidden'>
					<div
						className='fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity'
						onClick={() => setIsMobileMenuOpen(false)}
					/>
					<aside className='fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-slate-200 bg-white animate-in slide-in-from-left duration-200'>
						<div className='flex h-20 items-center gap-3 border-b border-slate-100 px-6'>
							<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 text-base font-bold text-white shadow-lg shadow-indigo-200'>
								S
							</div>
							<div>
								<p className='text-sm font-bold tracking-tight'>SCIPL</p>
								{/* <p className='text-[11px] text-slate-500'>Interview Portal</p> */}
							</div>
						</div>
						<nav className='flex-1 space-y-1 p-4'>
							{navItems.map((item) => {
								const active =
									item.href === "/admin" ?
										pathname === "/admin"
										: pathname.startsWith(item.href);
								const Icon = item.icon;
								return (
									<Link
										key={item.href}
										href={item.href}
										onClick={() => setIsMobileMenuOpen(false)}
										className={cn(
											"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
											active ?
												"bg-indigo-50 text-indigo-700"
												: "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
										)}>
										<Icon className='h-4 w-4' />
										{item.label}
									</Link>
								);
							})}
						</nav>
					</aside>
				</div>
			)}

			<div className='lg:pl-64'>
				<header className='sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur lg:px-8'>
					{/* Ambient Header Glow */}
					{showFeedback && (
						<div className="absolute bottom-0 left-0 right-0 h-0.75 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse z-30" />
					)}

					<div className='flex items-center gap-3'>
						<button
							type='button'
							onClick={() => setIsMobileMenuOpen(true)}
							className='flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors lg:hidden cursor-pointer'
						>
							<Menu className='h-5 w-5' />
						</button>
					</div>



					<div className='relative flex items-center gap-3'>
						{/* Session Inactivity Timer Chip */}
						<div
							title="Session expires due to inactivity"
							className={cn(
								"inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-2.5 py-1 backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-105 hover:bg-amber-100/80",
								isIdle ?
									"opacity-100 scale-100 pointer-events-auto"
									: "opacity-0 scale-90 pointer-events-none w-0 overflow-hidden border-0 px-0"
							)}
						>
							<span className="relative flex h-1.5 w-1.5 shrink-0">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
								<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
							</span>
							<Clock className="h-3 w-3 shrink-0 text-amber-600" aria-hidden="true" />
							<span className="font-mono text-lg font-bold tabular-nums leading-none text-amber-700">
								{formatTime(remainingSeconds)}
							</span>
						</div>

						<div className='hidden text-right sm:block'>
							<p className='text-xs font-semibold text-slate-800'>{admin.name}</p>
							<p className='text-[11px] capitalize text-slate-500'>
								{admin.role}
							</p>
						</div>



						<button
							type='button'
							onClick={() => setIsDropdownOpen((prev) => !prev)}
							className='flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 hover:bg-slate-800 transition-colors text-xs font-bold text-white cursor-pointer shadow-sm focus:outline-hidden'>
							{initials}
						</button>

						{isDropdownOpen && (
							<>
								<div
									className="fixed inset-0 z-40"
									onClick={() => setIsDropdownOpen(false)}
								/>
								<div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
									<div className="px-4 py-2 border-b border-slate-100 sm:hidden">
										<p className="text-xs font-bold text-slate-900">{admin.name}</p>
										<p className="text-[10px] capitalize text-slate-500 mt-0.5">{admin.role}</p>
									</div>
									<button
										type="button"
										onClick={() => {
											setIsDropdownOpen(false);
											void handleLogout();
										}}
										className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-750 transition-colors cursor-pointer">
										<LogOut className="h-3.5 w-3.5" />
										Log out
									</button>
								</div>
							</>
						)}
					</div>
				</header>
				<main className="w-full">
					{children}
				</main>
			</div>
		</div>
	);
}
