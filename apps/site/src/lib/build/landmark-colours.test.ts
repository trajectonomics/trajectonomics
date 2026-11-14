import { describe, expect, it } from "bun:test"
import { checkLandmarkColours } from "./landmark-colours"
import { TEST_TOKENS, testFiles } from "./test-page"

function codes(index?: string): readonly string[] {
	return checkLandmarkColours(testFiles(index === undefined ? {} : { index }), TEST_TOKENS).map(
		(failure) => failure.code,
	)
}

function page(bodyClass: string, landmarkClass = ""): string {
	return `<html lang="en" data-theme="light"><head><script>a</script><link rel="stylesheet" href="/_astro/site.css"></head><body class="${bodyClass}"><header class="${landmarkClass}"></header><main class="${landmarkClass}"><h1>a</h1></main><footer class="${landmarkClass}"></footer></body></html>`
}

describe("the colours the landmarks paint", () => {
	it("passes a page whose landmarks inherit the Theme's own background and text", () => {
		expect(codes()).toEqual([])
	})

	it("fails a landmark that paints the card role, which is a different colour in dark", () => {
		const page = `<html data-theme="light"><head><script>a</script><link rel="stylesheet" href="/_astro/site.css"></head><body class="bg-background text-foreground"><header class="bg-card"></header><main><h1>a</h1></main><footer></footer></body></html>`
		const failures = checkLandmarkColours(testFiles({ index: page }), TEST_TOKENS)
		expect(failures.map((failure) => failure.code)).toContain("LANDMARK_COLOUR_NOT_WIRED")
		expect(failures.every((failure) => failure.message.includes("dark"))).toBe(true)
	})

	it("fails a landmark whose text colour is not the Theme's foreground", () => {
		expect(codes(page("bg-background text-foreground", "text-muted-foreground"))).toContain(
			"LANDMARK_COLOUR_NOT_WIRED",
		)
	})

	it("fails a page with no base roles, naming the landmark and the Theme it should paint", () => {
		const failures = checkLandmarkColours(testFiles({ index: page("") }), TEST_TOKENS)
		expect(failures.map((failure) => failure.code)).toContain("LANDMARK_COLOUR_NOT_WIRED")
		expect(failures[0]?.message).toContain("<header>")
		expect(failures[0]?.message).toContain("light")
	})
})
