import { check, type Problem } from "@trajectonomics/core/sim"
import { detailOf } from "./document-detail"
import { type OwnProblem, ownProblems } from "./own-problems"

// `sim-core` owns the Scenario model (AGENTS.md rule 5, ADR-0024). Its `check()` reads a Baseline,
// a Scenario and a Timeline in one pass and returns `{ code, path }` problems, so the CLI validates
// a Scenario by giving it the neutral Baseline and no Timeline and keeping the `scenario.` problems.
// Nothing is restated here: the codes, their order and the paths are all the core's.

/** A Scenario document. `sim-core` decides whether a value is one; the CLI keeps it as JSON. */
export type ScenarioDocument = Record<string, unknown>

/** One reason `sim-core` refuses a document, with the path inside the document. */
export type ScenarioProblem =
	| { readonly code: Problem["code"]; readonly segments: readonly (string | number)[] }
	| OwnProblem

/** An empty Baseline v1: valid on its own, and it names no Account the Scenario could rely on. */
const NEUTRAL_BASELINE = { schemaVersion: 1, balances: [] } as const

/**
 * How many `schemaVersion`s the scan tries. `sim-core`'s version is a small positive integer that
 * only increases, so the scan finds it early; a pin that accepts none inside the bound makes the
 * template fail as `internal`, and the validity test reports it first (ADR-0033).
 */
const SCHEMA_VERSION_BOUND = 64

/** The hint every document refusal carries: the channel that prints the document's shape. */
const SCHEMA_HINT = 'Run "traj schema scenario apply" to see the document schema.'

let memoizedVersion: { readonly value: number | undefined } | undefined

/**
 * The `schemaVersion` the pinned `sim-core` accepts, asked of the core itself (ADR-0024,
 * ADR-0033). It walks the bounded range ascending and keeps the highest version with no
 * `UNSUPPORTED_SCHEMA_VERSION` at `scenario.schemaVersion`, because a literal would go stale the
 * way the pin's 1 -> 4 move already did. Memoized: importing the command tree may ask for it.
 */
export function acceptedScenarioSchemaVersion(): number | undefined {
	memoizedVersion ??= { value: findAcceptedVersion() }
	return memoizedVersion.value
}

function findAcceptedVersion(): number | undefined {
	let found: number | undefined
	for (let version = 1; version <= SCHEMA_VERSION_BOUND; version += 1) {
		if (!rejectsVersion(version)) found = version
	}
	return found
}

function rejectsVersion(version: number): boolean {
	return check(NEUTRAL_BASELINE, { schemaVersion: version }, null).some(
		(problem) =>
			problem.code === "UNSUPPORTED_SCHEMA_VERSION" &&
			problem.path[0] === "scenario" &&
			problem.path[1] === "schemaVersion",
	)
}

/**
 * `MISSING_CARRY_IN` depends on the Timeline's start, so it is a `projection run` failure (#11).
 * Passing `null` for the Timeline already stops `sim-core`'s Timeline checks; dropping the code as
 * well guards against a later `sim-core` that reports it another way.
 */
const TIMELINE_CODES: ReadonlySet<string> = new Set(["MISSING_CARRY_IN"])

/** The problems `sim-core` finds in a document alone, in its order, with `scenario.` stripped, then the CLI's own (cli ADR-0067). */
export function scenarioProblems(value: unknown): ScenarioProblem[] {
	const found: ScenarioProblem[] = []
	for (const problem of check(NEUTRAL_BASELINE, value, null)) {
		if (problem.path[0] === "scenario" && !TIMELINE_CODES.has(problem.code)) {
			found.push({ code: problem.code, segments: problem.path.slice(1) })
		}
	}
	found.push(...ownProblems(value))
	return found
}

/** The document path as the CLI prints it: `base` plus segments, a list index as a number. */
export function documentPath(base: string, segments: readonly (string | number)[]): string {
	return [base, ...segments].join(".")
}

/** One refusal's envelope fields, built once so the command, the Store and a restore agree. */
export type Refusal = { path: string; message: string; code: string; hint: string }

export function refusalOf(problem: ScenarioProblem, base: string): Refusal {
	const path = documentPath(base, problem.segments)
	const detail = detailOf(problem, acceptedScenarioSchemaVersion)
	return {
		path,
		message: `${path}: ${problem.code}${detail === undefined ? "" : ` (${detail})`}`,
		code: problem.code,
		hint: SCHEMA_HINT,
	}
}
