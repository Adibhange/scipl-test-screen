"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

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

const ROLE_COLORS: Record<string, string> = {
	hr: "bg-indigo-50 text-indigo-700 border border-indigo-200",
	interviewer: "bg-sky-50 text-sky-700 border border-sky-200",
	director: "bg-violet-50 text-violet-700 border border-violet-200",
};

export function AdminUserManagement({
	currentAdmin,
}: {
	currentAdmin: CurrentAdmin;
}) {
	const canManageUsers =
		currentAdmin.role === "hr" || currentAdmin.role === "director";

	const [users, setUsers] = useState<Staff[]>([]);
	const [loading, setLoading] = useState(true);
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

	async function load() {
		const response = await fetch("/api/admin/users");
		if (response.ok) setUsers(await response.json());
	}

	useEffect(() => {
		let active = true;
		setLoading(true);
		fetch("/api/admin/users")
			.then((r) => (r.ok ? r.json() : []))
			.then((data) => {
				if (active) {
					setUsers(data);
					setLoading(false);
				}
			})
			.catch(() => {
				if (active) {
					setLoading(false);
				}
			});
		return () => {
			active = false;
		};
	}, []);

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
		const response = await fetch("/api/admin/users", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(form),
		});
		const body = await response.json().catch(() => ({}));
		if (!response.ok) setMessage(body.error ?? "Could not create staff account");
		else {
			setForm({ name: "", email: "", password: "", role: "interviewer" });
			setMessage("User added");
			setOpen(false);
			await load();
		}
		setSaving(false);
	}

	async function saveProfile(event: React.FormEvent) {
		event.preventDefault();
		setProfileSaving(true);
		setProfileMessage("");
		const response = await fetch("/api/admin/users", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(profileForm),
		});
		const body = await response.json().catch(() => ({}));
		if (!response.ok) setProfileMessage(body.error ?? "Could not update profile");
		else {
			setProfileForm((existing) => ({ ...existing, password: "" }));
			setProfileMessage("Profile updated");
			setProfileOpen(false);
			await load();
		}
		setProfileSaving(false);
	}

	async function saveEdit(event: React.FormEvent) {
		event.preventDefault();
		if (!editTarget) return;
		setEditSaving(true);
		setEditMessage("");
		const response = await fetch("/api/admin/users", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userId: editTarget.user_id,
				name: editForm.name,
				email: editForm.email,
				password: editForm.password || undefined,
				role: editForm.role,
			}),
		});
		const body = await response.json().catch(() => ({}));
		if (!response.ok) setEditMessage(body.error ?? "Could not update user");
		else {
			setEditMessage("User updated");
			setEditOpen(false);
			setEditTarget(null);
			await load();
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
		<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
			{/* ── Main table (2-col span) ── */}
			<section className='lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden'>
				{/* Header */}
				<div className='flex flex-col justify-between gap-4 border-b border-border p-5 sm:flex-row sm:items-center'>
					<div>
						<p className='text-lg font-bold text-slate-900'>User management</p>
						<p className='mt-1 text-xs text-muted-foreground'>
							Manage interview access and staff accounts.
						</p>
					</div>
					<div className='flex gap-2'>
						<Button variant='outline' size='sm'>
							<ShieldCheck className='h-3.5 w-3.5' /> Access policy
						</Button>
						{currentAdmin.role === "hr" && (
							<Dialog open={open} onOpenChange={setOpen}>
								<DialogTrigger asChild>
									<Button size='sm'>
										<Plus className='h-3.5 w-3.5' /> Add user
									</Button>
								</DialogTrigger>
								<DialogContent className='sm:max-w-xl'>
									<DialogHeader>
										<DialogTitle>Add staff user</DialogTitle>
										<DialogDescription>
											Create a secure Supabase Auth login and assign an
											interview role.
										</DialogDescription>
									</DialogHeader>
									<form onSubmit={submit} className='space-y-3 pt-1'>
										<div className='grid sm:grid-cols-2 gap-3'>
											<Input
												required
												placeholder='Full name'
												value={form.name}
												onChange={(e) => setForm({ ...form, name: e.target.value })}
											/>
											<Input
												required
												type='email'
												placeholder='Email address'
												value={form.email}
												onChange={(e) =>
													setForm({ ...form, email: e.target.value })
												}
											/>
										</div>
										<Input
											required
											minLength={8}
											type='password'
											placeholder='Temporary password (min 8 chars)'
											value={form.password}
											onChange={(e) =>
												setForm({ ...form, password: e.target.value })
											}
										/>
										<div className='space-y-1.5'>
							<label className='text-xs font-bold text-slate-600'>System Role</label>
							<Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
								<SelectTrigger className='h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700'>
									<SelectValue placeholder='Select role' />
								</SelectTrigger>
								<SelectContent className='rounded-2xl border-slate-200 bg-white shadow-xl p-1'>
									<SelectItem value='interviewer' className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700'>Interviewer</SelectItem>
									<SelectItem value='director' className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700'>Director</SelectItem>
									<SelectItem value='hr' className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700'>HR</SelectItem>
								</SelectContent>
							</Select>
						</div>
										{message && (
											<p className='text-xs text-muted-foreground'>{message}</p>
										)}
										<DialogFooter>
											<Button
												type='submit'
												disabled={saving}
												className='w-full sm:w-auto rounded-xl'>
												{saving ? "Creating…" : "Create user"}
											</Button>
										</DialogFooter>
									</form>
								</DialogContent>
							</Dialog>
						)}
					</div>
				</div>

				{/* Search */}
				<div className='border-b border-border p-4'>
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder='Search by name, email or role'
							className='pl-9'
						/>
					</div>
				</div>

				{/* Table */}
				<div className='overflow-x-auto'>
					<div className='min-w-[520px]'>
						{/* Header row */}
						<div
							className={`grid border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${canManageUsers ? "grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr_40px]" : "grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr]"}`}>
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
									className={`grid items-center border-b border-border px-5 py-4 last:border-0 animate-pulse ${
										canManageUsers ?
											"grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr_40px]"
										:	"grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr]"
									}`}>
									<span className='flex items-center gap-2.5'>
										<span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100' />
										<span className='h-4 w-24 bg-slate-200 rounded' />
									</span>
									<span className='h-3.5 w-36 bg-slate-200 rounded' />
									<span>
										<span className='h-5 w-16 bg-slate-100 rounded-full inline-block' />
									</span>
									<span className='h-4 w-12 bg-slate-100 rounded' />
									{canManageUsers && <span />}
								</div>
							))
						) : (
							visible.map((user) => {
								const isCurrentAdmin = user.user_id === currentAdmin.userId;
								return (
									<div
										key={user.user_id}
										className={`grid items-center border-b border-border px-5 py-4 text-sm last:border-0 transition-colors hover:bg-slate-50/80 ${canManageUsers ? "grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr_40px]" : "grid-cols-[1.4fr_1.5fr_0.8fr_0.5fr]"}`}>
										<span className='flex items-center gap-2.5 font-semibold text-slate-800'>
											<span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
												<UserRound className='h-4 w-4' />
											</span>
											{isCurrentAdmin ? (
												<button
													type='button'
													onClick={() => {
														setProfileForm({
															name: user.name,
															email: user.email,
															password: "",
														});
														setProfileOpen(true);
													}}
													className='text-left font-semibold text-foreground hover:text-primary transition-colors'>
													{user.name}
													<span className='ml-1.5 text-[10px] font-bold text-indigo-500 uppercase'>
														(you)
													</span>
												</button>
											) : (
												<span>{user.name}</span>
											)}
										</span>

										<span className='truncate text-slate-500 text-xs'>
											{user.email}
										</span>

										<span>
											<span
												className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${ROLE_COLORS[user.role] ?? "bg-muted text-muted-foreground"}`}>
												{ROLE_LABELS[user.role] ?? user.role}
											</span>
										</span>

										<span className='text-xs font-semibold text-emerald-600'>
											Active
										</span>

										{canManageUsers && (
											<span className='flex justify-end'>
												<button
													type='button'
													title={`Edit ${user.name}`}
													onClick={() => openEditDialog(user)}
													className='flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 cursor-pointer'>
													<Pencil className='h-3.5 w-3.5' />
												</button>
											</span>
										)}
									</div>
								);
							})
						)}

						{!loading && visible.length === 0 && (
							<p className='p-8 text-center text-sm text-muted-foreground'>
								No staff accounts found.
							</p>
						)}
					</div>
				</div>
			</section>

			{/* ── Sidebar Stats Card ── */}
			<aside className='flex flex-col gap-5'>
				<div className='rounded-2xl border border-border bg-card shadow-sm p-6'>
					<div className='flex items-center gap-2 mb-5'>
						<div className='flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600'>
							<Users className='h-4.5 w-4.5' />
						</div>
						<div>
							<p className='text-sm font-bold text-slate-900'>Team Overview</p>
							<p className='text-[11px] text-muted-foreground'>Active members</p>
						</div>
					</div>

					<div className='space-y-3'>
						<div className='flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-100'>
							<span className='text-xs font-semibold text-slate-600'>
								Total Active Team
							</span>
							<span className='text-xl font-extrabold text-slate-900'>
								{totalActive}
							</span>
						</div>
						<div className='flex items-center justify-between rounded-xl bg-sky-50 px-4 py-3 border border-sky-100'>
							<span className='text-xs font-semibold text-sky-700'>
								Interviewers
							</span>
							<span className='text-xl font-extrabold text-sky-800'>
								{interviewerCount}
							</span>
						</div>
						<div className='flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3 border border-violet-100'>
							<span className='text-xs font-semibold text-violet-700'>
								Directors
							</span>
							<span className='text-xl font-extrabold text-violet-800'>
								{directorCount}
							</span>
						</div>
						<div className='flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3 border border-indigo-100'>
							<span className='text-xs font-semibold text-indigo-700'>
								HR Managers
							</span>
							<span className='text-xl font-extrabold text-indigo-800'>
								{hrCount}
							</span>
						</div>
					</div>
				</div>
			</aside>

			{/* Self-profile edit dialog */}
			<Dialog open={profileOpen} onOpenChange={setProfileOpen}>
				<DialogContent className='sm:max-w-xl'>
					<DialogHeader>
						<DialogTitle>Update your profile</DialogTitle>
						<DialogDescription>
							Adjust your display name, email, or password for the admin
							workspace.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={saveProfile} className='space-y-4 pt-1'>
						<div className='space-y-1.5'>
							<label className='text-xs font-bold text-slate-600'>Name</label>
							<Input
								value={profileForm.name}
								onChange={(e) =>
									setProfileForm({ ...profileForm, name: e.target.value })
								}
								placeholder='Name'
							/>
						</div>
						<div className='space-y-1.5'>
							<label className='text-xs font-bold text-slate-600'>Email</label>
							<Input
								type='email'
								value={profileForm.email}
								onChange={(e) =>
									setProfileForm({ ...profileForm, email: e.target.value })
								}
								placeholder='Email'
							/>
						</div>
						<div className='space-y-1.5'>
							<label className='text-xs font-bold text-slate-600'>
								Password
							</label>
							<Input
								type='password'
								value={profileForm.password}
								onChange={(e) =>
									setProfileForm({ ...profileForm, password: e.target.value })
								}
								placeholder='Leave blank to keep current password'
							/>
						</div>
						{profileMessage && (
							<p className='text-sm text-muted-foreground'>{profileMessage}</p>
						)}
						<DialogFooter className='gap-2'>
							<Button
								type='button'
								variant='outline'
								className='rounded-xl'
								onClick={() => setProfileOpen(false)}>
								Cancel
							</Button>
							<Button
								type='submit'
								disabled={profileSaving}
								className='rounded-xl'>
								{profileSaving ? "Saving…" : "Save Changes"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* HR/Director: Edit any team member dialog */}
			{canManageUsers && (
				<Dialog open={editOpen} onOpenChange={setEditOpen}>
					<DialogContent className='sm:max-w-xl'>
						<DialogHeader>
							<DialogTitle>Edit team member</DialogTitle>
							<DialogDescription>
								Update {editTarget?.name ?? "this user"}&apos;s name, email,
								password, or system role.
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={saveEdit} className='space-y-4 pt-1'>
							<div className='grid sm:grid-cols-2 gap-3'>
								<div className='space-y-1.5'>
									<label className='text-xs font-bold text-slate-600'>
										Full Name
									</label>
									<Input
										required
										value={editForm.name}
										onChange={(e) =>
											setEditForm({ ...editForm, name: e.target.value })
										}
										placeholder='Full name'
									/>
								</div>
								<div className='space-y-1.5'>
									<label className='text-xs font-bold text-slate-600'>
										Email Address
									</label>
									<Input
										required
										type='email'
										value={editForm.email}
										onChange={(e) =>
											setEditForm({ ...editForm, email: e.target.value })
										}
										placeholder='Email address'
									/>
								</div>
							</div>
							<div className='space-y-1.5'>
								<label className='text-xs font-bold text-slate-600'>
									New Password
								</label>
								<Input
									type='password'
									value={editForm.password}
									onChange={(e) =>
										setEditForm({ ...editForm, password: e.target.value })
									}
									placeholder='Leave blank to keep current password'
								/>
							</div>
							<div className='space-y-1.5'>
						<label className='text-xs font-bold text-slate-600'>
							System Role
						</label>
						<Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
							<SelectTrigger className='h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700'>
								<SelectValue placeholder='Select role' />
							</SelectTrigger>
							<SelectContent className='rounded-2xl border-slate-200 bg-white shadow-xl p-1'>
								<SelectItem value='interviewer' className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700'>Interviewer</SelectItem>
								<SelectItem value='director' className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700'>Director</SelectItem>
								<SelectItem value='hr' className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700'>HR</SelectItem>
							</SelectContent>
						</Select>
					</div>
							{editMessage && (
								<p className='text-xs text-muted-foreground'>{editMessage}</p>
							)}
							<DialogFooter className='gap-2'>
								<Button
									type='button'
									variant='outline'
									className='rounded-xl'
									onClick={() => setEditOpen(false)}>
									Cancel
								</Button>
								<Button
									type='submit'
									disabled={editSaving}
									className='rounded-xl'>
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
