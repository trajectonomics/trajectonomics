import { describe, expect, it } from "bun:test"
import { FI_METHOD } from "./projection/fi-method"
import { capture } from "./test-support"

describe("the FI method's words", () => {
	it("are the same three sentences in the fi and projection run help", async () => {
		expect(FI_METHOD.split(/(?<=\.) (?=[A-Z])/)).toHaveLength(3)
		for (const argv of [
			["fi", "--help"],
			["projection", "run", "--help"],
		]) {
			const res = await capture(argv)
			expect(res.code).toBe(0)
			expect(res.out).toContain(FI_METHOD)
		}
	})
})
