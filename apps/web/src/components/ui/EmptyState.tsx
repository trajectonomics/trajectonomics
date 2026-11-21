import type { ReactNode } from "react"

export interface EmptyStateProps {
	/** A short heading, such as "No transactions in this period". */
	readonly title: string
	readonly children?: ReactNode
}

/** A place with nothing to show yet, with a sentence on why and what to do. */
export function EmptyState({ title, children }: EmptyStateProps) {
	return (
		<section className="rounded-lg border border-dashed border-border p-6">
			<h2 className="text-base font-semibold">{title}</h2>
			{children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
		</section>
	)
}
