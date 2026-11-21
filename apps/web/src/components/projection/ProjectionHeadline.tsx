import { formatDate } from "../../lib/format"
import type { Headline } from "../../lib/view/projection/headline"
import { Money } from "../ui/Money"
import { Stat } from "../ui/Stat"

export interface ProjectionHeadlineProps {
	readonly headline: Headline
	readonly currency: string
}

/** The three headline figures: closing net worth, the same in As-of terms, and the run-out. */
export function ProjectionHeadline({ headline, currency }: ProjectionHeadlineProps) {
	const { closing, real, runsOut, horizon } = headline
	return (
		<div className="grid gap-6 sm:grid-cols-3">
			<Stat
				label="Closing net worth"
				value={<Money amount={closing.amount} currency={currency} />}
				secondary={`Nominal, at ${formatDate(closing.date)}`}
			/>
			<Stat
				label="Real net worth, in As-of terms"
				value={<Money amount={real.amount} currency={currency} />}
				secondary={`At ${formatDate(real.date)}`}
			/>
			<Stat
				label="Funding"
				value={
					runsOut ? (
						<>
							Runs out <span className="whitespace-nowrap">{formatDate(runsOut.date)}</span>,{" "}
							<Money amount={runsOut.unmet} currency={currency} /> unmet
						</>
					) : (
						<>
							Does not run out before{" "}
							<span className="whitespace-nowrap">{formatDate(horizon)}</span>
						</>
					)
				}
			/>
		</div>
	)
}
