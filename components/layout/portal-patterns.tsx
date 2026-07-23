/**
 * Decorative background patterns used across the public-facing portal screens
 * (landing chooser, admin login, candidate registration) — sampled from the
 * reference UI: a dot grid, a diamond outline grid that fades in from an edge,
 * and a diagonal hairline hatch that fades from a corner.
 */

const DIAMOND_SVG = encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect x="16" y="16" width="32" height="32" fill="none" stroke="#9aa3b5" stroke-width="1.4" transform="rotate(45 32 32)" />
  </svg>`
);

export function DotGrid({ className = "" }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
			style={{
				backgroundImage:
					"radial-gradient(circle at 1px 1px, rgba(30,41,59,0.16) 1.4px, transparent 0)",
				backgroundSize: "22px 22px",
			}}
		/>
	);
}

export function DiamondGrid({
	className = "",
	maskFrom = "left",
}: {
	className?: string;
	maskFrom?: "left" | "right";
}) {
	const mask =
		maskFrom === "right"
			? "linear-gradient(to left, black, transparent 85%)"
			: "linear-gradient(to right, black, transparent 85%)";
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute -z-10 ${className}`}
			style={{
				backgroundImage: `url("data:image/svg+xml,${DIAMOND_SVG}")`,
				backgroundSize: "64px 64px",
				opacity: 0.55,
				WebkitMaskImage: mask,
				maskImage: mask,
			}}
		/>
	);
}

export function DiagonalHatch({ className = "" }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute -z-10 ${className}`}
			style={{
				backgroundImage:
					"repeating-linear-gradient(45deg, rgba(30,41,59,0.14) 0px, rgba(30,41,59,0.14) 1.5px, transparent 1.5px, transparent 16px)",
				WebkitMaskImage:
					"radial-gradient(circle at 0% 0%, black, transparent 70%)",
				maskImage: "radial-gradient(circle at 0% 0%, black, transparent 70%)",
			}}
		/>
	);
}

export function BuildingSilhouette({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden
			viewBox="0 0 400 400"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<circle cx="200" cy="90" r="14" />
			<line x1="200" y1="104" x2="200" y2="130" />
			<path d="M120 200 Q200 100 280 200 Z" />
			<rect x="150" y="150" width="100" height="50" />
			<rect x="90" y="200" width="220" height="16" />
			<rect x="100" y="216" width="14" height="110" />
			<rect x="130" y="216" width="14" height="110" />
			<rect x="160" y="216" width="14" height="110" />
			<rect x="190" y="216" width="14" height="110" />
			<rect x="220" y="216" width="14" height="110" />
			<rect x="250" y="216" width="14" height="110" />
			<rect x="280" y="216" width="14" height="110" />
			<rect x="70" y="326" width="260" height="18" />
			<rect x="50" y="344" width="300" height="14" />
		</svg>
	);
}
