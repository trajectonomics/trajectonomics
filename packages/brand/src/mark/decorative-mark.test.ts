import { describe, expect, test } from "bun:test"
import { decorativeMark } from "./decorative-mark"

/** The mark as the brand ships it: a role, an accessible name, a title, and the path that draws it. */
const MARK = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Trajectonomics">',
	"  <title>Trajectonomics</title>",
	'  <path fill="currentColor" d="M209.6 376.8 L521.7 376.8 Z"/>',
	"</svg>",
].join("\n")

describe("the decorative brand mark", () => {
	const artwork = decorativeMark(MARK)

	test("is hidden from assistive technology, because its link names itself", () => {
		expect(artwork).toContain('aria-hidden="true"')
		expect(artwork).toContain('focusable="false"')
		expect(artwork).not.toContain('role="img"')
		expect(artwork).not.toContain("aria-label=")
	})

	test("removes the artwork's own title", () => {
		expect(artwork).not.toContain("<title>")
		expect(artwork).not.toContain("Trajectonomics")
	})

	test("keeps the viewBox and the paths that draw it", () => {
		expect(artwork).toContain('viewBox="0 0 1024 1024"')
		expect(artwork).toContain('d="M209.6 376.8 L521.7 376.8 Z"')
	})

	test("removes every named attribute, not only the first", () => {
		const twice = decorativeMark(
			'<svg aria-label="one" role="img" xmlns="http://www.w3.org/2000/svg"><path aria-label="two"/></svg>',
		)
		expect(twice).not.toContain("aria-label=")
		expect(twice).not.toContain('role="img"')
	})
})
