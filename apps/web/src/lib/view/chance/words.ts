import { yearOf } from "../../format"

/** How long a chance lasted, in the page's words: "Lasts to 2028 in 174 of 200 markets." */
export function chanceLasts(succeeded: number, paths: number, horizon: string): string {
	const markets = paths === 1 ? "market" : "markets"
	return `Lasts to ${yearOf(horizon)} in ${succeeded} of ${paths} ${markets}.`
}
