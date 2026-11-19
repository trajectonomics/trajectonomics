import { describe, expect, it } from "bun:test"
import * as site from "./site"
import {
	DOCS_CLI_INSTALL_PATH,
	DOCS_CLI_PATH,
	FI_DEMO_COMMAND,
	FI_DEMO_DATE,
	FI_DEMO_OUTPUT,
	GITHUB_CLI_URL,
	GITHUB_ORG_URL,
	GITHUB_SKILLS_URL,
	INSTALL_PROMPT,
	ONBOARDING_SKILL_URL,
	SITE_NAME,
	SKILLS_LICENCE_URL,
	STAR_REPOS,
} from "./site"

describe("the Site's own constants", () => {
	it("shows the prompt the owner approved, the fixture no edit may change silently", () => {
		expect(INSTALL_PROMPT).toBe(
			"Set up traj: read https://raw.githubusercontent.com/trajectonomics/skills/main/skills/traj-onboarding/SKILL.md and follow it.",
		)
	})

	it("names the skills repository's raw path to the Onboarding skill on its default branch", () => {
		expect(ONBOARDING_SKILL_URL).toBe(
			"https://raw.githubusercontent.com/trajectonomics/skills/main/skills/traj-onboarding/SKILL.md",
		)
		expect(INSTALL_PROMPT).toContain(ONBOARDING_SKILL_URL)
	})

	it("prints no command, so the window asks for no terminal the Site cannot prove", () => {
		expect(INSTALL_PROMPT.startsWith("Set up traj: read ")).toBe(true)
		expect(INSTALL_PROMPT.endsWith(" and follow it.")).toBe(true)
		expect(INSTALL_PROMPT).not.toContain("npx")
	})

	it("retires the install command constant, because the window prints no command", () => {
		expect(Object.hasOwn(site, "INSTALL_COMMAND")).toBe(false)
	})

	it("names the Site trajectonomics, the brand lockup's accessible name", () => {
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

	it("names the CLI's docs page, and leaves the release facts to the Release snapshot", () => {
		expect(DOCS_CLI_PATH).toBe("/docs/cli/")
		expect(Object.hasOwn(site, "CLI_VERSION")).toBe(false)
		expect(Object.hasOwn(site, "RELEASE_DATE")).toBe(false)
	})

	it("pinpoints the CLI installation page, the way out under the prompt", () => {
		expect(DOCS_CLI_INSTALL_PATH).toBe("/docs/cli/installation/")
	})

	it("shows the CLI's own `traj fi` example, with the JSON flag an agent reads", () => {
		expect(FI_DEMO_COMMAND.startsWith("traj fi --scenario base ")).toBe(true)
		expect(FI_DEMO_COMMAND).toContain("--as-of")
		expect(FI_DEMO_COMMAND).toContain("--horizon")
		expect(FI_DEMO_COMMAND.endsWith("--json")).toBe(true)
	})

	it("prints the demo's output as the CLI's JSON, with one date the panel repeats", () => {
		const parsed = JSON.parse(FI_DEMO_OUTPUT.join("\n"))
		expect(parsed.fi).toEqual({ reachable: true, fiDate: FI_DEMO_DATE })
		expect(parsed.tax).toBe("not_applied")
		expect(FI_DEMO_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})
})
