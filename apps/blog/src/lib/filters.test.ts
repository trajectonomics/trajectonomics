import { describe, expect, test } from "bun:test"
import {
	FILTER_GROUPS,
	type Filterable,
	filterGroups,
	filterValues,
	GENERAL_PRODUCT_FILTER,
	isFilterGroup,
	matchesFilters,
} from "./filters"

const POSTS: readonly Filterable[] = [
	{ type: "compare", languages: ["th"], products: [] },
	{ type: "essay", languages: ["en", "th"], products: ["traj"] },
	{ type: "guide", languages: ["en", "th"], products: ["openjot"] },
]

describe("filter groups", () => {
	test("lists groups in bar order and validates group names", () => {
		expect(FILTER_GROUPS).toEqual(["type", "language", "product"])
		expect(isFilterGroup("type")).toBe(true)
		expect(isFilterGroup("unknown")).toBe(false)
		expect(isFilterGroup(null)).toBe(false)
	})

	test("keeps only values present on at least one Post, in canonical order", () => {
		expect(filterGroups(POSTS)).toEqual([
			{ name: "type", values: ["compare", "guide", "essay"] },
			{ name: "language", values: ["en", "th"] },
			{ name: "product", values: ["traj", "openjot", GENERAL_PRODUCT_FILTER] },
		])
	})

	test("omits a group that narrows nothing", () => {
		const same: readonly Filterable[] = [
			{ type: "guide", languages: ["th"], products: [] },
			{ type: "guide", languages: ["th"], products: [] },
		]
		expect(filterGroups(same)).toEqual([])
	})

	test("includes the general Product option when some Posts have no Product", () => {
		const mixed: readonly Filterable[] = [
			{ type: "essay", languages: ["en"], products: ["traj"] },
			{ type: "essay", languages: ["en"], products: [] },
		]
		expect(filterGroups(mixed)).toEqual([
			{ name: "product", values: ["traj", GENERAL_PRODUCT_FILTER] },
		])
	})
})

describe("matching filters", () => {
	const values = filterValues({ type: "essay", languages: ["en", "th"], products: ["traj"] })
	const general = filterValues({ type: "compare", languages: ["th"], products: [] })

	test("matches every Post when nothing is chosen", () => {
		expect(matchesFilters(values, {})).toBe(true)
		expect(matchesFilters(general, {})).toBe(true)
	})

	test("requires every chosen group to match", () => {
		expect(matchesFilters(values, { type: "essay", language: "en", product: "traj" })).toBe(true)
		expect(matchesFilters(values, { type: "compare" })).toBe(false)
		expect(matchesFilters(values, { type: "essay", product: "openjot" })).toBe(false)
		expect(matchesFilters(values, { product: GENERAL_PRODUCT_FILTER })).toBe(false)
	})

	test("matches general Posts under the non-product filter", () => {
		expect(matchesFilters(general, { product: GENERAL_PRODUCT_FILTER })).toBe(true)
		expect(matchesFilters(general, { product: "traj" })).toBe(false)
	})
})
