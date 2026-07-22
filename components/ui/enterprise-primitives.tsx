import React from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 1. StatusBadge
export type StatusVariant = 
	| "pending" 
	| "interviewing" 
	| "screening" 
	| "completed" 
	| "hired" 
	| "rejected" 
	| "draft" 
	| "active" 
	| "inactive"
	| "on_hold";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant: StatusVariant;
	label?: string;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
	({ className, variant, label, ...props }, ref) => {
		const labelText = label || variant.replace("_", " ");
		
		const colorClass = 
			variant === "hired" || variant === "active" || variant === "completed"
				? "bg-emerald-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow-sm"
				: variant === "rejected" || variant === "inactive"
				? "bg-rose-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow-sm"
				: variant === "on_hold"
				? "bg-amber-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow-sm"
				: "bg-indigo-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow-sm";

		return (
			<span
				ref={ref}
				className={cn("inline-flex items-center shrink-0 tracking-wider", colorClass, className)}
				{...props}
			>
				{labelText}
			</span>
		);
	}
);
StatusBadge.displayName = "StatusBadge";


// 2. MetricCard
export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	value: string | number;
	description?: string;
	icon?: LucideIcon;
	trend?: {
		value: string | number;
		isPositive?: boolean;
	};
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
	({ className, title, value, description, icon: Icon, trend, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"rounded-xl border border-border bg-card p-5 shadow-xs text-card-foreground flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors duration-200",
					className
				)}
				{...props}
			>
				<div>
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
						{Icon && (
							<div className="h-8 w-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0">
								<Icon className="h-4.5 w-4.5" />
							</div>
						)}
					</div>
					<div className="mt-2 flex items-baseline gap-2">
						<span className="text-3xl font-extrabold tracking-tight text-foreground">{value}</span>
						{trend && (
							<span className={cn(
								"text-xs font-bold px-1.5 py-0.5 rounded-md border",
								trend.isPositive 
									? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40" 
									: "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/40"
							)}>
								{trend.isPositive ? "+" : ""}{trend.value}
							</span>
						)}
					</div>
				</div>
				{description && (
					<p className="mt-3 text-xs text-muted-foreground leading-relaxed">{description}</p>
				)}
			</div>
		);
	}
);
MetricCard.displayName = "MetricCard";


// 3. PageActions
export interface PageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
	primaryAction?: {
		label: string;
		onClick: () => void;
		icon?: LucideIcon;
		disabled?: boolean;
	};
	secondaryActions?: Array<{
		label: string;
		onClick: () => void;
		icon?: LucideIcon;
		disabled?: boolean;
	}>;
	children?: React.ReactNode;
}

export const PageActions = React.forwardRef<HTMLDivElement, PageActionsProps>(
	({ className, primaryAction, secondaryActions, children, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn("flex flex-wrap items-center gap-2", className)}
				{...props}
			>
				{secondaryActions?.map((act, idx) => {
					const IconComp = act.icon;
					return (
						<Button
							key={idx}
							onClick={act.onClick}
							disabled={act.disabled}
							variant="outline"
							size="sm"
							className="h-9 px-3 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer font-semibold gap-1.5"
						>
							{IconComp && <IconComp className="h-4 w-4 shrink-0" />}
							{act.label}
						</Button>
					);
				})}
				{primaryAction && (
					<Button
						onClick={primaryAction.onClick}
						disabled={primaryAction.disabled}
						size="sm"
						className="h-9 px-4 rounded-lg bg-slate-900 text-white hover:bg-indigo-600 shadow-sm transition-colors cursor-pointer font-semibold gap-1.5"
					>
						{primaryAction.icon && <primaryAction.icon className="h-4 w-4 shrink-0" />}
						{primaryAction.label}
					</Button>
				)}
				{children}
			</div>
		);
	}
);
PageActions.displayName = "PageActions";


// 4. ActionToolbar
export interface ActionToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
	searchPlaceholder?: string;
	searchValue?: string;
	onSearchChange?: (val: string) => void;
	tabs?: Array<{
		value: string;
		label: string;
		count?: number;
	}>;
	activeTab?: string;
	onTabChange?: (val: string) => void;
	actions?: React.ReactNode;
}

