/**
 * The Returns a separate-filing projection states, from the `filer` each `taxYears[]` entry carries (cli ADR-0075).
 * A plan that files one Return has no `filer`, so it holds one body and the page shows it as it always has. Pure: the
 * years are grouped as the CLI wrote them, in its order, and no figure changes.
 */
import type { TaxYear } from "../../contract"

/** One Return: the Filer the CLI names, and the tax years of that Filer's Levy. */
export interface TaxReturn {
	readonly filer: string
	readonly years: readonly TaxYear[]
}

/**
 * The Returns a projection states, in the CLI's order, each with the years it wrote for that Filer. Empty when no
 * entry carries a `filer`: that plan shows one Return, and nothing is grouped.
 */
export function returnsOf(years: readonly TaxYear[]): readonly TaxReturn[] {
	const grouped = new Map<string, TaxYear[]>()
	for (const year of years) {
		if (year.filer === undefined) continue
		const held = grouped.get(year.filer)
		if (held === undefined) grouped.set(year.filer, [year])
		else held.push(year)
	}
	return [...grouped].map(([filer, held]) => ({ filer, years: held }))
}

/** The Return named by `filer`, or the first one when it names none: the page opens on the holder's Return. */
export function returnOf(returns: readonly TaxReturn[], filer: string): TaxReturn | null {
	return returns.find((one) => one.filer === filer) ?? returns[0] ?? null
}
