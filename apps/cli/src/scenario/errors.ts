import { type AppError, fail } from "../errors"

/** A lookup miss for any Scenario command; `path` names the input field that held the word. */
export function scenarioNotFound(what: string, path = "scenario"): AppError {
	return fail("not_found", {
		path,
		message: `No scenario matches "${what}".`,
		details: { resource: "scenario" },
		hint: 'Run "traj scenario list" to see the scenarios.',
	})
}

/** The most characters a Scenario's new name may have when `scenario rename` gives it (cli ADR-0071). */
export const SCENARIO_NAME_MAX = 100

/** A new name that a live Scenario already holds (ADR-0021). */
export function scenarioNameTaken(id: string): AppError {
	return fail("scenario_name_taken", {
		path: "name",
		message: "A scenario with this name already exists.",
		details: { scenarioId: id },
	})
}

/**
 * A write that named the content hash it read, against a plan whose stored hash has moved on, or
 * against no plan at all (cli ADR-0055). Nothing is written; the hint says to read the plan again.
 */
export function scenarioChanged(
	name: string,
	expectedHash: string,
	storedHash: string | null,
): AppError {
	const stored =
		storedHash === null
			? `No scenario named "${name}" is stored now. Run "traj scenario list" to see the scenarios.`
			: `The stored contentHash of "${name}" is ${storedHash}. Run "traj scenario show ${name}" to read the plan again, then write the change to what it prints.`
	return fail("scenario_changed", {
		path: "--if-hash",
		message: `The scenario changed since it was read: the write expected ${expectedHash}.`,
		hint: stored,
		details: { expectedHash, storedHash },
	})
}

/** A delete of the main plan without `--force`; the hint names the command that picks another. */
export function scenarioIsMain(scenario: { id: string; name: string }): AppError {
	return fail("scenario_is_main", {
		path: "scenario",
		message: `The scenario "${scenario.name}" is the main plan and is not removed.`,
		details: { scenarioId: scenario.id },
		hint: `Choose another main plan with "traj scenario main <name>" or take the mark off with "traj scenario main --clear", then remove it; or remove it now with --force, which clears the main-plan setting.`,
	})
}

/** A new name shaped like a UUID would shadow the id-first resolution (ADR-0018). */
export function invalidScenarioName(): AppError {
	return fail("invalid_input", {
		path: "name",
		message: "name: a scenario name cannot be shaped like a UUID",
	})
}
