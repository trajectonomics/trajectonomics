import { describe, expect, it } from "bun:test"
import { checkOwnerPlaceholder, checkOwnerWritten } from "./owner-written"
import { entryAt, home, homes } from "./testing/homes"

describe("the strings only the owner may write", () => {
	it("passes a preview build whose homes still show the owner's placeholder", () => {
		expect(checkOwnerWritten(homes(), "preview")).toEqual([])
	})

	it("passes a development build whose homes still show the owner's placeholder", () => {
		expect(checkOwnerWritten(homes(), "development")).toEqual([])
	})

	it("fails a preview build whose home replaced the placeholder with written text", () => {
		const page = home(entryAt(0).language, "<p>Trajectonomics</p>")
		expect(checkOwnerWritten(homes(page), "preview").map((failure) => failure.code)).toEqual([
			"OWNER_WRITTEN_MISSING",
		])
	})

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
		expect(checkOwnerWritten(written, "production")).toEqual([])
	})

	it("does not fail a preview or development build for showing the placeholder", () => {
		expect(checkOwnerPlaceholder(homes(), "preview")).toEqual([])
		expect(checkOwnerPlaceholder(homes(), "development")).toEqual([])
	})
})
