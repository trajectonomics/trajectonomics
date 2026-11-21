import type { ReactNode } from "react"

export interface ReportSectionProps {
	/** The section's id, which names it for a screen reader and anchors a link to it. */
	readonly id: string
	readonly title: string
	/** One or two sentences on what the section shows and how to read its signs. */
	readonly intro?: string
	readonly children: ReactNode
}

/** A titled section of a page: a heading, its intro, and the body of its Reads. */
export function ReportSection({ id, title, intro, children }: ReportSectionProps) {
	return (
		<section aria-labelledby={id} className="space-y-4">
			<header>
				<h2 id={id} className="text-lg font-semibold tracking-tight">
					{title}
				</h2>
				{intro && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{intro}</p>}
			</header>
			{children}
		</section>
	)
}