export const ActionToolbar = React.forwardRef<HTMLDivElement, ActionToolbarProps>(
	({ className, searchPlaceholder = "Search...", searchValue, onSearchChange, tabs, activeTab, onTabChange, actions, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn("flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between", className)}
				{...props}
			>
				{/* Left Tabs / States */}
				{tabs && tabs.length > 0 && (
					<div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
						{tabs.map((tab) => {
							const isActive = activeTab === tab.value;
							return (
								<button
									key={tab.value}
									type="button"
									onClick={() => onTabChange?.(tab.value)}
									className={cn(
										"h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5",
										isActive
											? "bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
											: "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-foreground"
									)}
								>
									{tab.label}
									{tab.count !== undefined && (
										<span className={cn(
											"text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
											isActive 
												? "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
												: "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800/60 text-muted-foreground"
										)}>
											{tab.count}
										</span>
									)}
								</button>
							);
						})}
					</div>
				)}

				{/* Right Search & Controls */}
				<div className="flex flex-wrap items-center gap-3 md:ml-auto">
					{onSearchChange && (
						<div className="relative w-full max-w-[240px] sm:w-[240px]">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<Input
								type="text"
								placeholder={searchPlaceholder}
								value={searchValue}
								onChange={(e) => onSearchChange(e.target.value)}
								className="h-8 pl-9 pr-4 text-xs rounded-lg border-slate-200 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950"
							/>
						</div>
					)}
					{actions}
				</div>
			</div>
		);
	}
);
ActionToolbar.displayName = "ActionToolbar";


// 5. FormSection
export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	description?: string;
	actions?: React.ReactNode;
}

export const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
	({ className, title, description, actions, children, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn("grid grid-cols-1 gap-6 py-6 md:grid-cols-3 border-b border-border/60 last:border-b-0", className)}
				{...props}
			>
				<div className="space-y-1 md:col-span-1">
					<h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
					{description && (
						<p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
					)}
					{actions && <div className="pt-2">{actions}</div>}
				</div>
				<div className="space-y-4 md:col-span-2">
					{children}
				</div>
			</div>
		);
	}
);
FormSection.displayName = "FormSection";


// 6. DetailRow
export interface DetailRowProps extends React.HTMLAttributes<HTMLDivElement> {
	label: string;
	value: React.ReactNode;
	icon?: LucideIcon;
}

export const DetailRow = React.forwardRef<HTMLDivElement, DetailRowProps>(
	({ className, label, value, icon: Icon, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn("flex items-center justify-between gap-4 py-2 text-sm border-b border-border/40 last:border-b-0", className)}
				{...props}
			>
				<span className="flex items-center gap-2 text-muted-foreground font-semibold">
					{Icon && <Icon className="h-4 w-4 text-slate-400 shrink-0" />}
					{label}
				</span>
				<div className="text-foreground font-medium text-right truncate">
					{value}
				</div>
			</div>
		);
	}
);
DetailRow.displayName = "DetailRow";


// 7. InfoGrid
export interface InfoGridProps extends React.HTMLAttributes<HTMLDivElement> {
	cols?: 1 | 2 | 3 | 4;
}

export const InfoGrid = React.forwardRef<HTMLDivElement, InfoGridProps>(
	({ className, cols = 2, children, ...props }, ref) => {
		const gridColsClass = 
			cols === 1 ? "grid-cols-1"
			: cols === 2 ? "grid-cols-1 sm:grid-cols-2"
			: cols === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
			: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

		return (
			<div
				ref={ref}
				className={cn("grid gap-4 w-full", gridColsClass, className)}
				{...props}
			>
				{children}
			</div>
		);
	}
);
InfoGrid.displayName = "InfoGrid";


// 8. SectionCard
export interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
	title?: string;
	description?: string;
	headerActions?: React.ReactNode;
	footerActions?: React.ReactNode;
}

export const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
	({ className, title, description, headerActions, footerActions, children, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn("rounded-xl border border-border bg-card shadow-xs text-card-foreground overflow-hidden flex flex-col", className)}
				{...props}
			>
				{/* Header */}
				{(title || headerActions) && (
					<div className="flex items-center justify-between border-b border-border/60 p-4 shrink-0 bg-slate-50/30 dark:bg-slate-900/10">
						<div className="min-w-0 space-y-0.5">
							{title && <h3 className="text-sm font-bold text-foreground tracking-tight truncate">{title}</h3>}
							{description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
						</div>
						{headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
					</div>
				)}

				{/* Body */}
				<div className="flex-1 p-4">
					{children}
				</div>

				{/* Footer */}
				{footerActions && (
					<div className="border-t border-border/60 p-3 shrink-0 bg-slate-50/40 dark:bg-slate-900/10 flex items-center justify-end gap-2">
						{footerActions}
					</div>
				)}
			</div>
		);
	}
);
SectionCard.displayName = "SectionCard";


// 9. FilterChip
export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	selected?: boolean;
	label: string;
	count?: number;
}

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
	({ className, selected, label, count, ...props }, ref) => {
		return (
			<button
				ref={ref}
				type="button"
				className={cn(
					"inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-bold border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
					selected
						? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50"
						: "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50",
					className
				)}
				{...props}
			>
				{label}
				{count !== undefined && (
					<span className={cn(
						"text-[9px] font-extrabold px-1 py-0.5 rounded-full shrink-0 border",
						selected
							? "bg-indigo-100 dark:bg-indigo-950 border-indigo-200/50 text-indigo-700 dark:text-indigo-300"
							: "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-muted-foreground"
					)}>
						{count}
					</span>
				)}
			</button>
		);
	}
);
FilterChip.displayName = "FilterChip";
