import type { Assumption } from "../../contract"

/** One unconfirmed tax figure as the Tax page lists it: its path and a sentence saying what it is. */
export interface AssumptionLine {
	readonly key: string
	readonly path: string
	readonly text: string
}

function figureOf(assumption: Assumption): string {
	return Array.isArray(assumption.value) ? assumption.value.join(", ") : String(assumption.value)
}

/**
 * The assumptions of every tax year, each figure once, in the order the CLI states them. A figure
 * the CLI names is shown as the CLI states it: this page holds no figure and judges none.
 */
export function assumptionLines(
	years: readonly { readonly assumptions: readonly Assumption[] }[],
): readonly AssumptionLine[] {
	const seen = new Map<string, AssumptionLine>()
	for (const assumption of years.flatMap((year) => year.assumptions)) {
		if (seen.has(assumption.path)) continue
		const text = `${assumption.note} Used ${figureOf(assumption)}; ${assumption.status}.`
		seen.set(assumption.path, { key: assumption.path, path: assumption.path, text })
	}
	return [...seen.values()]
}
