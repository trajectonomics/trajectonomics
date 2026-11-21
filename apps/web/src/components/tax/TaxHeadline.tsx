import type { TaxHeadline as Headline } from "../../lib/view/tax"
import { Money } from "../ui/Money"
import { Stat } from "../ui/Stat"

export interface TaxHeadlineProps {
	readonly headline: Headline
	readonly currency: string
}

/** The first tax year: what is owed, or a refund in words, with its Levy, period and settlement date. */
export function TaxHeadline({ headline, currency }: TaxHeadlineProps) {
	return (
		<Stat
			label={headline.refund ? "Refund" : "Owed"}
			value={<Money amount={headline.owed} currency={currency} />}
			secondary={`${headline.levy}, ${headline.period}, settles ${headline.settles}`}
		/>
	)
}
