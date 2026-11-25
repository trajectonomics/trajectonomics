import { formatBps, percentWords } from "../../format"

/** A rate in basis points as a person reads it: 2000 as "20%" and 1250 as "12.5%". Text only; nothing is rounded. */
export function rateWords(bps: number): string {
	return `${percentWords(formatBps(bps))}%`
}
