import { describe, expect, test } from "bun:test"
import { decorativeMark } from "./mark"

const mark = await Bun.file(
	Bun.resolveSync("@trajectonomics/brand/current/logo/mark.svg", import.meta.dir),
).text()

describe("the decorative brand mark", () => {
	const artwork = decorativeMark(mark)

	test("is hidden from assistive technology, because its link names itself", () => {
		expect(artwork).toContain('aria-hidden="true"')
		expect(artwork).not.toContain('role="img"')
		expect(artwork).not.toContain("<title>")
	})

	test("keeps the viewBox that draws it", () => {
		expect(artwork).toContain("viewBox=")
	})
})
