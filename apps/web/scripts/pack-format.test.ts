import { describe, expect, test } from "bun:test"
import { decodePack, encodePack } from "./pack-format"

const bytes = (text: string) => new TextEncoder().encode(text)

describe("the Pack", () => {
	test("round-trips every file's bytes by its path", () => {
		const text = encodePack([
			["/index.html", bytes("<html></html>")],
			["/_app/a.js", new Uint8Array([0, 255, 10])],
		])
		const pack = decodePack(text)
		expect([...(pack?.keys() ?? [])].sort()).toEqual(["/_app/a.js", "/index.html"])
		expect(pack?.get("/_app/a.js")).toEqual(new Uint8Array([0, 255, 10]))
	})

	test("packs the same files to the same text whatever their order", () => {
		const a = encodePack([
			["/b", bytes("b")],
			["/a", bytes("a")],
		])
		const b = encodePack([
			["/a", bytes("a")],
			["/b", bytes("b")],
		])
		expect(a).toBe(b)
	})

	test("reads anything else as no Pack", () => {
		expect(decodePack("not json")).toBeNull()
		expect(decodePack("[]")).toBeNull()
		expect(decodePack(JSON.stringify({ packVersion: 2, files: {} }))).toBeNull()
		expect(decodePack(JSON.stringify({ packVersion: 1, files: { "/a": 1 } }))).toBeNull()
	})
})
