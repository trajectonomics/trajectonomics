import type { ReactNode } from "react"
import { cx } from "./cx"

export interface BadgeProps {
	readonly children: ReactNode
	/** "accent" marks a state the reader must notice, such as demo data. Defaults to "neutral". */
	readonly tone?: "neutral" | "accent"
}

/** A short label on a line of chrome, such as "Demo data". */
export function Badge({ children, tone = "neutral" }: BadgeProps) {
	return (
		<span
			className={cx(
				"inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
				tone === "neutral" && "border-border bg-secondary text-secondary-foreground",
				tone === "accent" && "border-accent text-accent",
			)}
		>
			{children}
		</span>
	)
}
