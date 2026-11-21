import { describe, expect, it } from "bun:test"
import { STAR_REPOS } from "../site"
import { STAR_SNAPSHOT, STARRED_REPOS } from "./star-snapshot"
import { formatStarCount, starredRepos, topStarLabel } from "./stars"

const REPOS = [
	{ repo: "cli", name: "traj CLI", url: "https://example.test/cli" },
	{ repo: "skills", name: "traj-onboarding", url: "https://example.test/skills" },
] as const

describe("the star count the trigger shows", () => {
	it("counts under a thousand as they are", () => {
		expect([1, 42, 999].map(formatStarCount)).toEqual(["1", "42", "999"])
	})

	it("counts thousands with one decimal, a whole thousand with none", () => {
		expect([1000, 2100, 60_400].map(formatStarCount)).toEqual(["1K", "2.1K", "60.4K"])
	})
})

describe("the repositories a star count lists", () => {
	it("orders them highest stars first", () => {
		const snapshot = { asOf: "2026-11-20", stars: { cli: 2, skills: 40 } }
		expect(starredRepos(snapshot, REPOS).map((repo) => repo.repo)).toEqual(["skills", "cli"])
	})

	it("leaves out a repository at zero, so the menu never offers an unstarred row", () => {
		const snapshot = { asOf: "2026-11-20", stars: { cli: 3, skills: 0 } }
		expect(starredRepos(snapshot, REPOS).map((repo) => repo.repo)).toEqual(["cli"])
	})

	it("leaves out a repository the snapshot does not count", () => {
		const snapshot = { asOf: "2026-11-20", stars: { skills: 3 } }
		expect(starredRepos(snapshot, REPOS).map((repo) => repo.repo)).toEqual(["skills"])
	})

	it("shows no number when every repository is at zero", () => {
		const snapshot = { asOf: "2026-11-20", stars: { cli: 0, skills: 0 } }
		expect(topStarLabel(starredRepos(snapshot, REPOS))).toBeUndefined()
	})

	it("shows the highest count, formatted", () => {
		const snapshot = { asOf: "2026-11-20", stars: { cli: 1, skills: 60_400 } }
		expect(topStarLabel(starredRepos(snapshot, REPOS))).toBe("60.4K")
	})
})

describe("the committed star snapshot", () => {
	it("counts the one repository the header links", () => {
		for (const repo of STAR_REPOS) expect(STAR_SNAPSHOT.stars[repo.repo]).toBeNumber()
	})

	it("records the date it was read, so a stale snapshot says so", () => {
		expect(STAR_SNAPSHOT.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})

	it("lists the repositories highest stars first", () => {
		expect(STARRED_REPOS.map((repo) => repo.stars)).toEqual(
			[...STARRED_REPOS.map((repo) => repo.stars)].sort((left, right) => right - left),
		)
	})
})
