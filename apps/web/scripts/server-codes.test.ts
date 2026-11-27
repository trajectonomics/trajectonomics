import { describe, expect, test } from "bun:test"
import { join, relative } from "node:path"
import { SERVER_CODES } from "../src/lib/edit/failure"
import { allConstants, type Source, scan } from "./server-codes"

/** Codes the CLI prints too, so the Dashboard cannot own them: `isCliError` tells a taken name by its path. */
const SHARED: ReadonlySet<string> = new Set(["internal", "scenario_name_taken"])

/** One expression the scan cannot read on purpose, why, and how many times its file reads exactly it. */
interface Allowed {
	readonly file: string
	readonly text: string
	/** The occurrences in the file: 1 unless it writes the expression more than once. */
	readonly count?: number
	readonly why: string
}

const NOT_A_CODE: readonly Allowed[] = [
	{
		file: "src/lib/edit/guard.ts",
		text: "code",
		why: "`refusal(status, code, …)` builds `{ status, code, message }`, and each call site states one",
	},
	{
		file: "src/lib/snapshot/chance-params.ts",
		text: "code",
		why: '`fail(code)` builds `{ code, message }`, and each call site is `fail("…")`',
	},
	{
		file: "src/lib/view/health/read-audit.ts",
		text: "code",
		why: "it passes the code a Read already states straight through",
	},
	{
		file: "src/lib/view/net-worth/history.ts",
		text: "read.data.totalsError?.code ?? null",
		why: "it passes the code a Read already states, or null when it states none",
	},
	{
		file: "src/lib/view/net-worth/history.ts",
		text: "read.error.code",
		why: "it passes the code a failed Read already states",
	},
	{
		file: "scripts/serve-edit-answer.ts",
		text: "code",
		why: "`refused(status, code, …)` builds `{ code, … }`, and each call site states one",
	},
	{
		file: "scripts/serve-edit.ts",
		text: "refusal.code",
		count: 2,
		why: "it passes the guard's own `Refusal.code` through to `refused`, once per answer path",
	},
	{
		file: "src/lib/contract/read.ts",
		text: "z.string()",
		why: "the `errorBody` schema reads any code the CLI prints; it writes none",
	},
	{
		file: "scripts/spawn.ts",
		text: "await proc.exited",
		why: "a process's exit status, not an error code",
	},
]

/** The allow-list as a map of `file: text` to its occurrence count, for the scan. */
const ALLOWED: Map<string, number> = new Map(
	NOT_A_CODE.map((one) => [`${one.file}: ${one.text}`, one.count ?? 1]),
)

/** How many times each unreadable expression occurs, so a new occurrence and a stale entry both show. */
function occurrences(hidden: readonly string[]): Map<string, number> {
	const counts = new Map<string, number>()
	for (const key of hidden) counts.set(key, (counts.get(key) ?? 0) + 1)
	return counts
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

/**
 * One source holding every way a source writes a code, and every way the scan reads one: a literal through `as const`,
 * `satisfies` and a template, a const, a const map by property and by key, a ternary over lines, a `??`, a named union,
 * and a multi-line `code:` union. The calls with a named code, a call's argument and the shorthand are unreadable.
 */
const FIXTURE: Source = {
	file: "fixture.ts",
	text: `
const NEW_CODE = "fixture_constant"
const Fresh = "fixture_named"
const CODES = { fresh: "fixture_mapped" }
const codes = { fresh: "fixture_lower" }
const held: { busy?: boolean; code?: string } = {}
const b = true
const zzCode: string = zzPick()
const one = { exitCode: 1, code: "fixture_as" as const }
const two = { exitCode: 1, code: "fixture_satisfies" satisfies string }
const three = { code: \`fixture_template\` }
const four = { code: zzPick("fixture_argument") }
const five = { code: CODES["fresh"] }
const six = { code: Fresh }
const seven = { code: codes.fresh }
const eight = {
	code: held?.busy
		? "fixture_wrapped_when"
		: "fixture_wrapped_otherwise",
}
const nine = { code: held.code ?? "fixture_coalesced" }
const ten = { code: NEW_CODE }
const eleven = { exitCode: 1, code }
const twelve = refused(400, NEW_CODE, "A refusal.")
const thirteen = refused(400, zzCode, "A refusal.")
const fourteen = refused(400, b ? "fixture_refused_when" : "fixture_refused_otherwise", "A refusal.")
const fifteen = fail(zzCode)
const sixteen = fail("fixture_failed")
const seventeen = refused(codeOf(400), "fixture_status_call", "A refusal.")
const eighteen = helper.refused(400, "fixture_property", "A refusal.")
const nineteen = this.fail("fixture_this")
type FreshCode = | "fixture_named_union"
type Named = { code: FreshCode }
type Multi = {
	code:
		| "fixture_type_when"
		| "fixture_type_otherwise"
}
`,
}

describe("the Dashboard's own error codes", () => {
	test("are all in SERVER_CODES, so none is shown as the CLI's text", async () => {
		const all = await sources()
		const { codes } = scan(all)
		const read = new Set(codes)
		expect(allConstants(all).get("EDIT_RUNNING")).toBe("edit_running")
		expect(read.size).toBe(41)
		for (const code of SERVER_CODES) expect(read).toContain(code)
		expect([...read].filter((code) => !SERVER_CODES.has(code) && !SHARED.has(code))).toEqual([])
	})

	test("each `code` is readable once for each occurrence the allow-list states", async () => {
		expect(occurrences(scan(await sources()).hidden)).toEqual(ALLOWED)
	})

	test("counts every occurrence, so a new one fails and a stale entry fails", () => {
		const once: Source = { file: "once.ts", text: "const a = { code }" }
		const twice: Source = { file: "twice.ts", text: "const a = { code }\nconst b = { code }" }
		expect(occurrences(scan([once]).hidden)).toEqual(new Map([["once.ts: code", 1]]))
		expect(occurrences(scan([twice]).hidden)).toEqual(new Map([["twice.ts: code", 2]]))
		// A new occurrence of an allowed expression no longer matches the count its entry states.
		expect(occurrences(scan([twice]).hidden)).not.toEqual(new Map([["twice.ts: code", 1]]))
		// A stale entry states occurrences the scan never found.
		expect(occurrences(scan([once]).hidden)).not.toEqual(new Map([["once.ts: gone", 1]]))
	})

	test("reads a code in every way a source writes one, and reports the expressions it cannot read", () => {
		const { codes, hidden } = scan([FIXTURE])
		for (const code of [
			"fixture_constant",
			"fixture_named",
			"fixture_mapped",
			"fixture_lower",
			"fixture_as",
			"fixture_satisfies",
			"fixture_template",
			"fixture_wrapped_when",
			"fixture_wrapped_otherwise",
			"fixture_coalesced",
			"fixture_refused_when",
			"fixture_refused_otherwise",
			"fixture_failed",
			"fixture_status_call",
			"fixture_property",
			"fixture_this",
			"fixture_type_when",
			"fixture_type_otherwise",
			"fixture_named_union",
		]) {
			expect(codes).toContain(code)
		}
		expect(hidden.sort()).toEqual(
			[
				'fixture.ts: zzPick("fixture_argument")',
				'fixture.ts: held.code ?? "fixture_coalesced"',
				"fixture.ts: code",
				"fixture.ts: zzCode",
				"fixture.ts: zzCode",
			].sort(),
		)
	})
})
