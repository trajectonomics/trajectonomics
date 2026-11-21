import type { Language } from "../language/language"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** One Language's Dictionary as the parity check reads it: the Language, and its keys. */
export interface NamedDictionary {
	readonly language: Language
	readonly dictionary: unknown
}

/** One key path: `footer.note`, or `items.1` for an array index. */
type KeyPath = string

/** One value of one Dictionary, so a failure names the Language that carries it. */
interface Value {
	readonly language: Language
	readonly value: unknown
}

/** The value kind `DICTIONARY_SHAPE` compares, one name for each kind a Dictionary may carry. */
function kindOf(value: unknown): string {
	if (value === null) return "null"
	if (Array.isArray(value)) return "array"
	return typeof value
}

/** Whether a value carries a key, or an array index. */
function has(value: unknown, key: string | number): boolean {
	if (Array.isArray(value)) return typeof key === "number" && key < value.length
	return typeof value === "object" && value !== null && Object.hasOwn(value, String(key))
}

/** Every key a value carries: object keys, or an array's indexes. */
function keysOf(value: unknown): readonly (string | number)[] {
	if (Array.isArray(value)) return value.map((_, index) => index)
	if (typeof value === "object" && value !== null) return Object.keys(value)
	return []
}

/** The value at one key or index. */
function valueAt(value: unknown, key: string | number): unknown {
	return Array.isArray(value)
		? value[key as number]
		: (value as Record<string, unknown>)[String(key)]
}

/** One path below a parent, so a nested failure names `footer.note` and an index `items.1`. */
function child(path: KeyPath, key: string | number): KeyPath {
	return path === "" ? String(key) : `${path}.${key}`
}

/** One `DICTIONARY_KEY_MISSING`: `other` lacks the path `owner` carries. */
function missing(path: KeyPath, owner: Value, other: Value): BuildFailure {
	return buildFailure(
		"DICTIONARY_KEY_MISSING",
		path,
		`"${path}" is in ${owner.language} but not in ${other.language}.`,
	)
}

/** The paths below `path` the two values still agree on, walked deeper where both carry one. */
function agreed(path: KeyPath, left: Value, right: Value): readonly BuildFailure[] {
	return keysOf(left.value).flatMap((key) => {
		const keyPath = child(path, key)
		if (!has(right.value, key)) return [missing(keyPath, left, right)]
		const nextLeft = { language: left.language, value: valueAt(left.value, key) }
		const nextRight = { language: right.language, value: valueAt(right.value, key) }
		return walk(keyPath, nextLeft, nextRight)
	})
}

/** The paths one side carries and the other does not, and the failures of the paths below it. */
function walk(path: KeyPath, left: Value, right: Value): readonly BuildFailure[] {
	const leftKind = kindOf(left.value)
	const rightKind = kindOf(right.value)
	if (leftKind !== rightKind) {
		const where = path === "" ? "the Dictionary" : `"${path}"`
		return [
			buildFailure(
				"DICTIONARY_SHAPE",
				path,
				`${left.language} has ${leftKind} at ${where}, ${right.language} has ${rightKind}.`,
			),
		]
	}
	if (leftKind !== "object" && leftKind !== "array") return []
	return [
		...agreed(path, left, right),
		...keysOf(right.value).flatMap((key) =>
			has(left.value, key) ? [] : [missing(child(path, key), right, left)],
		),
	]
}

/** Every key path the two source Dictionaries do not agree on, walked both ways. */
export function checkDictionaryParity(
	left: NamedDictionary,
	right: NamedDictionary,
): readonly BuildFailure[] {
	return walk(
		"",
		{ language: left.language, value: left.dictionary },
		{ language: right.language, value: right.dictionary },
	)
}
