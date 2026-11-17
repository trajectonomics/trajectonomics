import { describe, expect, it } from "bun:test"
import {
	DOCS_CLI_INSTALL_PATH,
	DOCS_CLI_PATH,
	GITHUB_CLI_URL,
	GITHUB_ORG_URL,
	GITHUB_SKILLS_URL,
	INSTALL_COMMAND,
	RELEASE_DATE,
	SITE_NAME,
	SKILLS_LICENCE_URL,
	STAR_REPOS,
} from "./site"

describe("the Site's own constants", () => {
	it("shows the issued unpinned install command, the fixture no edit may change silently", () => {
		expect(INSTALL_COMMAND).toBe("npx skills add trajectonomics/skills --skill traj-onboarding")
	})

	it("never names the unscoped npx traj package, which belongs to someone else", () => {
		expect(INSTALL_COMMAND).not.toContain("npx traj")
	})

	it("names the Site trajectonomics, the document title of every Language home", () => {
		expect(SITE_NAME).toBe("trajectonomics")
	})

	it("points the skills links at the skills repository the Site installs from", () => {
		expect(GITHUB_SKILLS_URL).toBe("https://github.com/trajectonomics/skills")
		expect(SKILLS_LICENCE_URL).toBe("https://github.com/trajectonomics/skills/blob/main/LICENSE")
	})

	it("keeps the footer's organisation link on the organisation", () => {
		expect(GITHUB_ORG_URL).toBe("https://github.com/trajectonomics")
	})

	it("names the repositories the Star menu may list, and their GitHub names", () => {
		expect(STAR_REPOS.map((repo) => repo.name)).toEqual(["cli", "skills"])
		expect(STAR_REPOS.map((repo) => repo.repo)).toEqual(["cli", "skills"])
		expect(STAR_REPOS.map((repo) => repo.url)).toEqual([GITHUB_CLI_URL, GITHUB_SKILLS_URL])
	})

	it("names the CLI's docs page and the release date the footer announces", () => {
		expect(DOCS_CLI_PATH).toBe("/docs/cli/")
		expect(RELEASE_DATE).toBe("2026-11-12")
	})

	it("pinpoints the CLI installation page, the way out under the command", () => {
		expect(DOCS_CLI_INSTALL_PATH).toBe("/docs/cli/installation/")
	})
})
