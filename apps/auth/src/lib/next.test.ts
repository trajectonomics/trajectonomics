import { describe, expect, it } from "bun:test"
import { safeNextPath } from "./next"

describe("a next path", () => {
	it("keeps a same-origin path with its query and hash", () => {
		expect(safeNextPath("/account/")).toBe("/account/")
		expect(safeNextPath("/device/?user_code=ABCD2345")).toBe("/device/?user_code=ABCD2345")
		expect(safeNextPath("/account/#passkeys")).toBe("/account/#passkeys")
	})

	it("rejects an absolute address", () => {
		expect(safeNextPath("https://evil.example/account/")).toBeUndefined()
		expect(safeNextPath("//evil.example/account/")).toBeUndefined()
		expect(safeNextPath("javascript:alert(1)")).toBeUndefined()
	})

	it("rejects a path that normalizes to another host", () => {
		expect(safeNextPath("/..//evil.example/account/")).toBeUndefined()
		expect(safeNextPath("/%2F%2Fevil.example/")).toBe("/%2F%2Fevil.example/")
	})

	it("rejects a backslash, which some parsers read as a slash", () => {
		expect(safeNextPath("/\\evil.example/account/")).toBeUndefined()
		expect(safeNextPath("/account\\evil")).toBeUndefined()
	})

	it("rejects a control character", () => {
		expect(safeNextPath("/account/\nSet-Cookie: x")).toBeUndefined()
	})

	it("has nothing to keep when there is no value", () => {
		expect(safeNextPath(null)).toBeUndefined()
		expect(safeNextPath(undefined)).toBeUndefined()
		expect(safeNextPath("")).toBeUndefined()
		expect(safeNextPath("   ")).toBeUndefined()
		expect(safeNextPath("account/")).toBeUndefined()
	})
})
