import { describe, expect, it } from "bun:test"
import { lstatSync, readdirSync } from "node:fs"
import { join } from "node:path"
import lock from "../../skills-lock.json"

const ROOT = join(import.meta.dir, "..", "..")
const notices = await Bun.file(join(ROOT, "THIRD_PARTY_NOTICES.md")).text()

const skills = Object.entries(lock.skills as Record<string, { source: string }>)
const sources = [...new Set(skills.map(([, skill]) => skill.source))].sort()

/** The text of one source's section: from its `## owner/repo` heading to the next heading. */
function sectionOf(source: string): string {
	const start = notices.indexOf(`\n## ${source}\n`)
	if (start < 0) return ""
	const next = notices.indexOf("\n## ", start + 1)
	return notices.slice(start, next < 0 ? undefined : next)
}

describe("third-party notices", () => {
	it("has a section for every source in skills-lock.json", () => {
		expect(sources.filter((source) => sectionOf(source) === "")).toEqual([])
	})

	it("carries each source's copyright line and MIT permission notice", () => {
		for (const source of sources) {
			const section = sectionOf(source)
			expect(section, `the ${source} section`).not.toBe("")
			expect(section).toMatch(/^Copyright \(c\) \d{4} .+$/m)
			expect(section).toContain("Permission is hereby granted, free of charge")
			expect(section).toContain(
				"The above copyright notice and this permission notice shall be included",
			)
		}
	})

	it("names the copy of every locked skill under its source's section", () => {
		const missing = skills.filter(
			([name, skill]) => !sectionOf(skill.source).includes(`\`.agents/skills/${name}/\``),
		)
		expect(missing.map(([name]) => name)).toEqual([])
	})

	it("locks every vendored skill, so a copy cannot arrive without a notice", () => {
		const vendored = readdirSync(join(ROOT, ".agents", "skills")).filter(
			(name) => !lstatSync(join(ROOT, ".agents", "skills", name)).isSymbolicLink(),
		)
		expect(vendored.filter((name) => !skills.some(([locked]) => locked === name))).toEqual([])
	})
})
