import { describe, expect, it } from "bun:test"
import { buildMode, DEFAULT_BUILD_MODE } from "./mode"

describe("the build mode a scan judges", () => {
	it("is production when nothing names another mode, so the placeholder cannot hide", () => {
		expect(buildMode(undefined)).toBe("production")
		expect(DEFAULT_BUILD_MODE).toBe("production")
	})

	it("reads the three modes by name", () => {
		expect(["production", "preview", "development"].map(buildMode)).toEqual([
			"production",
			"preview",
			"development",
		])
	})

	it("is production for a name it does not know, so a typo cannot weaken the scan", () => {
		expect(buildMode("Preview")).toBe("production")
		expect(buildMode("")).toBe("production")
	})
})
