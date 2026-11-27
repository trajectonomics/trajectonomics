import { describe, expect, test } from "bun:test"
import { CONTRIBUTE_TAB_PATH, retiredPathTarget, TAX_GUIDE_PATH } from "./retired-paths"

describe("the retired /developers section", () => {
	test("tax-core pages go to the tax guide, with or without a trailing slash", () => {
		for (const path of ["/docs/developers/tax-core", "/docs/developers/tax-core/"]) {
			expect(retiredPathTarget(path)).toBe("/docs/contribute/tax/")
		}
	})

	test("tax-core pages under the tax-core path go to the tax guide too", () => {
		expect(retiredPathTarget("/docs/developers/tax-core/index/")).toBe(TAX_GUIDE_PATH)
		expect(retiredPathTarget("/docs/developers/tax-core/index.md")).toBe(TAX_GUIDE_PATH)
	})

	test("every other page of the section goes to the Contribute Tab", () => {
		for (const path of [
			"/docs/developers",
			"/docs/developers/",
			"/docs/developers/sim-core/",
			"/docs/developers/ledger-core",
			"/docs/developers/design-system/",
			"/docs/developers/sim-core/index.md",
		]) {
			expect(retiredPathTarget(path)).toBe(CONTRIBUTE_TAB_PATH)
		}
	})

	test("a path that only starts with the section's name is not retired", () => {
		expect(retiredPathTarget("/docs/developers-notes/")).toBeNull()
		expect(retiredPathTarget("/docs/developersx/tax-core/")).toBeNull()
	})

	test("the pages that replace the section are not retired", () => {
		expect(retiredPathTarget("/docs/contribute/")).toBeNull()
		expect(retiredPathTarget("/docs/contribute/tax/")).toBeNull()
		expect(retiredPathTarget("/docs/cli/")).toBeNull()
	})

	test("the section is only retired under the Portal's /docs base", () => {
		expect(retiredPathTarget("/developers/tax-core")).toBeNull()
		expect(retiredPathTarget("/developers/")).toBeNull()
	})
})
