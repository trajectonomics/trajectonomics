import { describe, expect, test } from "bun:test"
import { changesOf, startWhatIf } from "./session"
import { withoutChange } from "./session-without"
import { withTriedEstate } from "./try-estate"

describe("trying the estate block", () => {
	const block = {
		costs: [{ id: "settlement", of: "gross", bps: "1.00", rounding: "halfUp" as const }],
	}

	test("the block is one Set of the whole estate, and a later try replaces an earlier one", () => {
		const first = withTriedEstate(startWhatIf("base", "h"), block)
		expect(first.sets).toEqual([{ path: "estate", value: block }])
		const second = withTriedEstate(first, { costs: [] })
		expect(second.sets).toEqual([{ path: "estate", value: { costs: [] } }])
		expect(second.removals).toEqual([])
		expect(second.additions).toEqual([])
	})

	test("no line left is tried as an empty block", () => {
		expect(withTriedEstate(startWhatIf("base", "h"), null).sets).toEqual([
			{ path: "estate", value: {} },
		])
	})

	test("the session bar words it without a share or an amount, and removing it takes the try back", () => {
		const session = withTriedEstate(startWhatIf("base", "h"), block)
		const [change] = changesOf(session)
		expect(change).toEqual({
			kind: "estate",
			path: "estate",
			label: "Estate lines tried as edited",
		})
		if (change === undefined) throw new Error("a change")
		expect(withoutChange(session, change).sets).toEqual([])
	})
})
