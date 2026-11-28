import { describe, expect, test } from "bun:test"
import { chosenFilters, filterQuery, nextFilterValue } from "./filter-query"
import type { FilterGroup } from "./filters"

const OFFERED: readonly FilterGroup[] = [
	{ name: "type", values: ["compare", "guide", "essay"] },
	{ name: "product", values: ["traj"] },
]

describe("filter query parameters", () => {
	test("reads only known values and drops unknown ones", () => {
		const search = new URLSearchParams("type=compare&language=fr&product=traj&extra=1")
		expect(chosenFilters(search)).toEqual({ type: "compare", product: "traj" })
		expect(chosenFilters(new URLSearchParams("product=general"))).toEqual({ product: "general" })
	})

	test("drops valid values that are not offered in the bar", () => {
		const search = new URLSearchParams("type=news&language=en&product=traj")
		expect(chosenFilters(search, OFFERED)).toEqual({ product: "traj" })
	})

	test("toggles an active value off and clears on All", () => {
		expect(nextFilterValue({ type: "compare" }, "type", "compare")).toBeUndefined()
		expect(nextFilterValue({ type: "compare" }, "type", "essay")).toBe("essay")
		expect(nextFilterValue({ type: "compare" }, "type", undefined)).toBeUndefined()
	})

	test("writes combined queries in bar order and returns empty when cleared", () => {
		expect(filterQuery({}, "product", "traj")).toBe("?product=traj")
		expect(filterQuery({ product: "traj" }, "type", "essay")).toBe("?type=essay&product=traj")
		expect(filterQuery({ type: "essay", product: "traj" }, "type", undefined)).toBe("?product=traj")
		expect(filterQuery({ product: "traj" }, "product", undefined)).toBe("")
	})

	test("preserves unrelated query parameters such as utm_source", () => {
		const search = new URLSearchParams("utm_source=x&type=compare")
		expect(filterQuery({ type: "compare" }, "product", "traj", search)).toBe(
			"?utm_source=x&type=compare&product=traj",
		)
		expect(filterQuery({ type: "compare" }, "type", undefined, search)).toBe("?utm_source=x")
	})
})
