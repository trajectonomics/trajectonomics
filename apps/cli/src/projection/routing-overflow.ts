import {
	type ProjectionOptions,
	type ProjectionProblem,
	routedTargetAt,
	type Scenario,
	type Timeline,
} from "@trajectonomics/core/sim"
import { routingOption } from "./routing"

/*
 * A grown target the engine can subtract but cannot state (sim ADR-0030): with the `routing` option the engine
 * refuses a target past the safe integers as `VALUE_OVERFLOW` on the horizon date, yet without it the same plan
 * runs, because the engine subtracts the target exactly. A run must not fail for a figure it only reports, so it
 * runs again without the option and says which target it could not state (cli ADR-0070).
 */

type Attempt = { ok: true } | { ok: false; problems: readonly ProjectionProblem[] }

/** One routing target of the document, by the path a person addresses it with. */
type Located = {
	path: string
	target: NonNullable<Scenario["cashflow"]["surplus"][number]["upTo"]>
}

function targetsOf(cashflow: Scenario["cashflow"]): Located[] {
	const found: Located[] = []
	cashflow.surplus.forEach((step, entry) => {
		if (typeof step.upTo === "object") {
			found.push({ path: `cashflow.surplus[${entry}].upTo`, target: step.upTo })
		}
	})
	cashflow.withdraw.forEach((item, entry) => {
		if (typeof item !== "string" && typeof item.downTo === "object") {
			found.push({ path: `cashflow.withdraw[${entry}].downTo`, target: item.downTo })
		}
	})
	return found
}

/** The grown targets the engine's own resolver refuses on the horizon date, as the sentence that names each. */
function unstatedTargets(document: Scenario, timeline: Timeline): string[] {
	const { inflation } = document.economy
	const sentences: string[] = []
	for (const { path, target } of targetsOf(document.cashflow)) {
		try {
			routedTargetAt(target, timeline.start, timeline.horizon, inflation)
		} catch (error) {
			if (!(error instanceof RangeError)) throw error
			const growth =
				typeof target === "object" && typeof target.growth === "object"
					? `${target.growth.bps} bps a year`
					: "inflation"
			sentences.push(
				`What the target at ${path} is worth at the horizon, ${timeline.horizon}, cannot be stated: grown by ${growth}, it passes the largest amount the engine holds. The plan still runs with it.`,
			)
		}
	}
	return sentences
}

/** Whether the engine refused with an overflow that names no Account and falls on the horizon date. */
function overflowsOnHorizon(problems: readonly ProjectionProblem[], horizon: string): boolean {
	const first = problems[0]
	return (
		first?.code === "VALUE_OVERFLOW" &&
		first.date === horizon &&
		!("account" in first && first.account !== undefined)
	)
}

/**
 * Run the engine with the `routing` option when the run prints a grown target, and again without it when only that
 * statement overflowed. The notes name each target the echo could not state, and the echo then carries no `resolved`.
 */
export function routedRun<R extends Attempt>(
	document: Scenario,
	timeline: Timeline,
	run: (routing: Pick<ProjectionOptions, "routing">) => R,
): { result: R; notes: string[] } {
	const option = routingOption(document)
	const result = run(option)
	if (result.ok || option.routing !== true) return { result, notes: [] }
	if (!overflowsOnHorizon(result.problems, timeline.horizon)) return { result, notes: [] }
	const notes = unstatedTargets(document, timeline)
	return notes.length === 0 ? { result, notes } : { result: run({}), notes }
}
