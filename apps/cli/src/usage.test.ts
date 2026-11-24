import { describe, expect, it } from "bun:test"
import { root } from "./commands"
import { capture } from "./test-support"
import { fixtureRoot } from "./test-tree"
import { leavesOf } from "./tree"

const demo = (argv: string[]) => capture(argv, {}, fixtureRoot)

/** The commands this release does not ship yet, each with the note its page prints (ADR-0034). */
const UNRELEASED: readonly (readonly string[])[] = [
	["projection", "allowances"],
	["projection", "chance"],
	["projection", "path"],
	["scenario", "list"],
	["scenario", "show"],
	["scenario", "tax"],
	["scenario", "apply"],
	["scenario", "household"],
	["projection", "run"],
	["fi"],
]

describe("usage", () => {
	it("lists groups next to commands at the root", async () => {
		const res = await demo([])
		expect(res.out).toContain("demo")
		expect(res.out).toContain("A fixture group")
	})

	it("explains a leaf from its schema for --help and for `help <path>`", async () => {
		for (const argv of [
			["demo", "echo", "--help"],
			["help", "demo", "echo"],
		]) {
			const res = await demo(argv)
			expect(res.code).toBe(0)
			expect(res.out).toContain("Usage: traj demo echo [options] <word>")
			expect(res.out).toContain("--times <number>")
			expect(res.out).toContain("How many times")
			expect(res.out).toContain("--tag <string>")
			expect(res.out).toContain("repeatable")
			expect(res.out).toContain("--from-date <string>")
			expect(res.out).toContain("--upper")
			expect(res.out).toContain("traj demo echo hi --upper")
		}
	})

	it("prints a group's usage for `help <group>` and `<group> --help`", async () => {
		for (const argv of [
			["help", "demo"],
			["demo", "--help"],
		]) {
			const res = await demo(argv)
			expect(res.out).toContain("Usage: traj demo <command>")
		}
	})

	it("rejects `help` for a path that does not exist", async () => {
		const res = await demo(["help", "demo", "nope", "--json"])
		expect(res.code).toBe(2)
		expect(JSON.parse(res.err).error.code).toBe("unknown_command")
	})

	it("answers --help in JSON when asked", async () => {
		const res = await demo(["demo", "echo", "--help", "--json"])
		expect(JSON.parse(res.out)).toContain("Usage: traj demo echo")
	})
})

describe("the root usage", () => {
	it("states every exit class and exactly which codes are retryable", async () => {
		for (const argv of [["help"], ["--help"]]) {
			const res = await capture(argv)
			expect(res.code).toBe(0)
			expect(res.out).toContain("Exit codes:")
			expect(res.out).toContain("2  invalid input")
			expect(res.out).toContain("5  conflict")
			expect(res.out).toContain("Retryable codes: database_busy, disk_full")
			expect(res.out).toContain("Every other failure is permanent.")
		}
	})
})

describe("a release note on a definition", () => {
	// The fixture's notes are synthetic, so these tests do not depend on what the real commands
	// say; the release-docs check reads the real tree's notes separately.
	const GROUP_NOTE = "Fixture feature ships in 9.9.9."
	const LEAF_NOTE = "Echo ships in 9.9.9."

	it("prints the note under the summary on the group and its leaf, in human and JSON", async () => {
		for (const argv of [
			["help", "demo"],
			["demo", "--help"],
		]) {
			expect((await demo(argv)).out).toContain(GROUP_NOTE)
		}
		for (const argv of [
			["help", "demo", "echo"],
			["demo", "echo", "--help"],
		]) {
			expect((await demo(argv)).out).toContain(LEAF_NOTE)
		}

		const group = (await demo(["help", "demo"])).out
		expect(group).toContain("A fixture group\n\nFixture feature ships in 9.9.9.\n\nCommands:")
		const leaf = (await demo(["help", "demo", "echo"])).out
		expect(leaf).toContain("Echo a word back\n\nEcho ships in 9.9.9.\n\nOptions:")
		const json = JSON.parse((await demo(["help", "demo", "echo", "--json"])).out)
		expect(json).toContain(LEAF_NOTE)
	})

	it("states the release in the form ships in X.Y.Z", async () => {
		for (const argv of [
			["help", "demo"],
			["help", "demo", "echo"],
		]) {
			expect((await demo(argv)).out).toMatch(/\bships in \d+\.\d+\.\d+\b/)
		}
	})

	it("leaves a page without a note exactly as it was", async () => {
		// Only the noted fixture pages carry a note: every other page is unchanged.
		for (const argv of [["help"], ["help", "tx"], ["help", "help"], ["help", "demo", "doc"]]) {
			expect((await demo(argv)).out).not.toMatch(/\bships in \d/)
		}
		// The real tree notes only the commands this release does not ship yet (ADR-0034): a page
		// that names an unreleased command carries its note, and no other page does.
		for (const { path } of leavesOf(root)) {
			const out = (await capture(["help", ...path])).out
			if (UNRELEASED.some((words) => words.join(" ") === path.join(" "))) {
				expect(out).toMatch(/\bships in \d+\.\d+\.\d+\b/)
			} else {
				expect(out).not.toMatch(/\bships in \d/)
			}
		}
	})

	it("does not expose the note in the machine contract", async () => {
		const detail = JSON.parse((await demo(["schema", "demo", "echo", "--json"])).out)
		expect(detail).not.toHaveProperty("note")
		const listing = JSON.parse((await demo(["schema", "demo", "--json"])).out)
		for (const row of listing.commands) {
			expect(Object.keys(row)).toEqual(["name", "summary"])
		}
	})
})

describe("document-form usage", () => {
	it("shows a document-form leaf's positionals in the alternate line", async () => {
		const usages = (await capture(["help", "tx", "amend"])).out
			.split("\n")
			.filter((line) => line.startsWith("Usage:"))
		expect(usages).toHaveLength(2)
		expect(usages[1]).toBe(
			"Usage: traj tx amend <id> --postings <file|-> [--void-date <string>] [--dry-run]",
		)
	})

	it("prints one usage line for a document-only leaf", async () => {
		const res = await demo(["help", "demo", "doc"])
		expect(res.code).toBe(0)
		const usages = res.out.split("\n").filter((line) => line.startsWith("Usage:"))
		expect(usages).toEqual(["Usage: traj demo doc <name> --file <file|-> [--dry-run]"])
		expect(res.out).toContain("--file <string>")
	})

	it("keeps both usage lines for a leaf with a flag form and a document form", async () => {
		const usages = (await capture(["help", "tx", "add"])).out
			.split("\n")
			.filter((line) => line.startsWith("Usage:"))
		expect(usages).toHaveLength(2)
	})
})
