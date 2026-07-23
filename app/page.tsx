import Link from "next/link";
import {
	ArrowRight,
	Lock,
	ShieldCheck,
	User,
	Users,
	BarChart3,
	Headset,
} from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { MasterLoginTrigger } from "@/components/master/master-login-trigger";
import {
	DotGrid,
	DiamondGrid,
	BuildingSilhouette,
} from "@/components/layout/portal-patterns";

export default function RootPage() {
	return (
		<div className="relative flex h-screen flex-col overflow-hidden bg-[#f7f7fa]">
			{/* decorative background */}
			<DotGrid />
			<DiamondGrid
				maskFrom="right"
				className="right-0 top-0 h-[520px] w-[520px]"
			/>
			<BuildingSilhouette className="pointer-events-none absolute -left-24 top-8 -z-10 h-[480px] w-[480px] text-slate-400/50" />

			{/* header */}
			<header className="relative z-10 flex shrink-0 items-center justify-between border-b border-border bg-white/80 px-8 py-4 sm:px-14">
				<Logo size="sm" />
				<MasterLoginTrigger />
			</header>

			{/* hero */}
			<main className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-4">
				<Users className="h-8 w-8 text-brand-gold" strokeWidth={1.5} />
				<h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
					Choose Your Portal
				</h1>
				<p className="mt-1.5 text-center text-base text-muted-foreground">
					Select the portal that best matches your role to continue.
				</p>

				<div className="mt-6 grid w-full max-w-4xl gap-6 sm:grid-cols-2">
					{/* Candidate portal card */}
					<div className="flex flex-col items-center rounded-2xl border border-border bg-white p-6 text-center shadow-lg">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold-light">
							<User className="h-6 w-6 text-brand-gold" strokeWidth={1.7} />
						</div>
						<h2 className="mt-3 text-xl font-bold text-brand-navy">
							Candidate Portal
						</h2>
						<p className="mt-1.5 text-sm text-muted-foreground">
							Take assessments, showcase your skills, and track your
							progress.
						</p>

						<svg
							aria-hidden
							viewBox="0 0 80 80"
							className="mt-4 h-12 w-12 text-brand-gold/70"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<rect x="16" y="8" width="40" height="56" rx="3" />
							<line x1="24" y1="22" x2="48" y2="22" />
							<line x1="24" y1="32" x2="48" y2="32" />
							<line x1="24" y1="42" x2="40" y2="42" />
							<circle cx="58" cy="52" r="14" fill="white" />
							<path d="M51 52.5 56 57.5 66 46.5" strokeWidth="2" />
						</svg>

						<Button
							asChild
							className="mt-5 h-11 w-full text-sm bg-brand-gold text-white hover:bg-brand-gold-dark"
						>
							<Link href="/candidate">
								Candidate Login
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>
						<p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
							<Lock className="h-3.5 w-3.5" />
							Secure access for candidates
						</p>
					</div>

					{/* Admin portal card */}
					<div className="flex flex-col items-center rounded-2xl border border-border bg-white p-6 text-center shadow-lg">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold">
							<ShieldCheck className="h-6 w-6 text-white" strokeWidth={1.7} />
						</div>
						<h2 className="mt-3 text-xl font-bold text-brand-navy">
							Admin Portal
						</h2>
						<p className="mt-1.5 text-sm text-muted-foreground">
							Manage tests, candidates, results, and system settings.
						</p>

						<svg
							aria-hidden
							viewBox="0 0 80 80"
							className="mt-4 h-12 w-12 text-brand-gold/70"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<rect x="8" y="14" width="40" height="30" rx="2" />
							<line x1="16" y1="38" x2="16" y2="24" />
							<line x1="24" y1="38" x2="24" y2="20" />
							<line x1="32" y1="38" x2="32" y2="28" />
							<line x1="8" y1="50" x2="48" y2="50" />
							<circle cx="60" cy="34" r="14" />
							<circle cx="60" cy="34" r="3" />
							<line x1="60" y1="20" x2="60" y2="23" />
							<line x1="60" y1="45" x2="60" y2="48" />
							<line x1="46" y1="34" x2="49" y2="34" />
							<line x1="71" y1="34" x2="74" y2="34" />
						</svg>

						<Button
							asChild
							className="mt-5 h-11 w-full text-sm bg-brand-gold text-white hover:bg-brand-gold-dark"
						>
							<Link href="/admin/login">
								Admin Login
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>
						<p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
							<Lock className="h-3.5 w-3.5" />
							Secure access for administrators
						</p>
					</div>
				</div>
			</main>

			{/* footer */}
			<footer className="relative z-10 shrink-0 bg-brand-navy-footer px-8 py-5 text-white sm:px-14">
				<div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 divide-y divide-white/10 sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
					<FooterItem
						icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.5} />}
						title="Secure & Reliable"
						desc="Your data is protected with industry-standard security."
					/>
					<FooterItem
						icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
						title="User Friendly"
						desc="Intuitive experience designed for all users."
					/>
					<FooterItem
						icon={<BarChart3 className="h-4 w-4" strokeWidth={1.5} />}
						title="Accurate & Efficient"
						desc="Streamlined evaluation and real-time insights."
					/>
					<FooterItem
						icon={<Headset className="h-4 w-4" strokeWidth={1.5} />}
						title="Always Support"
						desc="Our team is here to help whenever you need."
					/>
				</div>
				<p className="mt-3 text-center text-[11px] text-white/50">
					© 2025 Sthapatya Consultants India Pvt. Ltd. All rights reserved.
				</p>
			</footer>
		</div>
	);
}

function FooterItem({
	icon,
	title,
	desc,
}: {
	icon: React.ReactNode;
	title: string;
	desc: string;
}) {
	return (
		<div className="flex items-start gap-2.5 pt-3 first:pt-0 sm:pt-0 sm:pl-5 sm:first:pl-0">
			<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-gold/60 text-brand-gold">
				{icon}
			</span>
			<div>
				<p className="text-sm font-semibold">{title}</p>
				<p className="mt-0.5 text-xs leading-snug text-white/60">{desc}</p>
			</div>
		</div>
	);
}
