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

/** One `projection run` per Scenario, with the monthly rows when asked. */
export function planProjections(params: PlanParams, names: string[]): Record<string, PlannedRead> {
	const monthly = params.monthly ? ["--monthly"] : []
	return perScenario(params, names, (name) => [
		"projection",
		"run",
		scenarioFlag(name),
		...projectionFlags(params),
		...monthly,
		"--json",
	])
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
