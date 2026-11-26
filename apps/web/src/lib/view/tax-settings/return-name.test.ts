import { describe, expect, test } from "bun:test"
import type { HouseholdDocument } from "../../contract"
import { personNames } from "../item-names"
import { returnLabel } from "./return-name"

/** A household whose two people both have new ids, so "me" and "partner" are ids it no longer names. */
const RENAMED: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "ann", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "bob", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [],
}

describe("the words a Return takes", () => {
	test("two departed Returns with no recorded holder take their ids, so they read apart", () => {
		const people = personNames(RENAMED)
		const filers = ["me", "partner"]
		expect(returnLabel("me", people, null, filers).text).toBe("Another person (me)")
		expect(returnLabel("partner", people, null, filers).text).toBe("Another person (partner)")
	})

	test("one departed Return beside the earlier holder stays plain", () => {
		const people = personNames(RENAMED)
		const filers = ["me", "partner"]
		expect(returnLabel("me", people, "me", filers).text).toBe("The earlier holder")
		expect(returnLabel("partner", people, "me", filers).text).toBe("Another person")
	})
})
