import { describe, expect, test } from "bun:test"
import { NO_PEOPLE, type PersonName } from "../item-names"
import { unplacedOf } from "./unplaced"
import type { YearView } from "./years"

/** A joint Return's year where both Filers have an RMF with no Account, as a joint plan reads it (#682). */
function jointYear(): YearView {
	const unplaced = [
		{ name: "RMF", hint: "Pick the asset Account", filer: "me" },
		{ name: "RMF", hint: "Pick the asset Account", filer: "partner" },
	]
	const lines = unplaced.map((one) => ({ filer: one.filer }))
	return { unplaced, lines } as unknown as YearView
}

describe("unplacedOf", () => {
	test("keys two suggestions of one name apart, so a joint plan's list cannot collide (#682)", () => {
		const keys = unplacedOf(jointYear(), NO_PEOPLE, null).map((one) => one.key)
		expect(new Set(keys).size).toBe(2)
	})

	test("names each Filer when two departed ones share a name, with no recorded holder", () => {
		const people = new Map<string, PersonName>([["someone-else", { label: "You", subject: "you" }]])
		const words = unplacedOf(jointYear(), people, null).map((one) => one.filer?.text)
		expect(words).toEqual(["Another person (me)", "Another person (partner)"])
	})

	test("names no Filer when a name appears once", () => {
		const year = jointYear()
		const single = { ...year, unplaced: year.unplaced.slice(0, 1) } as YearView
		expect(unplacedOf(single, NO_PEOPLE, null)[0]?.filer).toBeNull()
	})
})
