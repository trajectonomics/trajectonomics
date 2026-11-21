import type { ReactNode } from "react"

export interface FactProps {
	/** The name of the fact, such as "As of". */
	readonly label: string
	/** The fact itself: text, a date, or a Money. */
	readonly value: ReactNode
}

/** One labelled fact in a definition list, such as the As-of or the engine version. */
export function Fact({ label, value }: FactProps) {
	return (
		<div className="min-w-0">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="mt-0.5 break-words">{value}</dd>
		</div>
	)
}
