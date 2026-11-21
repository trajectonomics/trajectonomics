import type { ReactNode } from "react"

export interface StatProps {
	/** What the figure is, such as "Net worth". */
	readonly label: string
	/** The figure itself: a Money, or a formatted date. */
	readonly value: ReactNode
	/** A line under the figure, such as its As-of date. */
	readonly secondary?: ReactNode
}

/** A label, a large figure and an optional line under it. */
export function Stat({ label, value, secondary }: StatProps) {
	return (
		<div>
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
			{secondary && <p className="mt-1 text-sm text-muted-foreground">{secondary}</p>}
		</div>
	)
}
