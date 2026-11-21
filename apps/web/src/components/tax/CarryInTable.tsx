import type { CarryInRow } from "../../lib/view/tax"
import { Money } from "../ui/Money"

export interface CarryInTableProps {
	readonly rows: readonly CarryInRow[]
	readonly currency: string
}

/**
 * The Carry-in records the result echoes: for each period, its source, what it had prepaid, and each
 * tallied class. Each record is a block, so its amounts wrap on a narrow screen instead of squeezing.
 */
export function CarryInTable({ rows, currency }: CarryInTableProps) {
	return (
		<section aria-labelledby="carry-in-title" className="space-y-3">
			<h2 id="carry-in-title" className="text-base font-semibold">
				Carry-in records, figures in {currency}
			</h2>
			{rows.map((row) => (
				<article key={row.key} className="rounded-lg border border-border p-4 text-sm">
					<p className="font-medium">
						{row.levy}, period starts {row.periodStart}
					</p>
					<p className="mt-1 text-muted-foreground">Source: {row.source}</p>
					<p className="mt-2 flex justify-between gap-4">
						<span>Prepaid</span>
						<Money amount={row.prepaid} />
					</p>
					<ul className="mt-3 space-y-1 border-t border-border pt-3">
						{row.tallies.map((tally) => (
							<li key={tally.key} className="flex justify-between gap-4">
								<span className="min-w-0 break-words">
									{tally.label} <span className="text-muted-foreground">({tally.basis})</span>
								</span>
								<Money amount={tally.amount} />
							</li>
						))}
					</ul>
				</article>
			))}
		</section>
	)
}
