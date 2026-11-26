import { describe, expect, test } from "bun:test"
import { SIDE_A, SIDE_B } from "./fixtures.test-support"
import { compareOf, DEFAULT_DELTAS } from "./projection.test-support"
import { compareSides } from "./sides"

describe("compare sides", () => {
	test("A is solid and B dashed, each with its Scenario name", () => {
		const [a, b] = compareSides(compareOf(SIDE_A, SIDE_B, DEFAULT_DELTAS))
		expect(a).toEqual({ letter: "A", name: "base", dashed: false })
		expect(b).toEqual({ letter: "B", name: "retire-early", dashed: true })
	})
})
