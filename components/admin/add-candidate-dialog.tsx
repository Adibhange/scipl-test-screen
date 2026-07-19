"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
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
import { UserPlus, Sparkles } from "lucide-react";
import { EXPERIENCE_LEVELS } from "@/data/experience";

export function AddCandidateDialog({
	rolesList,
	testLocationsList,
	experienceList = [...EXPERIENCE_LEVELS],
}: {
	rolesList: Array<{ value: string; label: string }>;
	testLocationsList: Array<{ value: string; label: string }>;
	experienceList?: Array<{ value: string; label: string }>;
}) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [mobile, setMobile] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("");
	const [experience, setExperience] = useState("");
	const [testLocation, setTestLocation] = useState("home");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);

		try {
			const response = await fetch("/api/admin/candidates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					mobile,
					email,
					role,
					experience,
					testLocation,
				}),
			});

			if (!response.ok) {
				const data = await response.json().catch(() => null);
				throw new Error(data?.error || "Failed to add candidate");
			}

			setOpen(false);
			window.location.reload();
		} catch (err: any) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button className='h-10 rounded-xl flex items-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white'>
					<UserPlus className='h-4 w-4' />
					Add Candidate
				</Button>
			</DialogTrigger>
			<DialogContent className='rounded-2xl border-slate-200 shadow-xl max-w-2xl bg-white p-8'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2 text-slate-900 font-extrabold text-lg'>
						<Sparkles className='h-5 w-5 text-indigo-605' />
						Add Candidate Details
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleAdd} className='space-y-4 pt-2'>
					{error && <p className='text-xs text-red-500 font-bold'>{error}</p>}
					<div className='space-y-1.5'>
						<Label className='text-xs font-bold text-slate-650'>Full Name</Label>
						<Input
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder='John Doe'
							className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold'
						/>
					</div>
					<div className='space-y-1.5'>
						<Label className='text-xs font-bold text-slate-650'>
							Mobile Number
						</Label>
						<Input
							required
							value={mobile}
							onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
							placeholder='9876543210'
							maxLength={10}
							className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold'
						/>
					</div>
					<div className='space-y-1.5'>
						<Label className='text-xs font-bold text-slate-650'>
							Email Address
						</Label>
						<Input
							required
							type='email'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder='john.doe@example.com'
							className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold'
						/>
					</div>
					<div className='grid grid-cols-2 gap-4'>
						<div className='space-y-1.5'>
							<Label className='text-xs font-bold text-slate-655'>Role</Label>
							<Select value={role} onValueChange={setRole}>
								<SelectTrigger className='h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700'>
									<SelectValue placeholder='Select role' />
								</SelectTrigger>
								<SelectContent className='rounded-2xl border-slate-200 bg-white shadow-xl p-1'>
									{rolesList.map((r) => (
										<SelectItem
											key={r.value}
											value={r.value}
											className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700'>
											{r.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-1.5'>
							<Label className='text-xs font-bold text-slate-655'>
								Experience
							</Label>
							<Select value={experience} onValueChange={setExperience}>
								<SelectTrigger className='h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700'>
									<SelectValue placeholder='Select experience' />
								</SelectTrigger>
								<SelectContent className='rounded-2xl border-slate-200 bg-white shadow-xl p-1'>
									{experienceList.map((el) => (
										<SelectItem
											key={el.value}
											value={el.value}
											className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700'>
											{el.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className='space-y-1.5'>
						<Label className='text-xs font-bold text-slate-655'>
							Test Location
						</Label>
						<Select value={testLocation} onValueChange={setTestLocation}>
							<SelectTrigger className='h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700'>
								<SelectValue placeholder='Select location' />
							</SelectTrigger>
							<SelectContent className='rounded-2xl border-slate-200 bg-white shadow-xl p-1'>
								{testLocationsList.map((l) => (
									<SelectItem
										key={l.value}
										value={l.value}
										className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700'>
										{l.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button
						type='submit'
						disabled={submitting}
						className='w-full h-10 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md'>
						{submitting ? "Adding..." : "Add Candidate"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
