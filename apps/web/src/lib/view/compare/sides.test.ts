import { describe, expect, test } from "bun:test"
import { SIDE_A, SIDE_B } from "./fixtures.test-support"
import { shortHash } from "./hash"
import { compareOf, DEFAULT_DELTAS } from "./projection.test-support"
import { compareSides } from "./sides"

describe("content hash", () => {
	test("a content hash is shortened to twelve characters of its digest, without the prefix", () => {
		expect(shortHash("jcs1:sha256:eba036341234ffff0000")).toBe("eba036341234")
		expect(shortHash("jcs1:sha256:eba036341234ffff0000")).toHaveLength(12)
	})
})

describe("compare sides", () => {
	test("A is solid and B dashed, each with its Scenario name and shortened hash", () => {
		const [a, b] = compareSides(compareOf(SIDE_A, SIDE_B, DEFAULT_DELTAS))
		expect(a).toEqual({ letter: "A", name: "base", hash: "eba036341234", dashed: false })
		expect(b).toEqual({ letter: "B", name: "retire-early", hash: "96b45010aaaa", dashed: true })
	})
})
