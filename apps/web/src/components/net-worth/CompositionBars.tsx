import type { CurrencyBar } from "../../lib/view/net-worth/composition"
import { CompositionBar } from "../chart/CompositionBar"

export interface CompositionBarsProps {
	readonly bars: readonly CurrencyBar[]
}

/** The assets by account, one bar per currency. Empty when no asset account has a row. */
export function CompositionBars({ bars }: CompositionBarsProps) {
	if (bars.length === 0) return <p className="text-sm text-muted-foreground">No asset accounts.</p>
	return (
		<div className="space-y-6">
			{bars.map((bar) => (
				<CompositionBar
					key={bar.currency}
					label={`Assets by account, ${bar.currency}`}
					segments={bar.segments}
					currency={bar.currency}
				/>
			))}
		</div>
	)
}
