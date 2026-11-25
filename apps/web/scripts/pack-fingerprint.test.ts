import { describe, expect, test } from "bun:test"
import { fingerprint } from "./pack-fingerprint"
import { encodePack } from "./pack-format"

const text = (value: string): Uint8Array => new TextEncoder().encode(value)

/** A Pack of two files built at a time: the stamp is in version.json and in the page that names it. */
function pack(stamp: string, script = "a()"): string {
	return encodePack([
		["/_app/version.json", text(JSON.stringify({ version: stamp }))],
		["/index.html", text(`__sveltekit_${stamp.slice(-4)} = { version: "${stamp}" }`)],
		["/app.js", text(script)],
	])
}

describe("the Pack fingerprint", () => {
	test("is the same for two builds of one source, whatever time each ran", () => {
		expect(fingerprint(pack("1795579770949"))).toBe(fingerprint(pack("1795580585415")))
	})

	test("changes when a file changes", () => {
		expect(fingerprint(pack("1795579770949"))).not.toBe(fingerprint(pack("1795579770949", "b()")))
	})

	test("is null for text that is not a Pack", () => {
		expect(fingerprint("not a pack")).toBeNull()
	})
})
