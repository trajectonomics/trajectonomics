import type { CurrencyTotal } from "../../lib/contract"
import { cx } from "../ui/cx"
import { Money } from "../ui/Money"

export interface TotalsProps {
	readonly totals: readonly CurrencyTotal[]
	/** Sets the size of the figures. Defaults to the body size. */
	readonly className?: string
}

/** Each currency's total, one per line, as the CLI states it. */
export function Totals({ totals, className }: TotalsProps) {
	if (totals.length === 0) return <p className="text-muted-foreground">No total</p>
	return (
		<span className={cx("flex flex-col gap-1", className)}>
			{totals.map((total) => (
				<Money key={total.currency} amount={total.amount} currency={total.currency} />
			))}
		</span>
	)
}
