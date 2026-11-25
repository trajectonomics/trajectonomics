import type { AnnualRollup } from "@trajectonomics/core/sim"
import type { CompareAnnualRow, CompareFigure, PeriodView } from "./compare-annual-view"

/*
 * The change between two Scenarios for each Annual roll-up (cli ADR-0049, amended). The engine's
 * integers are subtracted here, never a printed string, and a figure is the engine's own value at
 * its side's currency scale. A year whose two sides do not share its period has no change: a side
 * that ran out part-way through it has a partial last period, and two partial periods are not
 * comparable, as the horizon net worth already says.
 */

/** The engine's figures of one side, keyed by roll-up index. */
type SideRollups = ReadonlyMap<number, AnnualRollup>

function byIndex(rollups: readonly AnnualRollup[]): SideRollups {
	return new Map(rollups.map((rollup) => [rollup.index, rollup]))
}

function periodOf(rollup: AnnualRollup | undefined): PeriodView | null {
	return rollup === undefined ? null : { from: rollup.from, to: rollup.to }
}

/**
 * One figure: each side's value in its currency, and b minus a computed from the engine's integers
 * when both sides hold it and the periods agree. Otherwise the delta is null.
 */
function figureOf(
	left: number | undefined,
	right: number | undefined,
	comparable: boolean,
	money: (minor: number) => string,
): CompareFigure {
	return {
		a: left === undefined ? null : money(left),
		b: right === undefined ? null : money(right),
		delta: comparable && left !== undefined && right !== undefined ? money(right - left) : null,
	}
}

/**
 * The rows of `tables.annual`: one per index on either side, in index order. The `levy` key is
 * stated only when a side's Scenario holds a Levy, so a compare without one keeps the same keys
 * every year.
 */
export function compareAnnualRows(
	a: readonly AnnualRollup[],
	b: readonly AnnualRollup[],
	money: (minor: number) => string,
): CompareAnnualRow[] {
	const sideA = byIndex(a)
	const sideB = byIndex(b)
	const indices = [...new Set([...sideA.keys(), ...sideB.keys()])].sort((x, y) => x - y)
	const hasLevy = [...a, ...b].some((rollup) => rollup.levy !== undefined)
	return indices.map((index) => {
		const rollupA = sideA.get(index)
		const rollupB = sideB.get(index)
		const periodA = periodOf(rollupA)
		const periodB = periodOf(rollupB)
		const comparable =
			periodA !== null &&
			periodB !== null &&
			periodA.from === periodB.from &&
			periodA.to === periodB.to
		const shared = comparable ? periodA : null
		const figures = (pick: (rollup: AnnualRollup) => number | undefined) =>
			figureOf(
				rollupA === undefined ? undefined : pick(rollupA),
				rollupB === undefined ? undefined : pick(rollupB),
				comparable,
				money,
			)
		return {
			index,
			from: shared?.from ?? null,
			to: shared?.to ?? null,
			periods: { a: periodA, b: periodB },
			closingNetWorth: figures((rollup) => rollup.closingNetWorth),
			income: figures((rollup) => rollup.income),
			expense: figures((rollup) => rollup.expense),
			contributions: figures((rollup) => rollup.contributions),
			interest: figures((rollup) => rollup.interest),
			...(hasLevy ? { levy: figures((rollup) => rollup.levy) } : {}),
		}
	})
}
