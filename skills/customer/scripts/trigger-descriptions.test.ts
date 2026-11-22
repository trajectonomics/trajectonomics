import { describe, expect, it } from "bun:test"
import {
	matchesVerdict,
	pickedSkill,
	readListedSkills,
	readTriggerQueries,
	triggerPrompt,
} from "./trigger-queries"

/**
 * A Skill's description is its whole trigger surface, and a real trigger is measured only by a model
 * (`measure-triggers.ts`, never part of `check`). What can be pinned offline is the boundary: no
 * description claims the job of a query that must stay silent, and the fixture matches the set.
 */
const skills = readListedSkills()
const queries = readTriggerQueries()

/** The words that would claim a neighbouring job: each names a must-stay-silent query's own task. */
const NEIGHBOUR_JOBS = [
	/spreadsheet/i,
	/\bbudget/i,
	/\btax (return|form)s?\b/i,
	/\bfil(e|es|ing)\b/i,
	/\bstocks?\b|\binvest/i,
	/\bsql\b|\bdatabase|\bpostgres/i,
	/\bpdf\b|\binvoice/i,
	/\bconver(t|sion)\b|\bexchange rate/i,
	/\bbookkeeping\b/i,
	/\bnode\.?js\b/i,
]

/** What a description claims: its sentences, minus the ones that say what the Skill is not. */
function claims(description: string): string {
	return description
		.split(/(?<=\.)\s+/)
		.filter((sentence) => !/\b(no|not|never|neither|nor)\b/i.test(sentence))
		.join(" ")
}

describe("the fixed trigger queries", () => {
	it("are the Factory's twenty plus two tax estimates: twelve that fire and ten that stay silent", () => {
		expect(queries).toHaveLength(22)
		expect(queries.filter((query) => query.expect === "trigger")).toHaveLength(12)
		expect(queries.filter((query) => query.expect === "silent")).toHaveLength(10)
		expect(new Set(queries.map((query) => query.q)).size).toBe(22)
	})

	it("name only published Skills, and none for a silent query", () => {
		const names = skills.map((skill) => skill.name)
		for (const query of queries) {
			for (const name of query.skills) expect(names).toContain(name)
			if (query.expect === "silent") expect(query.skills).toEqual([])
		}
	})

	it("record that removal is traj-maintain's job and that no Skill claims it yet", () => {
		const removal = queries.find((query) => query.q === "remove traj and the data it stored")
		expect(removal?.unclaimed).toContain("traj-maintain")
		expect(removal?.unclaimed).toContain("#135")
		for (const query of queries.filter((candidate) => candidate.expect === "trigger")) {
			if (query !== removal) expect(query.skills.length).toBeGreaterThan(0)
		}
	})
})

describe("the five descriptions", () => {
	it("stay within the 1024 characters the skills specification allows", () => {
		expect(skills).toHaveLength(5)
		for (const skill of skills) {
			expect(skill.description.length).toBeGreaterThan(0)
			expect(skill.description.length).toBeLessThanOrEqual(1024)
		}
	})

	it("claim no neighbouring job: a spreadsheet, a tax return, a stock, a database, a PDF", () => {
		for (const skill of skills) {
			for (const job of NEIGHBOUR_JOBS) expect(claims(skill.description)).not.toMatch(job)
		}
	})

	it("claim no removal until traj-maintain exists to own it", () => {
		for (const skill of skills) {
			expect(skill.description).not.toMatch(/\b(remove|removal|uninstall|delete)/i)
		}
	})

	it("have traj say what it is not, in the one sentence a near-miss needs", () => {
		const traj = skills.find((skill) => skill.name === "traj")?.description ?? ""
		expect(traj).toMatch(/is no spreadsheet/)
		expect(traj).toMatch(/does not prepare, file or check a tax return/)
	})

	it("let any description that mentions tax say it only estimates, and never prepares, files or checks", () => {
		const guard = /(never prepares, files or checks|does not prepare, file or check) a tax return/
		const taxed = skills.filter((skill) => /\btax\b/i.test(skill.description))
		expect(taxed.map((skill) => skill.name).sort()).toEqual(["traj", "traj-plan"])
		for (const skill of taxed) expect(skill.description).toMatch(guard)
		const plan = skills.find((skill) => skill.name === "traj-plan")?.description ?? ""
		expect(plan).toMatch(/estimate what their Thai income tax comes to/)
		expect(claims(plan)).toMatch(/Thai income tax/)
	})

	it("each name the job of their own recipe", () => {
		const byName = new Map(skills.map((skill) => [skill.name, skill.description.toLowerCase()]))
		expect(byName.get("traj-onboarding")).toContain("install")
		expect(byName.get("traj-import")).toContain("bank")
		expect(byName.get("traj-review")).toContain("weekly or monthly")
		expect(byName.get("traj-plan")).toContain("stop working")
		expect(byName.get("traj")).toContain("track their spending")
	})
})

describe("the measuring helpers", () => {
	it("list every Skill by name and description, and the customer's words", () => {
		const prompt = triggerPrompt(skills, "can I retire")
		for (const skill of skills) expect(prompt).toContain(`- ${skill.name}: ${skill.description}`)
		expect(prompt).toContain('"can I retire"')
	})

	it("read an answer as a listed name, or none", () => {
		expect(pickedSkill(" `traj-plan`.\n", skills)).toBe("traj-plan")
		expect(pickedSkill("I would use traj-plan", skills)).toBe("unparsed")
		expect(pickedSkill("none", skills)).toBe("none")
	})

	it("count a run as matching when firing agrees with the verdict", () => {
		const [fires, silent] = [
			{ q: "a", expect: "trigger" as const, skills: ["traj"] },
			{ q: "b", expect: "silent" as const, skills: [] },
		]
		expect(matchesVerdict(fires, "traj")).toBe(true)
		expect(matchesVerdict(fires, "none")).toBe(false)
		expect(matchesVerdict(silent, "none")).toBe(true)
		expect(matchesVerdict(silent, "traj-plan")).toBe(false)
		expect(matchesVerdict(silent, "unparsed")).toBe(false)
	})
})
