import { useId } from "react"
import type { BestCaseView, UnreachableFi } from "../../lib/view/fi/model"
import { Money } from "../ui/Money"
import { Stat } from "../ui/Stat"

export interface FiUnreachableProps {
	readonly model: UnreachableFi
	readonly currency: string
}

/** The unreachable answer: the horizon, what binds the date, and the best case the Scenario reaches. */
export function FiUnreachable({ model, currency }: FiUnreachableProps) {
	return (
		<div className="space-y-6">
			<Stat label="Survival method" value={`Not reachable before ${model.horizon}`} />
			<p className="max-w-prose">{model.sentence}</p>
			{model.best && <BestCase best={model.best} currency={currency} />}
		</div>
	)
}

interface BestCaseProps {
	readonly best: BestCaseView
	readonly currency: string
}

function BestCase({ best, currency }: BestCaseProps) {
	const headingId = useId()
	return (
		<section aria-labelledby={headingId} className="space-y-2 rounded-lg border border-border p-4">
			<h2 id={headingId} className="text-base font-semibold">
				Best case
			</h2>
			<p className="text-sm">If earned income stopped in {best.month}:</p>
			{best.kind === "runsOut" ? (
				<p className="text-sm">
					the money runs out on {best.date}, with <Money amount={best.unmet} currency={currency} />{" "}
					unmet.
				</p>
			) : (
				<p className="text-sm">
					accessible net worth falls short of the buffer on {best.date}: required{" "}
					<Money amount={best.required} currency={currency} />, accessible{" "}
					<Money amount={best.accessible} currency={currency} />.
				</p>
			)}
		</section>
	)
}
