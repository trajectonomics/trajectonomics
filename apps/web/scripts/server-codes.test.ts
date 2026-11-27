import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { SERVER_CODES } from "../src/lib/edit/failure"

/** Codes the CLI prints too, so the Dashboard cannot own them: `isCliError` tells a taken name by its path. */
const SHARED: ReadonlySet<string> = new Set(["internal", "scenario_name_taken"])

/** A code as a source writes one: an error's `code: "..."`, or a refusal's `refused(<status>, "...")`. */
const LITERALS = [
	/\bcode:\s*"([a-z][a-z0-9_]*)"/g,
	/\brefus(?:al|ed)\(\s*\d{1,3},\s*"([a-z][a-z0-9_]*)"/g,
]

/** The error-code literals one source writes. */
function codesIn(text: string): string[] {
	return LITERALS.flatMap((pattern) =>
		[...text.matchAll(pattern)].flatMap((match) => (match[1] === undefined ? [] : [match[1]])),
	)
}

/** Every source file of the Dashboard outside its tests. */
function sources(): string[] {
	const roots = [join(import.meta.dir, "..", "src"), import.meta.dir]
	return roots.flatMap((root) =>
		[...new Bun.Glob("**/*.{ts,svelte}").scanSync({ cwd: root })]
			.filter((file) => !/\.test(-support)?\.ts$/.test(file))
			.map((file) => join(root, file)),
	)
}

/** Every error code the Dashboard's own sources write. */
async function ownCodes(): Promise<string[]> {
	const texts = await Promise.all(sources().map((file) => Bun.file(file).text()))
	return [...new Set(texts.flatMap(codesIn))].sort()
}

describe("the Dashboard's own error codes", () => {
	test("are all in SERVER_CODES, so none is shown as the CLI's text", async () => {
		const codes = await ownCodes()
		expect(codes).toContain("traj_unavailable")
		expect(codes.filter((code) => !SERVER_CODES.has(code) && !SHARED.has(code))).toEqual([])
	})
})
