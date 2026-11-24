import { describe, expect, test } from "bun:test"
import { chanceFixture } from "../chance/fixtures.test-support"
import { chanceInputsOf, chanceSourceWords, chanceTextOf } from "./chance"

describe("the chance inputs", () => {
	test("start empty when the Snapshot states none", () => {
		expect(chanceTextOf({ chance: null } as never)).toEqual({ paths: "", seed: "" })
		expect(
			chanceTextOf({ chance: { source: "plan", paths: 500, seed: "0123456789abcdef" } } as never),
		).toEqual({
			paths: "500",
			seed: "0123456789abcdef",
		})
	})

	test("hold the CLI's limits: 1 to 10,000 paths and sixteen lower-case hex digits", () => {
		expect(chanceInputsOf({ paths: "1000", seed: "0123456789abcdef" })).toEqual({
			ok: true,
			paths: 1000,
			seed: "0123456789abcdef",
		})
		for (const paths of ["", "0", "10001", "1.5", "ten"]) {
			const result = chanceInputsOf({ paths, seed: "0123456789abcdef" })
			expect(result.ok === false && "paths" in result.problems).toBe(true)
		}
		for (const seed of ["", "ABCDEF0123456789", "123", "0123456789abcdeg"]) {
			const result = chanceInputsOf({ paths: "100", seed })
			expect(result.ok === false && "seed" in result.problems).toBe(true)
		}
	})
})

describe("where a chance read's model came from", () => {
	test("the CLI's returnModel echo says the plan built it, and lists what it was built from", () => {
		const read = chanceFixture({
			returnModel: {
				source: "plan",
				buckets: 256,
				accounts: [{ id: "fund", rate: 500, volatility: 1500 }],
			},
		})
		const source = chanceSourceWords(read)
		expect(source.kind).toBe("plan")
		expect(source.heading).toBe("Built from your plan")
		expect(source.accounts).toEqual([{ id: "fund", rate: "5.00%", volatility: "15.00%" }])
	})

	test("without the echo, a file did", () => {
		const source = chanceSourceWords(chanceFixture())
		expect(source.kind).toBe("file")
		expect(source.heading).toBe("Read from a Return model file")
		expect(source.detail).toContain("illustrative-demo-model")
	})
})
