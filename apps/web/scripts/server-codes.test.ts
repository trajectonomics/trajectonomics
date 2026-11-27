import { describe, expect, test } from "bun:test"
import { join, relative } from "node:path"
import { SERVER_CODES } from "../src/lib/edit/failure"

/** Codes the CLI prints too, so the Dashboard cannot own them: `isCliError` tells a taken name by its path. */
const SHARED: ReadonlySet<string> = new Set(["internal", "scenario_name_taken"])

/** Files whose `code` comes from a variable on purpose, with why. Every other `code` must be a plain string literal. */
const NOT_A_CODE: Readonly<Record<string, string>> = {
	"src/lib/snapshot/chance-params.ts":
		'`fail(code)` passes a typed code through, and each call site is `fail("…")`',
	"src/lib/view/health/read-audit.ts":
		"it reads the code a Read already states, and passes it on, writing none",
	"scripts/serve-edit-answer.ts":
		'`refused(status, code, …)` passes a typed code through, and each call site is `refused(<status>, "…")`',
}

/** A code as a source writes one: an error's `code: "..."`, a refusal's `refused(<status>, "...")`, or a `fail("...")`. */
const LITERALS = [
	/\bcode:\s*"([a-z][a-z0-9_]*)"/g,
	/\brefus(?:al|ed)\(\s*\d{1,3},\s*"([a-z][a-z0-9_]*)"/g,
	/\bfail\(\s*"([a-z][a-z0-9_]*)"/g,
]

/** A `code` field: the value it states, and the separator after it (a type's `;`, or an object's `,` or `}`). */
const CODE_FIELD = /(?:\{\s*|\n\s*)(?:readonly\s+)?code:\s*([^,;}\n)]+)([,;}])?/g

/** A `code` taken from a variable rather than written, as `{ code, message }`. */
const CODE_SHORTHAND = /(?:\{\s*|\n\s*)(?:readonly\s+)?code\s*,/g

/** A constant that holds a code: `CONTRACT_MISMATCH = "contract_mismatch"`. */
const CONSTANT = /\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*"([a-z][a-z0-9_]*)"/g

interface Source {
	readonly file: string
	readonly text: string
}

/** One source's codes, and the `code` fields it states no plain string literal for. */
interface Scan {
	readonly codes: string[]
	readonly hidden: string[]
}

/** The captures of the first group of every pattern match, in the text. */
function captures(text: string, pattern: RegExp): string[] {
	return [...text.matchAll(pattern)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
}

/** The named constant each upper-case `const` of a source holds, when its value is a lower_snake code. */
function constantsOf(text: string): Map<string, string> {
	const pairs = [...text.matchAll(CONSTANT)].flatMap((match): [string, string][] =>
		match[1] === undefined || match[2] === undefined ? [] : [[match[1], match[2]]],
	)
	return new Map(pairs)
}

/** Whether a `code` value is a type or a chart flag, neither of which is an error code. */
function isTypeOrFlag(value: string): boolean {
	return (
		/^(?:string|number|boolean|unknown)(?:\s*\|.*)?$/.test(value) ||
		value === "true" ||
		value === "false"
	)
}

/** The code a named constant holds when a `code` field states one, or undefined for a literal, type, flag or read. */
function namedCode(
	value: string,
	terminator: string | undefined,
	constants: ReadonlyMap<string, string>,
): string | undefined {
	if (value.startsWith('"') || terminator === ";" || isTypeOrFlag(value)) return undefined
	return constants.get(value)
}

/** Whether a `code` field states a value the scan cannot read as a plain code: not a literal, a type, or a dotted read. */
function hidesCode(value: string, terminator: string | undefined): boolean {
	return (
		!value.startsWith('"') && terminator !== ";" && !isTypeOrFlag(value) && !value.includes(".")
	)
}

/** Every named code of every source, so a constant a file imports still reads as the code it holds. */
function allConstants(sources: readonly Source[]): Map<string, string> {
	const merged = new Map<string, string>()
	for (const source of sources) {
		for (const [name, code] of constantsOf(source.text)) merged.set(name, code)
	}
	return merged
}

/** One source's codes, and the `code` fields that hide a value the scan cannot read. */
function scan(source: Source, constants: ReadonlyMap<string, string>): Scan {
	const codes = LITERALS.flatMap((pattern) => captures(source.text, pattern))
	const hidden: string[] = []
	for (const match of source.text.matchAll(CODE_FIELD)) {
		const value = match[1]?.trim() ?? ""
		const named = namedCode(value, match[2], constants)
		if (named !== undefined) codes.push(named)
		else if (!(source.file in NOT_A_CODE) && hidesCode(value, match[2])) hidden.push(source.file)
	}
	if (source.text.match(CODE_SHORTHAND) !== null && !(source.file in NOT_A_CODE)) {
		hidden.push(source.file)
	}
	return { codes, hidden }
}

/** Every source file of the Dashboard outside its tests, by its path from `apps/web`. */
async function sources(): Promise<Source[]> {
	const root = join(import.meta.dir, "..")
	const paths = [join(root, "src"), import.meta.dir].flatMap((dir) =>
		[...new Bun.Glob("**/*.{ts,svelte}").scanSync({ cwd: dir })]
			.filter((file) => !/\.test(-support)?\.ts$/.test(file))
			.map((file) => join(dir, file)),
	)
	return Promise.all(
		paths.map(async (path) => ({ file: relative(root, path), text: await Bun.file(path).text() })),
	)
}

describe("the Dashboard's own error codes", () => {
	test("are all in SERVER_CODES, so none is shown as the CLI's text", async () => {
		const all = await sources()
		const constants = allConstants(all)
		const scans = all.map((source) => scan(source, constants))
		const codes = new Set(scans.flatMap((one) => one.codes))
		// The constant pattern reads a code no `code:` names, such as the client's own comparison with the server.
		expect(constants.get("EDIT_RUNNING")).toBe("edit_running")
		// The five a scan of `code:` literals alone cannot see: a constant, and four `fail("…")` calls.
		for (const code of [
			"contract_mismatch",
			"chance_needs_paths_and_seed",
			"invalid_return_model",
			"invalid_paths",
			"invalid_seed",
		]) {
			expect(codes).toContain(code)
		}
		expect(codes).toContain("traj_unavailable")
		expect([...codes].filter((code) => !SERVER_CODES.has(code) && !SHARED.has(code))).toEqual([])
	})

	test("each `code` is a plain string literal, unless its file says why not", async () => {
		const all = await sources()
		const constants = allConstants(all)
		expect(all.flatMap((source) => scan(source, constants).hidden)).toEqual([])
	})
})
