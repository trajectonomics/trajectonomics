import { describe, expect, it } from "bun:test"
import { INSTALL_COMMAND, SITE_NAME } from "./site"

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
})
