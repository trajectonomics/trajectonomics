import { describe, expect, it } from "bun:test"
import { checkOwnerPlaceholder } from "./owner-written"
import { homes } from "./testing/homes"

describe("the owner's placeholder", () => {
	it("fails a production build that still contains the placeholder in any file", () => {
		const files = [...homes(), { path: "_astro/site.js", content: "// [OWNER TO WRITE]" }]
		expect(checkOwnerPlaceholder(files, "production").map((failure) => failure.code)).toEqual([
			"OWNER_PLACEHOLDER_IN_PRODUCTION",
			"OWNER_PLACEHOLDER_IN_PRODUCTION",
			"OWNER_PLACEHOLDER_IN_PRODUCTION",
		])
	})

	it("passes a production build that carries no placeholder at all", () => {
		const written = homes().map((file) => ({
			path: file.path,
			content: file.content.replaceAll("[OWNER TO WRITE]", "Written by the owner"),
		}))
		expect(checkOwnerPlaceholder(written, "production")).toEqual([])
	})

	it("does not fail a preview or development build for showing the placeholder", () => {
		expect(checkOwnerPlaceholder(homes(), "preview")).toEqual([])
		expect(checkOwnerPlaceholder(homes(), "development")).toEqual([])
	})

	it("names the page of a home and the file path of anything else", () => {
		const files = [...homes(), { path: "_astro/site.js", content: "// [OWNER TO WRITE]" }]
		const failures = checkOwnerPlaceholder(files, "production")
		expect(failures.map((failure) => failure.path)).toContain("_astro/site.js")
		expect(failures.map((failure) => failure.path)).toContain("/th/")
	})
})
