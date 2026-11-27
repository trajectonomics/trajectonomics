/**
 * A percent as a sentence reads it: "5.00" is "5" and "3.50" is "3.5". Text only, by dropping trailing zeros of the
 * places the CLI states (a rate is not money, and nothing is rounded: the figure keeps every place it has).
 */
export function percentWords(percent: string): string {
	if (!percent.includes(".")) return percent
	return percent.replace(/0+$/, "").replace(/\.$/, "")
}

const PERCENT = /^(-?\d+(?:\.\d+)?)%$/

/** A percent as the page prints it: "96.50%" becomes "96.5%" and "4.00%" becomes "4%". The value never changes. */
export function trimPercent(text: string): string {
	const match = PERCENT.exec(text)
	return match === null ? text : `${percentWords(match[1] ?? "")}%`
}
