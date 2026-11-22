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
 * against no plan at all (cli ADR-0051). Nothing is written; the hint says to read the plan again.
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

/** A new name shaped like a UUID would shadow the id-first resolution (ADR-0018). */
export function invalidScenarioName(): AppError {
	return fail("invalid_input", {
		path: "name",
		message: "name: a scenario name cannot be shaped like a UUID",
	})
}
