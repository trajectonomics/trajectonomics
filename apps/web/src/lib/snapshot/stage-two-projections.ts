import type { PlanParams } from "./params"
import type { PlannedRead } from "./planned"

/** The flags every projection-shaped read takes: the dates, the horizon and the Carry-in. */
function projectionFlags(params: PlanParams): string[] {
	const carry = params.carryIn ? ["--carry-in", "-"] : []
	return ["--as-of", params.asOf, "--horizon", params.horizon, ...carry]
}

/**
 * A Scenario name as one `--scenario=NAME` token. A name is the caller's or the ledger's, so it never
 * stands alone as a token: one that starts with a dash would otherwise be read as a flag.
 */
function scenarioFlag(name: string): string {
	return `--scenario=${name}`
}

/** One planned read per Scenario name, each taking that Scenario's Carry-in when the caller gave one. */
function perScenario(
	params: PlanParams,
	names: string[],
	argvFor: (name: string) => string[],
): Record<string, PlannedRead> {
	return Object.fromEntries(
		names.map((name): [string, PlannedRead] => [
			name,
			{ argv: argvFor(name), carryInFor: params.carryIn ? [name] : [] },
		]),
	)
}

/**
 * One `projection run` per Scenario, with the monthly rows when asked. Every run asks for the loans'
 * statements (`--liabilities`, cli ADR 0059): the planner's loan cards show the schedule and the paid-off
 * date from those rows, so the page computes none of them.
 */
export function planProjections(params: PlanParams, names: string[]): Record<string, PlannedRead> {
	const monthly = params.monthly ? ["--monthly"] : []
	return perScenario(params, names, (name) => [
		"projection",
		"run",
		scenarioFlag(name),
		...projectionFlags(params),
		...monthly,
		"--liabilities",
		"--json",
	])
}

/**
 * One `scenario show --decimal` per Scenario: the document the planner pages edit, in the form where
 * money is a decimal string. The name follows the flags, after `--`, so a name that starts with a dash
 * is still read as a name.
 */
export function planDocuments(names: string[]): Record<string, PlannedRead> {
	return Object.fromEntries(
		names.map((name): [string, PlannedRead] => [
			name,
			{ argv: ["scenario", "show", "--decimal", "--json", "--", name], carryInFor: [] },
		]),
	)
}

/** One `fi` per Scenario. */
export function planFi(params: PlanParams, names: string[]): Record<string, PlannedRead> {
	return perScenario(params, names, (name) => [
		"fi",
		scenarioFlag(name),
		...projectionFlags(params),
		"--json",
	])
}

/**
 * One `projection chance` per Scenario, when the caller stated a Return model. The model is read from its
 * file by the CLI, so only its path is in the argv; the Carry-in goes on standard input, as for a run.
 */
export function planChance(params: PlanParams, names: string[]): Record<string, PlannedRead> {
	const chance = params.chance
	if (chance === null) return {}
	return perScenario(params, names, (name) => [
		"projection",
		"chance",
		scenarioFlag(name),
		...projectionFlags(params),
		`--return-model=${chance.returnModel}`,
		`--paths=${chance.paths}`,
		`--seed=${chance.seed}`,
		"--json",
	])
}

/**
 * The `projection compare` of two Scenarios, when the caller asked for one. The two names come last,
 * after `--`, so a name that starts with a dash is still read as a name.
 */
export function planCompare(params: PlanParams): PlannedRead | null {
	if (params.compare === null) return null
	const { a, b } = params.compare
	const birth = params.birthDate === null ? [] : ["--birth-date", params.birthDate]
	const ages = params.ages.flatMap((age) => ["--age", String(age)])
	const carry = params.carryIn ? ["--carry-in", "-"] : []
	const argv = ["projection", "compare", "--as-of", params.asOf, "--horizon", params.horizon]
	return {
		argv: [...argv, ...birth, ...ages, ...carry, "--json", "--", a, b],
		carryInFor: params.carryIn ? [a, b] : [],
	}
}
