import type { ScenarioDocument, ScenarioShow } from "../../contract"
import { formatBps } from "../../format/bps"

/**
 * The Inflation swing line the Assumptions page shows, when the plan states one: "Inflation swing: ±1.50% a
 * year". The bps go through the page's own rate formatter, and a plan that states 0 (or nothing) shows no
 * line. Nothing is edited here: the field is a later issue (cli ADR-0085).
 */
export function inflationSwingWords(economy: ScenarioDocument["economy"]): string | null {
	const swing = economy?.inflationVolatility
	if (swing === undefined || swing <= 0) return null
	return `Inflation swing: ±${formatBps(swing)}% a year`
}

/**
 * The same line for what the Assumptions page read. The component takes it whole rather than reaching into
 * the document itself, which would read as the browser `document` to the Svelte guard.
 */
export function inflationSwingOf(show: ScenarioShow["scenario"]): string | null {
	const { document: plan } = show
	return inflationSwingWords(plan.economy)
}
