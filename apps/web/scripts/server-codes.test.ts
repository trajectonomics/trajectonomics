import { describe, expect, test } from "bun:test"
import { join, relative } from "node:path"
import { SERVER_CODES } from "../src/lib/edit/failure"
import { allConstants, type Source, scan } from "./server-codes"

/** Codes the CLI prints too, so the Dashboard cannot own them: `isCliError` tells a taken name by its path. */
const SHARED: ReadonlySet<string> = new Set(["internal", "scenario_name_taken"])

/**
 * The files whose `code` the scan cannot read on purpose, with why. A code the scan cannot read fails the guard, so a
 * new file that passes a code through must say so here.
 */
const NOT_A_CODE: Readonly<Record<string, string>> = {
	"src/lib/edit/guard.ts":
		'`refusal(status, code, …)` builds `{ status, code, message }`, and each call site is `refusal(<status>, "…")`',
	"src/lib/snapshot/chance-params.ts":
		'`fail(code)` passes a typed code through, and each call site is `fail("…")`',
	"src/lib/view/health/read-audit.ts":
		"it reads the code a Read already states, and passes it on, writing none",
	"scripts/serve-edit-answer.ts":
		'`refused(status, code, …)` passes a typed code through, and each call site is `refused(<status>, "…")`',
}

/** The allow-list as a set, for the scan. */
const ALLOWED: ReadonlySet<string> = new Set(Object.keys(NOT_A_CODE))

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
 * One source holding a fake code in each way the old scan missed, and in each way it read: a constant inside an object
 * and a refusal, a `fail`, the shorthand, a constant map's member, a ternary, a refusal with a named status, and a type
 * union. The two it cannot read must be reported, and nothing else.
 */
const FIXTURE: Source = {
	file: "fixture.ts",
	text: `
const NEW_CODE = "fixture_constant"
const CODES = { fresh: "fixture_mapped" }
const one = { exitCode: 1, code: NEW_CODE }
const two = refused(400, NEW_CODE, "A refusal.")
const three = fail(NEW_CODE)
const four = { exitCode: 1, code }
const five = { code: CODES.fresh }
const six = { code: answered ? "fixture_when" : "fixture_otherwise" }
const seven = refused(status, "fixture_refused")
const eight = fail("fixture_failed")
type Kind = { code: "fixture_first" | "fixture_second" }
`,
}

describe("the Dashboard's own error codes", () => {
	test("are all in SERVER_CODES, so none is shown as the CLI's text", async () => {
		const all = await sources()
		const constants = allConstants(all)
		const scans = all.map((source) => scan(source, constants, ALLOWED))
		const codes = new Set(scans.flatMap((one) => one.codes))
		// The constant map is checked on its own: `EDIT_RUNNING` is the client's own comparison, which no `code:` names.
		expect(constants.get("EDIT_RUNNING")).toBe("edit_running")
		// The five a scan of `code:` fields alone cannot see: a constant, and four `fail("…")` calls.
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
		expect(all.flatMap((source) => scan(source, constants, ALLOWED).hidden)).toEqual([])
	})

	test("reads a code in every way a source writes one, and reports the two it cannot read", () => {
		const { codes, hidden } = scan(FIXTURE, allConstants([FIXTURE]), new Set())
		for (const code of [
			"fixture_constant",
			"fixture_when",
			"fixture_otherwise",
			"fixture_refused",
			"fixture_failed",
			"fixture_first",
			"fixture_second",
		]) {
			expect(codes).toContain(code)
		}
		expect(hidden).toHaveLength(2)
		expect(hidden.join("\n")).toContain("CODES.fresh")
		expect(hidden.join("\n")).toContain("code shorthand")
	})
})
