import { compactCount } from "./format"

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

/**
 * A dollar figure on an axis, where a thousandth can matter and trailing zeros never do. A
 * thousand and up is compact (`$1.5K`), so the tick fits the axis gutter on a phone.
 */
export function usdTick(value: number): string {
	return value >= 1_000 ? `$${compactCount(value)}` : TICK.format(value)
}

/**
 * A dollar figure in a short label: `$1.3K` above a thousand, with cents below it. The compact
 * form cuts the decimal rather than rounding up, like `compactCount`.
 */
export function compactUsd(value: number): string {
	return value >= 1_000 ? `$${compactCount(value)}` : usdLabel(value)
}
