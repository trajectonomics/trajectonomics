import type { Result } from "../command"
import { ok } from "../command"
import { type AppError, isAppError } from "../errors"
import type { ScenarioForked, ScenarioTransform } from "../store"
import type { ScenarioDocument } from "./document"
import { scenarioNameTaken, scenarioNotFound } from "./errors"
import { type AppliedOverrides, applyScenarioSets } from "./set-apply"
import type { AppliedOverride } from "./set-error"
import { view, type WrittenScenario } from "./view"

/** What `scenario fork` returns: the Overrides it persisted, and the copy it wrote (cli ADR-0055). */
export type ForkResult = {
	dryRun: boolean
	status: "forked"
	overrides: AppliedOverride[]
	removals: string[]
	scenario: WrittenScenario
	droppedAnchors: string[]
}

/** The Overrides a fork applied, which the result echoes; empty when the fork applied none. */
export type Applied = Pick<AppliedOverrides, "overrides" | "removals">

/** The Overrides a fork is asked to persist: its Sets and removals, and whether Sets are decimal. */
export type ForkOverrides = {
	sets: readonly string[]
	without: readonly string[]
	decimal: boolean
}

/** Applies the removals and the sets inside the store's write, and keeps their echo for the result. */
export function transformFor(
	override: ForkOverrides,
	echo: (applied: Applied) => void,
): ScenarioTransform {
	return (document: ScenarioDocument) => {
		const applied = applyScenarioSets(document, override.sets, {
			without: override.without,
			decimal: override.decimal,
		})
		if (isAppError(applied)) return applied
		echo(applied)
		return applied.document
	}
}

export function reply(
	outcome: ScenarioForked | AppError,
	from: string,
	applied: Applied,
	dryRun: boolean,
): Result<ForkResult> | AppError {
	if (isAppError(outcome)) return outcome
	if (outcome.status === "not_found") return scenarioNotFound(from, "from")
	if (outcome.status === "name_taken") return scenarioNameTaken(outcome.scenario.id)
	const rendered = view(outcome.scenario)
	const scenario: WrittenScenario = { ...rendered, id: dryRun ? null : rendered.id }
	const { droppedAnchors } = outcome
	return ok({
		dryRun,
		status: "forked",
		overrides: applied.overrides,
		removals: applied.removals,
		scenario,
		droppedAnchors,
	})
}
