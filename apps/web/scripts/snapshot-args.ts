import type { PlanInput } from "../src/lib/snapshot"
import { applyBare, setValue, splitFlag } from "./snapshot-flags"

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
	const { name, inline } = splitFlag(token)
	if (name === "monthly" || name === "compare") return applyBare(options, name, inline, argv, index)
	if (!ONE_VALUE.includes(name)) return `Unknown flag --${name}.`
	const value = inline ?? argv[index + 1]
	if (value === undefined) return `--${name} needs a value.`
	return setValue(options, name, value) ?? index + (inline === undefined ? 2 : 1)
}
