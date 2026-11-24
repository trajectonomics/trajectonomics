import { describe, expect, it } from "bun:test"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { makeTempDir } from "./temp-dir"
import { capture } from "./test-support"

async function planWith(notes?: string): Promise<{ home: string; hash: string }> {
	const home = scenarioHome()
	const created = rowOf(resultOf(await applyScenario(home, "base", SCENARIO_DOCUMENT)))
	if (notes !== undefined)
		expect((await scenario(home, ["notes", "base", "--text", notes])).code).toBe(0)
	return { home, hash: created.contentHash }
}

describe("scenario notes (cli ADR-0071)", () => {
	it("keeps notes outside the document: the hash stays, the version moves", async () => {
		const { home, hash } = await planWith()
		const res = await scenario(home, ["notes", "base", "--text", "Retire at 55."])
		expect(res.code).toBe(0)
		const data = resultOf(res)
		expect(data).toMatchObject({ dryRun: false, status: "updated" })
		expect(data.scenario).toMatchObject({ notes: "Retire at 55.", contentHash: hash, version: 2 })
		expect(data.scenario).not.toHaveProperty("document")
		const shown = resultOf(await scenario(home, ["show", "base"])).scenario
		expect(shown).toMatchObject({ notes: "Retire at 55.", contentHash: hash })
		expect(shown.document).toEqual(SCENARIO_DOCUMENT)
		const listed = resultOf(await scenario(home, ["list"])).scenarios[0]
		expect(listed).toMatchObject({ hasNotes: true, contentHash: hash })
		expect(listed).not.toHaveProperty("notes")
	})

	it("is true already when the notes are the same", async () => {
		const { home } = await planWith("same")
		const res = await scenario(home, ["notes", "base", "--text", "same"])
		expect(resultOf(res).status).toBe("unchanged")
		expect(resultOf(res).scenario.version).toBe(2)
	})

	it("clears the notes, and clearing none is true already", async () => {
		const { home } = await planWith("gone soon")
		const cleared = resultOf(await scenario(home, ["notes", "base", "--clear"]))
		expect(cleared).toMatchObject({ status: "updated", scenario: { notes: null } })
		expect(resultOf(await scenario(home, ["list"])).scenarios[0].hasNotes).toBe(false)
		const again = resultOf(await scenario(home, ["notes", "base", "--clear"]))
		expect(again.status).toBe("unchanged")
	})

	it("reads the notes from a file and from stdin, and keeps newlines and tabs", async () => {
		const { home } = await planWith()
		const file = join(makeTempDir("traj-notes-"), "notes.txt")
		writeFileSync(file, "line one\n\tline two\n")
		await scenario(home, ["notes", "base", "--file", file])
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.notes).toBe(
			"line one\n\tline two\n",
		)
		await scenario(home, ["notes", "base", "--file", "-"], "from stdin ก")
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.notes).toBe("from stdin ก")
	})

	it("reads a Windows line ending as a newline", async () => {
		const { home } = await planWith()
		await scenario(home, ["notes", "base", "--file", "-"], "a\r\nb")
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.notes).toBe("a\nb")
	})

	it("strips a leading byte order mark", async () => {
		const { home } = await planWith()
		await scenario(home, ["notes", "base", "--file", "-"], "\uFEFFwith a BOM")
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.notes).toBe("with a BOM")
		const file = join(makeTempDir("traj-notes-"), "bom.txt")
		writeFileSync(
			file,
			Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("from a file")]),
		)
		await scenario(home, ["notes", "base", "--file", file])
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.notes).toBe("from a file")
	})

	it("refuses text that is not UTF-8, from a file and from stdin, and stores nothing", async () => {
		const { home } = await planWith("kept")
		// "ภาษา" in TIS-620: the bytes are not valid UTF-8.
		const tis620 = Buffer.from([0xc0, 0xd2, 0xc9, 0xd2])
		const file = join(makeTempDir("traj-notes-"), "tis620.txt")
		writeFileSync(file, tis620)
		const fromFile = await scenario(home, ["notes", "base", "--file", file])
		expect(fromFile.code).toBe(2)
		expect(errorOf(fromFile)).toMatchObject({
			code: "invalid_input",
			path: "--file",
			hint: expect.stringContaining("UTF-8"),
		})
		expect(errorOf(fromFile).message).toContain("is not valid UTF-8 text")
		const bad = await capture(
			["scenario", "notes", "base", "--file", "-", "--json"],
			{ TRAJ_HOME: home },
			undefined,
			"bad \uFFFD byte",
		)
		expect(errorOf(bad).message).toContain("is not valid UTF-8 text")
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.notes).toBe("kept")
	})

	it("names the flag in the path and not a different one in the message", async () => {
		const { home } = await planWith()
		const res = await scenario(home, ["notes", "base", "--text", "a", "--clear"])
		const error = errorOf(res)
		expect(error.path).toBe("--clear")
		expect(error.message).not.toMatch(/^text:/i)
		const none = errorOf(await scenario(home, ["notes", "base"]))
		expect(none.path).toBe("--text")
		expect(none.message).not.toMatch(/^clear:/i)
	})

	it("keeps notes through an apply of a changed document", async () => {
		const { home } = await planWith("keep me")
		const edited = { ...SCENARIO_DOCUMENT, economy: { inflation: 100 } }
		expect((await applyScenario(home, "base", edited)).code).toBe(0)
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.notes).toBe("keep me")
	})

	it("refuses empty notes, control characters and more than 10,000 characters", async () => {
		const { home } = await planWith()
		const refusals = ["", "bell\u0007", "nul\u0000", "lone\rcarriage", "x".repeat(10_001)]
		for (const text of refusals) {
			const res = await scenario(home, ["notes", "base", "--text", text])
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--text" })
		}
		const full = await scenario(home, ["notes", "base", "--text", "ก".repeat(10_000)])
		expect(full.code).toBe(0)
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.version).toBe(2)
	})

	it("names exactly one of --text, --file and --clear", async () => {
		const { home } = await planWith()
		for (const argv of [
			["notes", "base"],
			["notes", "base", "--text", "a", "--clear"],
		]) {
			const res = await scenario(home, argv)
			expect(res.code).toBe(2)
			expect(errorOf(res).code).toBe("invalid_input")
		}
		const missing = await scenario(home, ["notes", "base", "--file", "/nonexistent/notes.txt"])
		expect(errorOf(missing)).toMatchObject({ code: "invalid_input", path: "--file" })
	})

	it("rolls back under --dry-run", async () => {
		const { home } = await planWith()
		const res = await scenario(home, ["notes", "base", "--text", "draft", "--dry-run"])
		expect(resultOf(res)).toMatchObject({ dryRun: true, scenario: { notes: "draft" } })
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.notes).toBeNull()
	})

	it("is copied by fork, and not by fork --no-notes", async () => {
		const { home } = await planWith("assumes a condo")
		await scenario(home, ["fork", "base", "copy"])
		await scenario(home, ["fork", "base", "bare", "--no-notes"])
		expect(resultOf(await scenario(home, ["show", "copy"])).scenario.notes).toBe("assumes a condo")
		expect(resultOf(await scenario(home, ["show", "bare"])).scenario.notes).toBeNull()
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.notes).toBe("assumes a condo")
	})

	it("reports a plan that does not exist as not_found", async () => {
		const res = await scenario(scenarioHome(), ["notes", "nope", "--clear"])
		expect(res.code).toBe(4)
	})
})
