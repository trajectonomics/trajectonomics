import { describe, expect, it } from "bun:test"
import {
	GITHUB_ORG_URL,
	GITHUB_SKILLS_URL,
	INSTALL_COMMAND,
	SITE_NAME,
	SKILLS_LICENCE_URL,
} from "./site"

describe("the Site's own constants", () => {
	it("shows the issued unpinned install command, the fixture no edit may change silently", () => {
		expect(INSTALL_COMMAND).toBe("npx skills add trajectonomics/internal-skills --skill traj")
	})

	it("never names the unscoped npx traj package, which belongs to someone else", () => {
		expect(INSTALL_COMMAND).not.toContain("npx traj")
	})

	it("names the Site trajectonomics, the document title of every Language home", () => {
		expect(SITE_NAME).toBe("trajectonomics")
	})

	it("points every GitHub repository link at the skills repository the Site installs from", () => {
		expect(GITHUB_SKILLS_URL).toBe("https://github.com/trajectonomics/skills")
		expect(SKILLS_LICENCE_URL).toBe("https://github.com/trajectonomics/skills/blob/main/LICENSE")
	})

	it("keeps the footer's organisation link on the organisation", () => {
		expect(GITHUB_ORG_URL).toBe("https://github.com/trajectonomics")
	})
})
