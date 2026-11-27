import { describe, expect, test } from "bun:test"
import { drawerEditsShown, editsShown } from "./shown"

describe("editsShown", () => {
	test("shows the controls when the server answered a token, outside the Demo snapshot", () => {
		expect(editsShown("token", "")).toBe(true)
		expect(editsShown("token", "?scenario=base")).toBe(true)
	})

	test("hides them when no token came, as under vite preview, or in the Demo snapshot", () => {
		expect(editsShown(null, "")).toBe(false)
		expect(editsShown("token", "?demo=1")).toBe(false)
	})

	test("a drawer opened on an item can save on loopback, where the page has a server to save to", () => {
		expect(drawerEditsShown()).toBe(true)
	})
})
