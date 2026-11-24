import { describe, expect, test } from "bun:test"
import { chanceHref, futureHref } from "./links"

describe("the links of the futures", () => {
	test("a future's link names the plan and the index and keeps the rest of the query", () => {
		expect(futureHref("?demo=1&terms=real", "base", 7)).toBe(
			"/chance/path/?demo=1&terms=real&scenario=base&index=7",
		)
		expect(futureHref("?scenario=old&index=1", "new plan", 3)).toBe(
			"/chance/path/?scenario=new+plan&index=3",
		)
	})

	test("the way back names the plan, drops the index and keeps the rest", () => {
		expect(chanceHref("?demo=1&index=7&scenario=base", "base")).toBe(
			"/chance/?demo=1&scenario=base",
		)
	})
})
