import { formatMoney, maskMoney } from "../../lib/format"
import { useHideAmounts } from "../../lib/view/preferences-store"
import { cx } from "./cx"

export interface MoneyProps {
	/** The CLI's decimal string, such as "-94000.00". Shown as it is, with its digits grouped. */
	readonly amount: string
	/** The currency code, shown beside the amount. */
	readonly currency?: string | undefined
	/** Colours a negative amount as a warning. The sign itself is always shown. */
	readonly signed?: boolean
	/** Overrides the hide-amounts switch. Left out, the switch decides. */
	readonly hidden?: boolean | undefined
}

/**
 * A money amount with tabular figures. When amounts are hidden its digits become a mask and its
 * sign stays; the currency code and the reader's words still show.
 */
export function Money({ amount, currency, signed = false, hidden }: MoneyProps) {
	const [switchHidden] = useHideAmounts()
	const isHidden = hidden ?? switchHidden
	const negative = amount.startsWith("-")
	return (
		<span
			className={cx("whitespace-nowrap tabular-nums", signed && negative && "text-destructive")}
		>
			<span aria-hidden={isHidden ? "true" : undefined}>
				{isHidden ? maskMoney(amount) : formatMoney(amount)}
			</span>
			{isHidden && <span className="sr-only"> amount hidden</span>}
			{currency && <span className="ml-1 text-xs text-muted-foreground">{currency}</span>}
		</span>
	)
}
