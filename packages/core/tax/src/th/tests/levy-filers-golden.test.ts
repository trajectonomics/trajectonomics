import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { emitThLevy } from "../levy/emit"
import { GOLDEN_PROFILES } from "./levy-golden-profiles"

/**
 * SHA-256 of `JSON.stringify(emitThLevy(profile))` and the Measure count, both captured from the
 * emitter as it stood before Filers existed (tax ADR 0009), so a Levy that names no Filer is
 * pinned byte for byte, ids, order and operands included.
 */
const PINNED: Readonly<Record<string, { measures: number; sha256: string }>> = {
	omitted: {
		measures: 244,
		sha256: "d4d60b43c9763b25762917f3ccbd490da5378f4a2c6a7ce071d5167931a381d2",
	},
	empty: {
		measures: 244,
		sha256: "d4d60b43c9763b25762917f3ccbd490da5378f4a2c6a7ce071d5167931a381d2",
	},
	single: {
		measures: 244,
		sha256: "46ba353c15c2212d715b368de8c1f476ff4f9a8247ca48648f98689b788512ce",
	},
	joint: {
		measures: 245,
		sha256: "0affbb43abac15aca66efbbf78c4854664308fdf215a011ddea645693f18b068",
	},
	separate: {
		measures: 244,
		sha256: "2dfa332b7e599714bac569e652251486da529d9b05e9d3bd56d735ca0184d25f",
	},
}

describe("a Levy without filers is byte-identical to the one emitted before Filers", () => {
	for (const [name, pinned] of Object.entries(PINNED)) {
		it(`pins the ${name} profile`, () => {
			const levy = emitThLevy(GOLDEN_PROFILES[name])
			expect(levy.measures.length).toBe(pinned.measures)
			expect(createHash("sha256").update(JSON.stringify(levy)).digest("hex")).toBe(pinned.sha256)
		})
	}

	it("pins every golden profile", () => {
		expect(Object.keys(PINNED).sort()).toEqual(Object.keys(GOLDEN_PROFILES).sort())
	})

	it("reads the same Levy whether filers is omitted or undefined", () => {
		expect(emitThLevy({ filers: undefined })).toEqual(emitThLevy({}))
	})
})
