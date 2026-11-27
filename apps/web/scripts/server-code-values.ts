/**
 * A Dashboard source's `code` values, read from every way the page writes one: a literal, a named constant, a type, a
 * flag, a read, a ternary's two arms or a union's members. A value it cannot read is reported, so the guard fails on it.
 * Pure: the test passes the sources in.
 */

/** One source file: its path from `apps/web`, and its text. */
export interface Source {
	readonly file: string
	readonly text: string
}

/** A value read from a source: the codes it states, and whether the scan could read it. */
export interface Value {
	readonly codes: string[]
	readonly read: boolean
}

/** A constant that holds a code: `CONTRACT_MISMATCH = "contract_mismatch"`. */
const CONSTANT = /\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*"([a-z][a-z0-9_]*)"/g

/** A quoted literal, whose text is the code it states. */
const LITERAL = /^"([^"]*)"$/

/** A constant name, which the map resolves to its code. */
const CONSTANT_NAME = /^[A-Z][A-Z0-9_]*$/

/** A type alias name, such as `ChanceErrorCode`, which is a type and not a code. */
const TYPE_NAME = /^[A-Z][A-Za-z0-9_$]*$/

/** A constant map's member, such as `CODES.fresh`, whose code the scan cannot read. */
const MAP_MEMBER = /^[A-Z][A-Z0-9_$]*\./

/** The words that state a type, never a code. */
const TYPE_WORDS: ReadonlySet<string> = new Set([
	"string",
	"number",
	"boolean",
	"unknown",
	"null",
	"undefined",
	"void",
])

const NONE: Value = { codes: [], read: true }
const UNREAD: Value = { codes: [], read: false }

/** The named constant each upper-case `const` of a source holds, when its value is a lower_snake code. */
function constantsOf(text: string): Map<string, string> {
	return new Map(
		[...text.matchAll(CONSTANT)].flatMap((match): [string, string][] =>
			match[1] === undefined || match[2] === undefined ? [] : [[match[1], match[2]]],
		),
	)
}

/** Every named code of every source, so a constant a file imports still reads as the code it holds. */
export function allConstants(sources: readonly Source[]): Map<string, string> {
	const merged = new Map<string, string>()
	for (const source of sources) {
		for (const [name, code] of constantsOf(source.text)) merged.set(name, code)
	}
	return merged
}

/** A quoted literal's code, or null when the text is not one. */
function literalCode(text: string): string | null {
	const match = LITERAL.exec(text)
	return match === null ? null : (match[1] ?? null)
}

/** A named constant's code, or unreadable when the map does not hold it. */
function namedConstant(name: string, constants: ReadonlyMap<string, string>): Value {
	const code = constants.get(name)
	return code === undefined ? UNREAD : { codes: [code], read: true }
}

/** Whether a value states no code: a type's words or name, a flag, or a quote that is not a lower_snake literal. */
function isNoCode(text: string): boolean {
	if (text.startsWith('"') || text.startsWith("`") || text.startsWith("'")) return true
	return text === "true" || text === "false" || TYPE_NAME.test(text) || TYPE_WORDS.has(text)
}

/** One value with no union or ternary: its codes, and whether it is readable. */
function readOne(text: string, constants: ReadonlyMap<string, string>): Value {
	const literal = literalCode(text)
	if (literal !== null) return { codes: [literal], read: true }
	if (CONSTANT_NAME.test(text)) return namedConstant(text, constants)
	if (MAP_MEMBER.test(text)) return UNREAD
	if (isNoCode(text)) return NONE
	// A read, a call or an await states no code here; a bare name could, and the scan cannot tell which.
	return /^[a-z_$][A-Za-z0-9_$]*$/.test(text) ? UNREAD : NONE
}

/** The two arms of `condition ? whenTrue : whenFalse`, else null. */
function arms(text: string): [string, string] | null {
	const question = text.indexOf("?")
	const colon = question === -1 ? -1 : text.indexOf(":", question)
	if (question === -1 || colon === -1) return null
	return [text.slice(question + 1, colon), text.slice(colon + 1)]
}

/** A value's codes and whether it can be read: a ternary's two arms, a union's members, or one value. */
export function readValue(value: string, constants: ReadonlyMap<string, string>): Value {
	const text = value.trim()
	const ternary = arms(text)
	if (ternary !== null) {
		const [when, otherwise] = ternary.map((arm) => readValue(arm, constants))
		if (when === undefined || otherwise === undefined) return UNREAD
		return { codes: [...when.codes, ...otherwise.codes], read: when.read && otherwise.read }
	}
	if (text.includes("|")) {
		const parts = text.split("|").map((part) => readValue(part, constants))
		return { codes: parts.flatMap((part) => part.codes), read: parts.every((part) => part.read) }
	}
	return readOne(text, constants)
}

/** The code a refusal's or a `fail`'s argument states, when it is a literal or a named constant; null is not a code. */
export function argumentCode(value: string, constants: ReadonlyMap<string, string>): Value | null {
	const text = value.trim()
	const literal = literalCode(text)
	if (literal !== null) return { codes: [literal], read: true }
	if (CONSTANT_NAME.test(text)) return namedConstant(text, constants)
	return MAP_MEMBER.test(text) ? UNREAD : null
}
