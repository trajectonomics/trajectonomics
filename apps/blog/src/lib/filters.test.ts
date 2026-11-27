import { describe, expect, test } from "bun:test"
import {
	chosenFilters,
	FILTER_GROUPS,
	type Filterable,
	filterGroups,
	filterQuery,
	filterValues,
	matchesFilters,
} from "./filters"

const POSTS: readonly Filterable[] = [
	{ type: "compare", languages: ["th"], products: [] },
	{ type: "essay", languages: ["en", "th"], products: ["traj"] },
	{ type: "guide", languages: ["en", "th"], products: ["openjot"] },
]

describe("filter groups", () => {
	test("lists groups in bar order", () => {
		expect(FILTER_GROUPS).toEqual(["type", "language", "product"])
	})

	test("keeps only values present on at least one Post, in canonical order", () => {
		expect(filterGroups(POSTS)).toEqual([
			{ name: "type", values: ["compare", "guide", "essay"] },
			{ name: "language", values: ["en", "th"] },
			{ name: "product", values: ["traj", "openjot"] },
		])
	})

	test("omits a group that narrows nothing", () => {
		const same: readonly Filterable[] = [
			{ type: "guide", languages: ["th"], products: [] },
			{ type: "guide", languages: ["th"], products: [] },
		]
		expect(filterGroups(same)).toEqual([])
	})

	test("keeps a single-value Product group when some Posts have no Product", () => {
		const mixed: readonly Filterable[] = [
			{ type: "essay", languages: ["en"], products: ["traj"] },
			{ type: "essay", languages: ["en"], products: [] },
		]
		expect(filterGroups(mixed)).toEqual([{ name: "product", values: ["traj"] }])
	})
})

describe("matching filters", () => {
	const values = filterValues({ type: "essay", languages: ["en", "th"], products: ["traj"] })

	test("matches every Post when nothing is chosen", () => {
		expect(matchesFilters(values, {})).toBe(true)
	})

	test("requires every chosen group to match", () => {
		expect(matchesFilters(values, { type: "essay", language: "en", product: "traj" })).toBe(true)
		expect(matchesFilters(values, { type: "compare" })).toBe(false)
		expect(matchesFilters(values, { type: "essay", product: "openjot" })).toBe(false)
	})
})

describe("filter query parameters", () => {
	test("reads only known values and drops unknown ones", () => {
		const search = new URLSearchParams("type=compare&language=fr&product=traj&extra=1")
		expect(chosenFilters(search)).toEqual({ type: "compare", product: "traj" })
	})

	test("writes combined queries in bar order and returns empty when cleared", () => {
		expect(filterQuery({}, "product", "traj")).toBe("?product=traj")
		expect(filterQuery({ product: "traj" }, "type", "essay")).toBe("?type=essay&product=traj")
		expect(filterQuery({ type: "essay", product: "traj" }, "type", undefined)).toBe("?product=traj")
		expect(filterQuery({ product: "traj" }, "product", undefined)).toBe("")
	})
})
