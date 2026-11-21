const DECIMAL = /^-?\d+(\.\d+)?$/

/**
 * The one place a money string becomes a number, and only to place a chart mark. Never show its
 * result: the figure on screen is the CLI's string.
 */
export function toChartNumber(amount: string): number {
	if (!DECIMAL.test(amount)) throw new RangeError(`not a decimal money string: ${amount}`)
	return Number(amount)
}
