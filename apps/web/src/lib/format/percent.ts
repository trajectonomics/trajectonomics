/**
 * A percent as a sentence reads it: "5.00" is "5" and "3.50" is "3.5". Text only, by dropping trailing zeros of the
 * places the CLI states (a rate is not money, and nothing is rounded: the figure keeps every place it has).
 */
export function percentWords(percent: string): string {
	if (!percent.includes(".")) return percent
	return percent.replace(/0+$/, "").replace(/\.$/, "")
}
