import { describe, expect, it } from "bun:test"
import { lstatSync } from "node:fs"
import { join } from "node:path"
import {
	type Allowance,
	adrOf,
	type Collision,
	collisionsIn,
	describe as describeCollision,
	isAllowed,
} from "./adr-numbers"
import allowlist from "./adr-numbers.allowlist.json"

const ROOT = join(import.meta.dir, "..", "..")

/** Every tracked regular file of the repository, in git's order. */
const trackedFiles = Bun.spawnSync(["git", "ls-files", "-z"], { cwd: ROOT })
	.stdout.toString()
	.split("\0")
	.filter((path) => path.length > 0 && lstatSync(join(ROOT, path)).isFile())

describe("ADR numbers", () => {
	it("reads the directory and number of an ADR file, and nothing else", () => {
		expect(adrOf("apps/cli/docs/adr/0036-a.md")).toEqual({
			directory: "apps/cli/docs/adr",
			number: "0036",
		})
		expect(adrOf("docs/adr/0001-a.md")).toEqual({ directory: "docs/adr", number: "0001" })
		for (const path of [
			"apps/cli/docs/adr/README.md",
			"apps/cli/docs/adr/.gitkeep",
			"apps/cli/docs/design/0001-a.md",
			".agents/skills/x/docs/adr/0001-a.md",
			"apps/cli/node_modules/x/docs/adr/0001-a.md",
		]) {
			expect(adrOf(path)).toBeUndefined()
		}
	})

	it("reports two files of one directory that share a number, and not the same number in two directories", () => {
		const found = collisionsIn([
			"a/docs/adr/0007-x.md",
			"a/docs/adr/0007-y.md",
			"a/docs/adr/0008-z.md",
			"b/docs/adr/0007-x.md",
		])
		expect(found).toEqual([
			{
				directory: "a/docs/adr",
				number: "0007",
				files: ["a/docs/adr/0007-x.md", "a/docs/adr/0007-y.md"],
			},
		])
	})

	it("names the colliding files and the next free number", () => {
		const message = describeCollision({
			directory: "a/docs/adr",
			number: "0007",
			files: ["a/docs/adr/0007-x.md", "a/docs/adr/0007-y.md"],
		})
		expect(message).toContain("a/docs/adr/0007-x.md, a/docs/adr/0007-y.md")
		expect(message).toContain("next free number")
	})

	const found = collisionsIn(trackedFiles)

	it("gives every ADR in a docs/adr directory its own number, unless an allowance names the duplicate", () => {
		const unlisted = found.filter((collision) => !isAllowed(collision, allowlist))
		expect(unlisted.map(describeCollision)).toEqual([])
	})

	it("keeps each allowance tied to a duplicate that still exists, so a renumbered one leaves no stale entry", () => {
		const stale = (allowlist as Allowance[]).filter(
			(allowance) => !found.some((collision: Collision) => isAllowed(collision, [allowance])),
		)
		expect(stale.map((allowance) => `${allowance.directory} ${allowance.number}`)).toEqual([])
	})

	it("gives every allowance a one-line reason", () => {
		for (const allowance of allowlist as Allowance[]) {
			expect(allowance.reason.trim().length).toBeGreaterThan(0)
			expect(allowance.reason.includes("\n")).toBe(false)
		}
	})
})
