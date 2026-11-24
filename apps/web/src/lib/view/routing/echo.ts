/**
 * The target a row keeps, from the run's `routing` echo (cli ADR 0070): the amount as the document writes it, and how it grows.
 * The echo does not yet state the amount in force at the first roll-up and at the horizon (#458), so the sentence says what
 * the echo says: "at the start, grown by inflation". Nothing is computed here.
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
	if (target === null || target.growth === null) return null
	const grown =
		target.growth === "inflation"
			? "grown by inflation"
			: `grown by ${formatBps(target.growth.bps)}% a year`
	return ["At the start ", { amount: target.amount }, `, ${grown}.`]
}
