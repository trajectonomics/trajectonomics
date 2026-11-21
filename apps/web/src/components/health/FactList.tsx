import type { ReactNode } from "react"

export interface Fact {
	readonly label: string
	readonly value: ReactNode
}

export interface FactListProps {
	readonly facts: readonly Fact[]
}

/** Labels and values in two columns on a wide screen, one under another on a phone. */
export function FactList({ facts }: FactListProps) {
	return (
		<dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-y-2">
			{facts.map((fact) => (
				<div key={fact.label} className="contents">
					<dt className="text-muted-foreground">{fact.label}</dt>
					<dd className="break-all tabular-nums">{fact.value}</dd>
				</div>
			))}
		</dl>
	)
}
