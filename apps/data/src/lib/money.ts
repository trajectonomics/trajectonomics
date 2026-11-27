const USD = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})

const TICK = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 0,
	maximumFractionDigits: 3,
})

/** A dollar figure in prose or a value label, with the cents it needs: `$2.40`. */
export function usdLabel(value: number): string {
	return USD.format(value)
}

/** A dollar figure on an axis, where a thousandth can matter and trailing zeros never do. */
export function usdTick(value: number): string {
	return TICK.format(value)
}
