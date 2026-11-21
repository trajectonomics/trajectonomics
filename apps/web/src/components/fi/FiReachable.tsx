import type { ReachableFi } from "../../lib/view/fi/model"
import { Stat } from "../ui/Stat"
import { FiReference } from "./FiReference"

export interface FiReachableProps {
	readonly model: ReachableFi
	readonly currency: string
}

/** The reachable answer: the FI month as the main figure, and the reference beneath it. */
export function FiReachable({ model, currency }: FiReachableProps) {
	return (
		<div className="space-y-8">
			<Stat
				label="Survival method"
				value={model.month}
				secondary={`The earliest month earned income could stop: ${model.date}`}
			/>
			<FiReference reference={model.reference} currency={currency} />
		</div>
	)
}
