import type { SnapshotOptions } from "./snapshot-args"

/** Splits `--name=value` at the first `=`, so a value keeps every `=` after it. */
export function splitFlag(token: string): { name: string; inline: string | undefined } {
	const equals = token.indexOf("=")
	if (equals < 0) return { name: token.slice(2), inline: undefined }
	return { name: token.slice(2, equals), inline: token.slice(equals + 1) }
}

/** `--monthly` and `--compare` take no `=value`: the first takes nothing, the second two names. */
export function applyBare(
	options: SnapshotOptions,
	name: string,
	inline: string | undefined,
	argv: readonly string[],
	index: number,
): number | string {
	if (inline !== undefined) return `--${name} takes no =value.`
	if (name === "compare") return applyCompare(options, argv, index)
	options.input.monthly = true
	return index + 1
}

/** Sets one single-valued flag. Returns a message when the flag cannot take the value. */
export function setValue(options: SnapshotOptions, name: string, value: string): string | null {
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
			if (!/^\d+$/.test(value)) return `--age needs a whole number of years, not "${value}".`
			input.ages = [...input.ages, Number(value)]
			return null
		case "return-model":
			input.returnModel = value
			return null
		case "paths":
			if (!/^\d+$/.test(value)) return `--paths needs a whole number of paths, not "${value}".`
			input.paths = Number(value)
			return null
		case "seed":
			input.seed = value
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
