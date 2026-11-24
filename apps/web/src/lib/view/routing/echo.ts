/**
 * The target a row keeps, from the run's `routing` echo (cli ADR 0070): the amount as the document writes it, how it grows, and
 * the engine's own `resolved` amount at the horizon (what the target is worth on the last day of the plan). Nothing is computed
 * here: a run that states no `resolved` says only "at the start, grown by inflation".
 */
import type { ProjectionRun } from "../../contract"
import { formatBps } from "../../format"
import type { Part } from "./words"

/** The echo's target of a row, in a sentence, or null for a row with no target that grows. */
export function targetNote(
	run: ProjectionRun | undefined,
	list: "surplus" | "withdraw",
	index: number,
): Part[] | null {
	const echo = run?.routing?.[list].find((one) => one.entry === index)
	const target = echo === undefined ? null : "upTo" in echo ? echo.upTo : echo.downTo
	if (echo === undefined || target === null || target.growth === null) return null
	const grown =
		target.growth === "inflation"
			? "grown by inflation"
			: `grown by ${formatBps(target.growth.bps)}% a year`
	const horizon: Part[] =
		echo.resolved === undefined ? [] : [": ", { amount: echo.resolved.horizon }, " at the horizon"]
	return ["At the start ", { amount: target.amount }, `, ${grown}`, ...horizon, "."]
}
