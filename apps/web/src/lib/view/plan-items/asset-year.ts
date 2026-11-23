/** This year's running costs and rent of a real asset, from the Cash flow lines `--breakdown` states (cli ADR-0058). */
import type { ProjectionRun } from "../../contract"
import { rollupsOf } from "../cashflow/cashflow"
import type { AssetParts } from "./asset-parts"

/** The first year of the run: its span, and what it paid to run the asset and took in as rent, as the CLI states them. */
export interface AssetYear {
	readonly from: string
	readonly to: string
	readonly running: string | null
	readonly rent: string | null
}

/** The first Annual roll-up's lines for the asset's running costs and rent. Null without a roll-up or its lines. */
export function assetYearOf(run: ProjectionRun | undefined, parts: AssetParts): AssetYear | null {
	const first = run === undefined ? undefined : rollupsOf(run)[0]
	if (first === undefined || first.lines.length === 0) return null
	const amountOf = (id: string | undefined) =>
		id === undefined ? null : (first.lines.find((line) => line.id === id)?.amount ?? null)
	return {
		from: first.from,
		to: first.to,
		running: amountOf(parts.running?.id),
		rent: amountOf(parts.rent?.id),
	}
}

/**
 * The years of the run in which the purchase or the sale falls and the engine reports money not funded. An
 * obligation paid on a day a target Contribution is due leaves that Contribution unfunded that month (cli ADR 0060);
 * the card says so, and the Cash flow page has the lines. The page decides nothing: it names the CLI's own lines.
 */
export function unfundedYearsOf(
	run: ProjectionRun | undefined,
	parts: AssetParts,
): { from: string; to: string }[] {
	if (run === undefined) return []
	const dates = [parts.purchase?.start, parts.sale?.start].flatMap((date) => (date ? [date] : []))
	return rollupsOf(run)
		.filter((rollup) => dates.some((date) => date >= rollup.from && date <= rollup.to))
		.filter((rollup) => rollup.lines.some((line) => line.group === "unfunded"))
		.map((rollup) => ({ from: rollup.from, to: rollup.to }))
}
