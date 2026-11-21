import { describe, expect, test } from "bun:test"
import { CONTRIBUTE_TAB_PATH, retiredPathTarget, TAX_GUIDE_PATH } from "./retired-paths"

describe("the retired /developers section", () => {
	test("tax-core pages go to the tax guide, with or without a trailing slash", () => {
		for (const path of ["/developers/tax-core", "/developers/tax-core/"]) {
			expect(retiredPathTarget(path)).toBe("/contribute/tax/")
		}
	})

	test("tax-core pages under the tax-core path go to the tax guide too", () => {
		expect(retiredPathTarget("/developers/tax-core/index/")).toBe(TAX_GUIDE_PATH)
		expect(retiredPathTarget("/developers/tax-core/index.md")).toBe(TAX_GUIDE_PATH)
	})

	test("every other page of the section goes to the Contribute Tab", () => {
		for (const path of [
			"/developers",
			"/developers/",
			"/developers/sim-core/",
			"/developers/ledger-core",
			"/developers/design-system/",
			"/developers/sim-core/index.md",
		]) {
			expect(retiredPathTarget(path)).toBe(CONTRIBUTE_TAB_PATH)
		}
	})

	test("a path that only starts with the section's name is not retired", () => {
		expect(retiredPathTarget("/developers-notes/")).toBeNull()
		expect(retiredPathTarget("/developersx/tax-core/")).toBeNull()
	})

	test("the pages that replace the section are not retired", () => {
		expect(retiredPathTarget("/contribute/")).toBeNull()
		expect(retiredPathTarget("/contribute/tax/")).toBeNull()
		expect(retiredPathTarget("/cli/")).toBeNull()
	})
})
