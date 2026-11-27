/**
 * The codes a Dashboard source writes, read from every way the page writes one: a `code` field, a refusal, a `fail`
 * call, a constant, a ternary's two arms and a type union. A value it cannot read is reported, so the guard fails on it
 * unless the file states why it passes one through. Pure: the test passes the sources and the allow-list in.
 */
import { argumentCode, readValue, type Source } from "./server-code-values"

export { allConstants, type Source } from "./server-code-values"

/** One source's codes, and the values it states no plain code for, each as `file: value`. */
export interface Scan {
	readonly codes: string[]
	readonly hidden: string[]
}

/** A `code` field or shorthand, after `{`, a comma or a line start; with its value when it states one. */
const CODE_SITE = /(?:\{\s*|,\s*|\n\s*)(?:readonly\s+)?code(?:\s*:\s*([^,;}\n]+?))?\s*(?=[,;}\n])/g

/** A refusal's or a `fail` call's code argument, which may be a literal or a named constant. */
const REFUSAL = /\brefus(?:al|ed)\(\s*[^,)]*,\s*([^,)]+)/g
const FAIL = /\bfail\(\s*([^,)]+)/g

/** Each `code` site's codes, and the value at a site the scan cannot read. */
function siteCodes(
	source: Source,
	constants: ReadonlyMap<string, string>,
	codes: string[],
	hidden: string[],
): void {
	for (const match of source.text.matchAll(CODE_SITE)) {
		const value = match[1]?.trim()
		if (value === undefined) {
			hidden.push(`${source.file}: a code shorthand`)
			continue
		}
		const read = readValue(value, constants)
		codes.push(...read.codes)
		if (!read.read) hidden.push(`${source.file}: ${value}`)
	}
}

/** One pattern's code arguments, each a literal or a named constant. */
function patternCodes(
	text: string,
	pattern: RegExp,
	file: string,
	constants: ReadonlyMap<string, string>,
	codes: string[],
	hidden: string[],
): void {
	for (const match of text.matchAll(pattern)) {
		const argument = match[1]
		if (argument === undefined) continue
		const read = argumentCode(argument, constants)
		if (read === null) continue
		codes.push(...read.codes)
		if (!read.read) hidden.push(`${file}: ${argument.trim()}`)
	}
}

/** Each refusal's and `fail`'s code argument, and the one the scan cannot read. */
function callCodes(
	source: Source,
	constants: ReadonlyMap<string, string>,
	codes: string[],
	hidden: string[],
): void {
	for (const pattern of [REFUSAL, FAIL]) {
		patternCodes(source.text, pattern, source.file, constants, codes, hidden)
	}
}

/** One source's codes, and the `code` values it hides, unless the file says why it passes one through. */
export function scan(
	source: Source,
	constants: ReadonlyMap<string, string>,
	allowed: ReadonlySet<string>,
): Scan {
	const codes: string[] = []
	const hidden: string[] = []
	siteCodes(source, constants, codes, hidden)
	callCodes(source, constants, codes, hidden)
	return { codes, hidden: allowed.has(source.file) ? [] : hidden }
}
