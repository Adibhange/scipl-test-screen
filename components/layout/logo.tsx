import Image from "next/image";

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
	const markSize = size === "sm" ? 72 : 92;
	return (
		<div className="flex items-center gap-4">
			<Image
				src="/logo-mark.png"
				alt="Sthapatya Consultants mark"
				width={markSize}
				height={markSize}
				className="shrink-0"
				priority
			/>
			<Image
				src="/logo-text.png"
				alt="Sthapatya Consultants India Pvt. Ltd."
				width={size === "sm" ? 260 : 320}
				height={size === "sm" ? 96 : 118}
				className={
					size === "sm"
						? "h-auto w-[230px] sm:w-[260px]"
						: "h-auto w-[260px] sm:w-[320px]"
				}
				priority
			/>
		</div>
	);
}
