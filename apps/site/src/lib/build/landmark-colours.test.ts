import { describe, expect, it } from "bun:test"
import { checkLandmarkColours } from "./landmark-colours"
import { TEST_TOKENS, testFiles } from "./test-page"

/** The classes each part of a built page paints; a landmark with none inherits the body's. */
interface Painted {
	readonly body?: string
	readonly header?: string
	readonly main?: string
	readonly footer?: string
}

/** A built page whose three landmarks paint the surface roles the test names. */
function page(painted: Painted = {}): string {
	const body = painted.body ?? "bg-background text-foreground"
	const main = painted.main ?? "bg-muted text-foreground"
	const footer = painted.footer ?? "bg-stage text-stage-foreground"
	const head = '<head><script>a</script><link rel="stylesheet" href="/_astro/site.css"></head>'
	return `<html lang="en" data-theme="light">${head}<body class="${body}"><header class="${painted.header ?? ""}"></header><main class="${main}"><h1>a</h1></main><footer class="${footer}"></footer></body></html>`
}

/** The failures one built page raises against the fixture Themes. */
function failures(painted: Painted = {}) {
	return checkLandmarkColours(testFiles({ index: page(painted) }), TEST_TOKENS)
}

/** The codes one built page raises against the fixture Themes. */
function codes(painted: Painted = {}): readonly string[] {
	return failures(painted).map((failure) => failure.code)
}

describe("the surface a landmark paints", () => {
	it("passes the header on the Theme's background, main on muted and the footer on the stage", () => {
		expect(codes()).toEqual([])
	})

	it("passes a landmark that inherits the Theme's own background and text", () => {
		expect(codes({ main: "", footer: "" })).toEqual([])
	})

	it("fails a landmark that paints the card role, which is no surface a landmark may paint", () => {
		const raised = failures({ header: "bg-card text-foreground" })
		expect(raised.map((failure) => failure.code)).toContain("LANDMARK_COLOUR_NOT_WIRED")
		// The role is published in both Themes, and neither one may paint a landmark with it.
		expect(raised.some((failure) => failure.message.includes("light"))).toBe(true)
		expect(raised.some((failure) => failure.message.includes("dark"))).toBe(true)
	})

	it("fails a landmark whose text role is not the one its surface carries", () => {
		expect(codes({ footer: "bg-background text-stage-foreground" })).toContain(
			"LANDMARK_TEXT_ROLE_MISMATCH",
		)
	})

	it("fails a page with no base roles, naming the landmark and the Theme it should paint", () => {
		const raised = failures({ body: "", main: "", footer: "" })
		expect(raised.map((failure) => failure.code)).toContain("LANDMARK_COLOUR_NOT_WIRED")
		expect(raised[0]?.message).toContain("<header>")
		expect(raised[0]?.message).toContain("light")
	})

	it("names every surface a landmark may paint, so a failure says what to paint instead", () => {
		const raised = failures({ main: "bg-card text-foreground" })
		expect(raised[0]?.message).toContain("background, muted, stage")
	})
})
