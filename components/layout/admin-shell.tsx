"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, UsersRound, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AdminShell({
	children,
	admin,
}: {
	children: React.ReactNode;
	admin: { name: string; email: string; role: AdminRole };
}) {
	const pathname = usePathname();
	const router = useRouter();
	const [showSessionModal, setShowSessionModal] = useState(false);
	const [sessionWarning, setSessionWarning] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const navItems = [
		{ href: "/admin", label: "Candidate Pipeline", icon: LayoutDashboard },
		{ href: "/admin/team", label: "Admin Team", icon: UsersRound },
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
	}, []);

	async function handleLogout() {
		const supabase = createSupabaseBrowserClient();
		await supabase.auth.signOut();
		window.localStorage.clear();
		window.sessionStorage.clear();
		router.replace("/admin/login");
	}

	return (
		<div className='min-h-screen bg-slate-50 text-slate-900'>
			{/* Desktop Sidebar */}
			<aside className='fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex'>
				<div className='flex h-20 items-center gap-3 border-b border-slate-100 px-6'>
					<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 text-base font-bold text-white shadow-lg shadow-indigo-200'>
						S
					</div>
					<div>
						<p className='text-sm font-bold tracking-tight'>SCIPL</p>
						<p className='text-[11px] text-slate-500'>Interview Portal</p>
					</div>
				</div>
				<nav className='flex-1 space-y-1 p-4'>
					{navItems.map((item) => {
						const active =
							item.href === "/admin" ?
								pathname === "/admin"
							:	pathname.startsWith(item.href);
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
									active ?
										"bg-indigo-50 text-indigo-700"
									:	"text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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
								<p className='text-[11px] text-slate-500'>Interview Portal</p>
							</div>
						</div>
						<nav className='flex-1 space-y-1 p-4'>
							{navItems.map((item) => {
								const active =
									item.href === "/admin" ?
										pathname === "/admin"
									:	pathname.startsWith(item.href);
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
											:	"text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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
					<div className='flex items-center gap-3'>
						<button
							type='button'
							onClick={() => setIsMobileMenuOpen(true)}
							className='flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors lg:hidden cursor-pointer'
						>
							<Menu className='h-5 w-5' />
						</button>
						<div>
							<h1 className='text-sm font-bold tracking-tight text-slate-900'>
								SCIPL Interview Question Portal
							</h1>
							<div className='mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700'>
								<span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
								Assessment System Online
							</div>
						</div>
					</div>
					<div className='relative flex items-center gap-3'>
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
				<main className='mx-auto w-full max-w-[1600px] p-5 lg:p-8'>
					{children}
				</main>
			</div>
			<Dialog
				open={showSessionModal || sessionWarning}
				onOpenChange={(open) => {
					if (!open) setShowSessionModal(false);
					setSessionWarning(false);
				}}>
				<DialogContent className='sm:max-w-xl'>
					<DialogHeader>
						<DialogTitle>Session expiring soon</DialogTitle>
						<DialogDescription>
							Your admin session is about to expire. Choose to stay signed in or
							log out now.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={handleLogout}>
							Logout
						</Button>
						<Button
							onClick={async () => {
								const supabase = createSupabaseBrowserClient();
								await supabase.auth.refreshSession();
								setShowSessionModal(false);
								setSessionWarning(false);
							}}>
							Stay logged in
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
