import { describe, expect, test } from "bun:test"

import { fanLabels } from "./fan-labels"

describe("fanLabels", () => {
	test("keeps every label when their ends are far apart, in the order they are given", () => {
		const ends = [
			{ text: "50th", y: 40 },
			{ text: "90th", y: 20 },
			{ text: "10th", y: 60 },
		]
		expect(fanLabels(ends)).toEqual(ends)
	})

	test("drops a label at least one kept label is too near, keeping the one with priority", () => {
		const ends = [
			{ text: "50th", y: 40 },
			{ text: "90th", y: 30 },
			{ text: "10th", y: 60 },
		]
		expect(fanLabels(ends)).toEqual([
			{ text: "50th", y: 40 },
			{ text: "10th", y: 60 },
		])
	})

	test("measures the gap in both directions, and honours a stated one", () => {
		const ends = [
			{ text: "50th", y: 100 },
			{ text: "90th", y: 105 },
			{ text: "10th", y: 95 },
		]
		expect(fanLabels(ends, 3)).toEqual(ends)
		expect(fanLabels(ends)).toEqual([{ text: "50th", y: 100 }])
	})
})
