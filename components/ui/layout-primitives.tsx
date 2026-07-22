import React from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon, Loader2 } from "lucide-react";

export type PageContainerProps = React.HTMLAttributes<HTMLDivElement>;

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
	({ className, children, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in",
					className
				)}
				{...props}
			>
				{children}
			</div>
		);
	}
);
PageContainer.displayName = "PageContainer";

// PageHeader
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	description?: string;
	actions?: React.ReactNode;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
	({ className, title, description, actions, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5",
					className
				)}
				{...props}
			>
				<div className="space-y-1">
					<h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
					{description && (
						<p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
					)}
				</div>
				{actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
			</div>
		);
	}
);
PageHeader.displayName = "PageHeader";

// SectionHeader
export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	description?: string;
	actions?: React.ReactNode;
}

export const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
	({ className, title, description, actions, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60",
					className
				)}
				{...props}
			>
				<div className="space-y-0.5">
					<h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
					{description && (
						<p className="text-xs text-muted-foreground">{description}</p>
					)}
				</div>
				{actions && <div className="flex items-center gap-2">{actions}</div>}
			</div>
		);
	}
);
SectionHeader.displayName = "SectionHeader";

export type ContentWrapperProps = React.HTMLAttributes<HTMLDivElement>;

export const ContentWrapper = React.forwardRef<HTMLDivElement, ContentWrapperProps>(
	({ className, children, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"rounded-xl border border-border bg-card p-6 shadow-xs text-card-foreground",
					className
				)}
				{...props}
			>
				{children}
			</div>
		);
	}
);
ContentWrapper.displayName = "ContentWrapper";

// EmptyState
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	description: string;
	icon?: LucideIcon;
	action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
	({ className, title, description, icon: Icon, action, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center shadow-xs max-w-xl mx-auto my-8 animate-fade-in",
					className
				)}
				{...props}
			>
				{Icon && (
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary mb-4">
						<Icon className="h-6 w-6" />
					</div>
				)}
				<h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
				<p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">{description}</p>
				{action && <div className="w-full flex justify-center">{action}</div>}
			</div>
		);
	}
);
EmptyState.displayName = "EmptyState";

// LoadingState
export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
	message?: string;
}

export const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
	({ className, message = "Loading...", ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"flex flex-col items-center justify-center p-12 text-center space-y-3",
					className
				)}
				{...props}
			>
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm font-medium text-muted-foreground">{message}</p>
			</div>
		);
	}
);
LoadingState.displayName = "LoadingState";
