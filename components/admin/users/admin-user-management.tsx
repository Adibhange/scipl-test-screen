"use client";

import { useMemo, useState } from "react";
import { updateAdminProfile } from "@/services/client/admin.service";
import { useAdminUsersQuery } from "@/hooks/queries/useAdminQueries";
import { useCreateAdminUserMutation, useUpdateAdminUserMutation } from "@/hooks/mutations/useAdminMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Pencil,
	Plus,
	Search,
	ShieldCheck,
	Users,
	UserRound,
	Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/layout-primitives";
import { SectionCard, MetricCard, StatusBadge } from "@/components/ui/enterprise-primitives";

type Staff = {
	user_id: string;
	email: string;
	name: string;
	role: "hr" | "interviewer" | "director";
	created_at?: string;
};

type CurrentAdmin = {
	userId: string;
	email: string;
	name: string;
	role: string;
};

const ROLE_LABELS: Record<string, string> = {
	hr: "HR",
	interviewer: "Interviewer",
	director: "Director",
};

export function AdminUserManagement({
	currentAdmin,
}: {
	currentAdmin: CurrentAdmin;
}) {
	const canManageUsers =
		currentAdmin.role === "hr" || currentAdmin.role === "director";

	const { data: users = [], isLoading: loading } = useAdminUsersQuery();
	const createUserMutation = useCreateAdminUserMutation();
	const updateUserMutation = useUpdateAdminUserMutation();

	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);

	// Add staff form
	const [form, setForm] = useState({
		name: "",
		email: "",
		password: "",
		role: "interviewer",
	});

	// Edit member form (HR/Director only)
	const [editTarget, setEditTarget] = useState<Staff | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [editForm, setEditForm] = useState({
		name: "",
		email: "",
		password: "",
		role: "interviewer",
	});
	const [editMessage, setEditMessage] = useState("");
	const [editSaving, setEditSaving] = useState(false);

	// Self-profile form
	const [profileForm, setProfileForm] = useState({
		name: currentAdmin.name,
		email: currentAdmin.email,
		password: "",
	});
	const [message, setMessage] = useState("");
	const [profileMessage, setProfileMessage] = useState("");
	const [saving, setSaving] = useState(false);
	const [profileSaving, setProfileSaving] = useState(false);

	const sortedUsers = useMemo(() => {
		return [...users].sort((a, b) => {
			const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
			const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
			return dateB - dateA;
		});
	}, [users]);

	const visible = useMemo(
		() =>
			sortedUsers.filter((user) =>
				`${user.name} ${user.email} ${user.role}`
					.toLowerCase()
					.includes(query.toLowerCase()),
			),
		[sortedUsers, query],
	);

	// Derived stats
	const totalActive = users.length;
	const interviewerCount = users.filter((u) => u.role === "interviewer").length;
	const directorCount = users.filter((u) => u.role === "director").length;
	const hrCount = users.filter((u) => u.role === "hr").length;

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setSaving(true);
		setMessage("");
		try {
			await createUserMutation.mutateAsync(form);
			setForm({ name: "", email: "", password: "", role: "interviewer" });
			setMessage("User added");
			setOpen(false);
		} catch (err: unknown) {
			setMessage(err instanceof Error ? err.message : "Could not create staff account");
		}
		setSaving(false);
	}

	async function saveProfile(event: React.FormEvent) {
		event.preventDefault();
		setProfileSaving(true);
		setProfileMessage("");
		try {
			await updateAdminProfile(profileForm);
			setProfileForm((existing) => ({ ...existing, password: "" }));
			setProfileMessage("Profile updated");
			setProfileOpen(false);
		} catch (err: unknown) {
			setProfileMessage(err instanceof Error ? err.message : "Could not update profile");
		}
		setProfileSaving(false);
	}

	async function saveEdit(event: React.FormEvent) {
		event.preventDefault();
		if (!editTarget) return;
		setEditSaving(true);
		setEditMessage("");
		try {
			await updateUserMutation.mutateAsync({
				userId: editTarget.user_id,
				name: editForm.name,
				email: editForm.email,
				password: editForm.password || undefined,
				role: editForm.role,
			});
			setEditMessage("User updated");
			setEditOpen(false);
			setEditTarget(null);
		} catch (err: unknown) {
			setEditMessage(err instanceof Error ? err.message : "Could not update user");
		}
		setEditSaving(false);
	}

	function openEditDialog(user: Staff) {
		setEditTarget(user);
		setEditForm({
			name: user.name,
			email: user.email,
			password: "",
			role: user.role,
		});
		setEditMessage("");
		setEditOpen(true);
	}

	return (
		<div className="space-y-6 animate-fade-in">
			<PageHeader
				title="User Management"
				description="Manage interviewer access, system permissions, and administrative staff accounts."
			/>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* ── Main table (2-col span) ── */}
				<div className="lg:col-span-2">
					<SectionCard
						title="Authorized Users"
						description="Current staff members with access to review, evaluate, or administer interviews."
						headerActions={
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-slate-205 text-slate-700 hover:bg-slate-50 cursor-pointer font-semibold gap-1.5 text-xs">
									<ShieldCheck className="h-3.5 w-3.5" /> Access policy
								</Button>
								{currentAdmin.role === "hr" && (
									<Dialog open={open} onOpenChange={setOpen}>
										<DialogTrigger asChild>
											<Button size="sm" className="h-8 px-3 bg-slate-900 text-white hover:bg-indigo-650 transition-colors rounded-lg cursor-pointer font-semibold gap-1.5 text-xs">
												<Plus className="h-3.5 w-3.5" /> Add user
											</Button>
										</DialogTrigger>
										<DialogContent className="sm:max-w-xl">
											<DialogHeader>
												<DialogTitle>Add staff user</DialogTitle>
												<DialogDescription>
													Create a secure Supabase Auth login and assign an
													interview role.
												</DialogDescription>
											</DialogHeader>
											<form onSubmit={submit} className="space-y-4 pt-1">
												<div className="grid sm:grid-cols-2 gap-3">
													<div className="space-y-1.5">
														<label className="text-xs font-bold text-slate-600">Full Name</label>
														<Input
															required
															placeholder="Full name"
															value={form.name}
															onChange={(e) => setForm({ ...form, name: e.target.value })}
														/>
													</div>
													<div className="space-y-1.5">
														<label className="text-xs font-bold text-slate-600">Email Address</label>
														<Input
															required
															type="email"
															placeholder="Email address"
															value={form.email}
															onChange={(e) =>
																setForm({ ...form, email: e.target.value })
															}
														/>
													</div>
												</div>
												<div className="space-y-1.5">
													<label className="text-xs font-bold text-slate-600">Password</label>
													<Input
														required
														minLength={8}
														type="password"
														placeholder="Temporary password (min 8 chars)"
														value={form.password}
														onChange={(e) =>
															setForm({ ...form, password: e.target.value })
														}
													/>
												</div>
												<div className="space-y-1.5">
													<label className="text-xs font-bold text-slate-600">System Role</label>
													<Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
														<SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700">
															<SelectValue placeholder="Select role" />
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1">
															<SelectItem value="interviewer" className="rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700">Interviewer</SelectItem>
															<SelectItem value="director" className="rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700">Director</SelectItem>
															<SelectItem value="hr" className="rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700">HR</SelectItem>
														</SelectContent>
													</Select>
												</div>
												{message && (
													<p className="text-xs text-muted-foreground">{message}</p>
												)}
												<DialogFooter>
													<Button
														type="submit"
														disabled={saving}
														className="w-full sm:w-auto rounded-xl">
														{saving ? "Creating…" : "Create user"}
													</Button>
												</DialogFooter>
											</form>
										</DialogContent>
									</Dialog>
								)}
							</div>
						}
					>
						{/* Search */}
						<div className="pb-4 border-b border-border/50">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Search by name, email or role"
									className="pl-9 h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500 bg-white dark:bg-slate-950"
								/>
							</div>
						</div>

						{/* Table */}
						<div className="overflow-x-auto w-full mt-2">
							<div className="min-w-[520px]">
								{/* Header row */}
								<div
									className={`grid border-b border-border/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-slate-50/20 dark:bg-slate-900/10 ${canManageUsers ? "grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr_40px]" : "grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr]"}`}>
									<span>Name</span>
									<span>Email</span>
									<span>Role</span>
									<span>Status</span>
									{canManageUsers && <span />}
								</div>

								{loading ? (
									Array.from({ length: 5 }).map((_, idx) => (
										<div
											key={idx}
											className={`grid items-center border-b border-border/40 px-4 py-3.5 last:border-0 animate-pulse ${
												canManageUsers ?
													"grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr_40px]"
												:	"grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr]"
											}`}>
											<span className="flex items-center gap-2.5">
												<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900" />
												<span className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
											</span>
											<span className="h-3.5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
											<span>
												<span className="h-5 w-16 bg-slate-100 dark:bg-slate-900 rounded-full inline-block" />
											</span>
											<span className="h-4 w-12 bg-slate-100 dark:bg-slate-900 rounded" />
											{canManageUsers && <span />}
										</div>
									))
								) : (
									visible.map((user) => {
										const isCurrentAdmin = user.user_id === currentAdmin.userId;
										return (
											<div
												key={user.user_id}
												className={`grid items-center border-b border-border/40 px-4 py-3.5 text-sm last:border-0 transition-colors hover:bg-slate-50/40 dark:hover:bg-slate-900/30 ${canManageUsers ? "grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr_40px]" : "grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr]"}`}>
												<span className="flex items-center gap-2.5 font-semibold text-slate-800 dark:text-slate-200">
													<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary">
														<UserRound className="h-4 w-4" />
													</span>
													{isCurrentAdmin ? (
														<button
															type="button"
															onClick={() => {
																setProfileForm({
																	name: user.name,
																	email: user.email,
																	password: "",
																});
																setProfileOpen(true);
															}}
															className="text-left font-bold text-slate-850 dark:text-slate-100 hover:text-indigo-655 transition-colors cursor-pointer">
															{user.name}
															<span className="ml-1.5 text-[9px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase">
																(you)
															</span>
														</button>
													) : (
														<span>{user.name}</span>
													)}
												</span>

												<span className="truncate text-slate-500 dark:text-slate-400 text-xs">
													{user.email}
												</span>

												<span>
													<span
														className={cn(
															"rounded-full px-2.5 py-0.5 text-[10px] font-bold border capitalize",
															user.role === "hr" ? "bg-indigo-50 border-indigo-200 text-indigo-755 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-300"
															: user.role === "director" ? "bg-violet-55 border-violet-200 text-violet-755 dark:bg-violet-950/20 dark:border-violet-900/40 dark:text-violet-300"
															: "bg-sky-50 border-sky-200 text-sky-755 dark:bg-sky-950/20 dark:border-sky-900/40 dark:text-sky-300"
														)}
													>
														{ROLE_LABELS[user.role] ?? user.role}
													</span>
												</span>

												<span>
													<StatusBadge variant="active" label="Active" />
												</span>

												{canManageUsers && (
													<span className="flex justify-end">
														<button
															type="button"
															title={`Edit ${user.name}`}
															onClick={() => openEditDialog(user)}
															className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-indigo-600 cursor-pointer">
															<Pencil className="h-3.5 w-3.5" />
														</button>
													</span>
												)}
											</div>
										);
									})
								)}

								{!loading && visible.length === 0 && (
									<div className="py-8">
										<EmptyState
											title="No staff accounts found"
											description="Try adjusting your filter search term to discover existing staff accounts."
											icon={Users}
										/>
									</div>
								)}
							</div>
						</div>
					</SectionCard>
				</div>

				{/* ── Sidebar Stats Cards ── */}
				<div className="flex flex-col gap-4">
					<div className="border-b border-border/60 pb-2">
						<h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Team Overview</h3>
					</div>

					<MetricCard
						title="Total Active Team"
						value={totalActive}
						icon={Users}
						description="Total staff accounts authorized to log in to the ATS admin panel."
					/>

					<MetricCard
						title="HR Managers"
						value={hrCount}
						icon={Shield}
						description="Users permitted to configure vacancies, adjust master settings, and manage authorization keys."
					/>

					<MetricCard
						title="Directors"
						value={directorCount}
						icon={ShieldCheck}
						description="High-level stakeholders with cross-team view access and permissions to manage members."
					/>

					<MetricCard
						title="Interviewers"
						value={interviewerCount}
						icon={UserRound}
						description="Team members responsible for screening submissions, writing evaluations, and grading questions."
					/>
				</div>
			</div>

			{/* Self-profile edit dialog */}
			<Dialog open={profileOpen} onOpenChange={setProfileOpen}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Update your profile</DialogTitle>
						<DialogDescription>
							Adjust your display name, email, or password for the admin
							workspace.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={saveProfile} className="space-y-4 pt-1">
						<div className="space-y-1.5">
							<label className="text-xs font-bold text-slate-600">Name</label>
							<Input
								value={profileForm.name}
								onChange={(e) =>
									setProfileForm({ ...profileForm, name: e.target.value })
								}
								placeholder="Name"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-xs font-bold text-slate-600">Email</label>
							<Input
								type="email"
								value={profileForm.email}
								onChange={(e) =>
									setProfileForm({ ...profileForm, email: e.target.value })
								}
								placeholder="Email"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-xs font-bold text-slate-600">
								Password
							</label>
							<Input
								type="password"
								value={profileForm.password}
								onChange={(e) =>
									setProfileForm({ ...profileForm, password: e.target.value })
								}
								placeholder="Leave blank to keep current password"
							/>
						</div>
						{profileMessage && (
							<p className="text-sm text-muted-foreground">{profileMessage}</p>
						)}
						<DialogFooter className="gap-2">
							<Button
								type="button"
								variant="outline"
								className="rounded-xl"
								onClick={() => setProfileOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={profileSaving}
								className="rounded-xl">
								{profileSaving ? "Saving…" : "Save Changes"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* HR/Director: Edit any team member dialog */}
			{canManageUsers && (
				<Dialog open={editOpen} onOpenChange={setEditOpen}>
					<DialogContent className="sm:max-w-xl">
						<DialogHeader>
							<DialogTitle>Edit team member</DialogTitle>
							<DialogDescription>
								Update {editTarget?.name ?? "this user"}&apos;s name, email,
								password, or system role.
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={saveEdit} className="space-y-4 pt-1">
							<div className="grid sm:grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<label className="text-xs font-bold text-slate-600">
										Full Name
									</label>
									<Input
										required
										value={editForm.name}
										onChange={(e) =>
											setEditForm({ ...editForm, name: e.target.value })
										}
										placeholder="Full name"
									/>
								</div>
								<div className="space-y-1.5">
									<label className="text-xs font-bold text-slate-600">
										Email Address
									</label>
									<Input
										required
										type="email"
										value={editForm.email}
										onChange={(e) =>
											setEditForm({ ...editForm, email: e.target.value })
										}
										placeholder="Email address"
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-slate-600">
									New Password
								</label>
								<Input
									type="password"
									value={editForm.password}
									onChange={(e) =>
										setEditForm({ ...editForm, password: e.target.value })
									}
									placeholder="Leave blank to keep current password"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-slate-600">
									System Role
								</label>
								<Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
									<SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700">
										<SelectValue placeholder="Select role" />
									</SelectTrigger>
									<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1">
										<SelectItem value="interviewer" className="rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700">Interviewer</SelectItem>
										<SelectItem value="director" className="rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700">Director</SelectItem>
										<SelectItem value="hr" className="rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700">HR</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{editMessage && (
								<p className="text-xs text-muted-foreground">{editMessage}</p>
							)}
							<DialogFooter className="gap-2">
								<Button
									type="button"
									variant="outline"
									className="rounded-xl"
									onClick={() => setEditOpen(false)}>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={editSaving}
									className="rounded-xl">
									{editSaving ? "Saving…" : "Save Changes"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
