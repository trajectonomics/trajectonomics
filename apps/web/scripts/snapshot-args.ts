import type { PlanInput } from "../src/lib/snapshot"

/** The command line of the snapshot runner, once it is read into the Plan's input and its paths. */
export type SnapshotOptions = {
	input: PlanInput
	traj: string | null
	out: string | null
	carryIn: string | null
}

export type ArgsResult = { ok: true; options: SnapshotOptions } | { ok: false; message: string }

const ONE_VALUE = ["as-of", "horizon", "scenario", "birth-date", "age", "traj", "out", "carry-in"]

/** Reads the command line: value flags take one value, `--compare` takes two, `--monthly` takes none. */
export function parseSnapshotArgs(argv: readonly string[]): ArgsResult {
	const options: SnapshotOptions = {
		input: {
			asOf: null,
			horizon: null,
			scenarios: [],
			compare: null,
			birthDate: null,
			ages: [],
			monthly: false,
			carryIn: false,
		},
		traj: null,
		out: null,
		carryIn: null,
	}
	let index = 0
	while (index < argv.length) {
		const token = argv[index] ?? ""
		const next = applyFlag(options, token, argv, index)
		if (typeof next === "string") return { ok: false, message: next }
		index = next
	}
	return { ok: true, options }
}

/** Applies the flag at `index` and returns the index after it, or the message of a bad flag. */
function applyFlag(
	options: SnapshotOptions,
	token: string,
	argv: readonly string[],
	index: number,
): number | string {
	if (!token.startsWith("--")) return `Unexpected argument ${token}.`
	const [name = "", inline] = token.slice(2).split("=", 2)
	if (name === "monthly") {
		options.input.monthly = true
		return index + 1
	}
	if (name === "compare") return applyCompare(options, argv, index)
	if (!ONE_VALUE.includes(name)) return `Unknown flag --${name}.`
	const value = inline ?? argv[index + 1]
	if (value === undefined) return `--${name} needs a value.`
	return setValue(options, name, value) ?? index + (inline === undefined ? 2 : 1)
}

/** Sets one single-valued flag. Returns a message when the flag cannot take the value. */
function setValue(options: SnapshotOptions, name: string, value: string): string | null {
	const input = options.input
	switch (name) {
		case "as-of":
			input.asOf = value
			return null
		case "horizon":
			input.horizon = value
			return null
		case "scenario":
			input.scenarios = [...input.scenarios, value]
			return null
		case "birth-date":
			input.birthDate = value
			return null
		case "age":
			input.ages = [...input.ages, Number(value)]
			return null
		case "traj":
			options.traj = value
			return null
		case "out":
			options.out = value
			return null
		default:
			options.carryIn = value
			input.carryIn = true
			return null
	}
}

/** `--compare A B`: the two Scenario names follow the flag. */
function applyCompare(
	options: SnapshotOptions,
	argv: readonly string[],
	index: number,
): number | string {
	const a = argv[index + 1]
	const b = argv[index + 2]
	if (a === undefined || b === undefined || a.startsWith("--") || b.startsWith("--")) {
		return "--compare needs two Scenario names: --compare A B."
	}
	options.input.compare = { a, b }
	return index + 3
}
