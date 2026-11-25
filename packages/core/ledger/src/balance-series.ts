import type { ChartOfAccounts } from "./chart-map"

/** The Postings of one Account by date, with the running sum up to each. */
export type Series = { readonly dates: readonly string[]; readonly sums: readonly bigint[] }

const MAX = BigInt(Number.MAX_SAFE_INTEGER)
export const unsafe = (sum: bigint): boolean => sum > MAX || sum < -MAX

export const seriesOf = (rows: readonly { date: string; amount: number }[]): Series => {
	const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
	let sum = 0n
	return {
		dates: sorted.map((row) => row.date),
		sums: sorted.map((row) => {
			sum += BigInt(row.amount)
			return sum
		}),
	}
}

/** How many rows satisfy `leading`, which holds for a prefix of the dates and no later one. */
const countWhile = (series: Series, leading: (date: string) => boolean): number => {
	let low = 0
	let high = series.dates.length
	while (low < high) {
		const mid = (low + high) >> 1
		if (leading(series.dates[mid]!)) low = mid + 1
		else high = mid
	}
	return low
}

/** The number of rows dated on or before `cutoff`. */
export const rowsUpTo = (series: Series, cutoff: string): number =>
	countWhile(series, (date) => date <= cutoff)

/** The number of rows dated before `date`. */
export const rowsBefore = (series: Series, date: string): number =>
	countWhile(series, (row) => row < date)

/** The running sum up to and including `cutoff`: the last row whose date is not after it. */
export const sumUpTo = (series: Series | undefined, cutoff: string): bigint => {
	if (series === undefined) return 0n
	const count = rowsUpTo(series, cutoff)
	return count === 0 ? 0n : series.sums[count - 1]!
}

/** The Leaf Accounts by their place in the chart, the order `balance` checks them in. */
export const leafOrder = (chart: ChartOfAccounts): ReadonlyMap<string, number> => {
	const order = new Map<string, number>()
	for (const account of chart.values())
		if (chart.isLeaf(account.id)) order.set(account.id, order.size)
	return order
}
